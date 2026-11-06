import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { spawn, execFileSync } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { Pool } from "pg";
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { jwtVerify } from "jose";
import { PrismaClient } from "../src/generated/prisma/client.ts";
import { PrismaPg } from "@prisma/adapter-pg";

// Always create an isolated database. Never migrate or clear the supplied base DB.
const baseUrl = process.env.TEST_DATABASE_BASE_URL ?? "postgresql://postgres:postgres@localhost:55432/postgres";
const database = `jwt_console_test_${randomUUID().replaceAll("-", "")}`;
assert.match(database, /^jwt_console_test_[a-f0-9]{32}$/);
const url = new URL(baseUrl); url.pathname = `/${database}`;
const connectionString = url.toString();
const adminPool = new Pool({ connectionString: baseUrl });
let prisma;
let server;
let serverLogs = "";
const port = process.env.TEST_PORT ?? "3101";
const origin = `http://localhost:${port}`;
const development = process.env.TEST_DEV === "1";
const publicOrigin = development ? origin : `https://localhost:${port}`;
const signingSecret = randomBytes(48).toString("base64url");
const password = process.env.TEST_ADMIN_PASSWORD ?? randomBytes(24).toString("base64url");
const env = { ...process.env, DATABASE_URL: connectionString, BETTER_AUTH_URL: publicOrigin, BETTER_AUTH_SECRET: randomBytes(48).toString("base64url"), DEVICE_JWT_SECRET: signingSecret, DEVICE_JWT_TTL_SECONDS: "3600", NODE_ENV: "development", PORT: port, NITRO_PORT: port, HOST: "127.0.0.1" };
let checks = 0;
function passed(label) { checks++; console.info(`PASS ${label}`); }
function rpc(cookie = "") {
  return createORPCClient(new RPCLink({ url: `${origin}/api/rpc`, headers: { origin: publicOrigin, ...(cookie ? { cookie } : {}) } }));
}
async function authPost(path, body) {
  return fetch(`${origin}/api/auth/${path}`, { method: "POST", headers: { "content-type": "application/json", origin: publicOrigin }, body: JSON.stringify(body) });
}
function cookieOf(response) {
  const cookie = response.headers.getSetCookie().map((value) => value.split(";")[0]).join("; ");
  assert.ok(cookie.includes("session_token"), "Authentication must set a session cookie"); return cookie;
}
async function token(deviceId, secret) {
  return fetch(`${origin}/api/devices/token`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ device_id: deviceId, device_secret: secret }) });
}
try {
  await adminPool.query(`CREATE DATABASE "${database}"`);
  execFileSync(process.execPath, ["node_modules/@prisma/prisma7/build/prisma7.js", "migrate", "deploy"], { env, stdio: "pipe" });
  prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  execFileSync(process.execPath, ["--import", "tsx", "prisma/seed.ts"], { env: { ...env, BOOTSTRAP_ADMIN_EMAIL: "admin@example.test", BOOTSTRAP_ADMIN_PASSWORD: password }, stdio: "pipe" });
  assert.equal(await prisma.user.count({ where: { role: "admin" } }), 1);
  assert.throws(() => execFileSync(process.execPath, ["--import", "tsx", "prisma/seed.ts"], { env: { ...env, BOOTSTRAP_ADMIN_EMAIL: "other@example.test", BOOTSTRAP_ADMIN_PASSWORD: password }, stdio: "pipe" }));
  passed("initial admin bootstrap and repeat protection");
  server = spawn(process.execPath, development ? ["node_modules/vite/bin/vite.js", "dev", "--port", port, "--strictPort"] : [".output/server/index.mjs"], { env, stdio: ["pipe", "pipe", "pipe"], windowsHide: true });
  for (const stream of [server.stdout, server.stderr]) stream.on("data", (data) => { serverLogs = (serverLogs + data.toString()).slice(-20000); });
  let ready = false;
  for (let attempt = 0; attempt < 120; attempt++) {
    if (server.exitCode !== null) throw new Error("Test server exited before startup");
    try { const res = await fetch(`${origin}/api/auth/ok`); if (res.ok) { ready = true; break; } } catch {}
    await delay(250);
  }
  assert.ok(ready, "Server did not become ready");
  passed("built application boot and auth health endpoint");
  for (const path of ["/", "/signin", "/signup", "/signup/"]) assert.equal((await fetch(`${origin}${path}`)).status, 200);
  const signinHtml = await (await fetch(`${origin}/signin`)).text();
  assert.ok(signinHtml.includes("Create an account"));
  assert.ok(signinHtml.includes('href="/signup'));
  assert.ok(signinHtml.includes("Continue with Keycloak"));
  assert.ok(signinHtml.includes("Keycloak is not configured in this environment."));
  const consoleResponse = await fetch(`${origin}/console`, { redirect: "manual" });
  assert.ok([302, 307].includes(consoleResponse.status));
  assert.match(consoleResponse.headers.get("location"), /signin/);
  passed("public pages render and anonymous console redirects");
  const lightPage = await fetch(`${origin}/signin`, { headers: { cookie: "emqx-console-theme=light" } });
  assert.match(await lightPage.text(), /<html[^>]*class="light"/);
  const darkPage = await fetch(`${origin}/signin`, { headers: { cookie: "emqx-console-theme=invalid" } });
  assert.match(await darkPage.text(), /<html[^>]*class="dark"/);
  passed("saved theme is server-rendered and invalid preferences default to dark");
  const forgedSignup = await authPost("sign-up/email", { name: "Forged", email: "forged@example.test", password, role: "admin" });
  assert.equal(forgedSignup.status, 200);
  assert.equal((await prisma.user.findUniqueOrThrow({ where: { email: "forged@example.test" } })).role, "user");
  const memberSignup = await authPost("sign-up/email", { name: "Member", email: "member@example.test", password });
  assert.equal(memberSignup.status, 200);
  const memberCookie = cookieOf(memberSignup);
  const anonymousCreate = await authPost("admin/create-user", { name: "Unauthorized", email: "unauthorized@example.test", password, role: "admin" });
  assert.equal(anonymousCreate.status, 401);
  assert.equal(await prisma.user.count(), 3);
  passed("development signup creates ordinary users and ignores forged roles");
  const member = await prisma.user.findUniqueOrThrow({ where: { email: "member@example.test" } });
  assert.equal(member.role, "user");
  assert.equal((await rpc(memberCookie).session({})).isAdmin, false);
  const memberCreate = await fetch(`${origin}/api/auth/admin/create-user`, {
    method: "POST", headers: { "content-type": "application/json", origin: publicOrigin, cookie: memberCookie },
    body: JSON.stringify({ name: "Unauthorized", email: "unauthorized@example.test", password, role: "admin" }),
  });
  assert.equal(memberCreate.status, 403);
  assert.equal(await prisma.user.count(), 2);
  passed("existing ordinary users can sign in but cannot provision accounts");
  const adminSignIn = await authPost("sign-in/email", { email: "admin@example.test", password });
  assert.equal(adminSignIn.status, 200);
  const adminCookie = cookieOf(adminSignIn);
  const admin = rpc(adminCookie);
  const fields = { deviceId: "test-device", serialNumber: "test-serial", mqttUsername: "mqtt-test", firmwareVersion: null, productModel: "Sensor" };
  const missingId = randomUUID();
  const operations = [
    (c) => c.audit.list({}),
    (c) => c.devices.list({}), (c) => c.devices.register(fields),
    (c) => c.devices.update({ id: missingId, fields: { serialNumber: "updated", productModel: null, firmwareVersion: null } }),
    (c) => c.devices.rotateSecret({ id: missingId }), (c) => c.devices.setStatus({ id: missingId, status: "revoked" }),
    (c) => c.devices.getSecret({ id: missingId }), (c) => c.devices.delete({ id: missingId }),
  ];
  for (const operation of operations) {
    await assert.rejects(() => operation(rpc()), (error) => error.code === "UNAUTHORIZED");
    await assert.rejects(() => operation(rpc(memberCookie)), (error) => error.code === "FORBIDDEN");
  }
  assert.equal(await prisma.device.count(), 0);
  passed("all device operations, including secret viewing and deletion, deny anonymous and ordinary users");
  const created = await admin.devices.register(fields);
  assert.ok(created.secret);
  const stored = await prisma.device.findUniqueOrThrow({ where: { id: created.device.id } });
  assert.notEqual(stored.deviceSecretHash, created.secret);
  assert.equal((await admin.devices.getSecret({ id: created.device.id })).secret, created.secret);
  assert.ok(!JSON.stringify(await rpc(adminCookie).audit.list({})).includes(created.secret));
  await prisma.device.update({ where: { id: created.device.id }, data: { deviceSecret: "" } });
  await assert.rejects(() => admin.devices.getSecret({ id: created.device.id }), (error) => error.code === "CONFLICT" && /Rotate its secret/.test(error.message));
  assert.equal((await token(fields.deviceId, created.secret)).status, 200);
  await prisma.device.update({ where: { id: created.device.id }, data: { deviceSecret: created.secret } });
  passed("stored secrets can be retrieved; legacy hash-only credentials stay valid and return a clear recovery message");
  const listed = await admin.devices.list({ search: "test", pageSize: 1 });
  assert.equal(listed.total, 1); assert.equal(listed.devices.length, 1);
  assert.ok(!JSON.stringify(listed).includes(stored.deviceSecretHash));
  assert.ok(!JSON.stringify(listed).includes(created.secret));
  await assert.rejects(() => admin.devices.register(fields), (error) => error.code === "CONFLICT");
  assert.equal(await prisma.device.count(), 1);
  passed("registration, unique constraints, search/pagination and secret-free responses");
  const adminPage = await fetch(`${origin}/console/devices`, { headers: { cookie: adminCookie } });
  assert.equal(adminPage.status, 200);
  const adminHtml = await adminPage.text(); assert.ok(adminHtml.includes(fields.deviceId)); assert.ok(!adminHtml.includes(created.secret));
  const memberPage = await fetch(`${origin}/console/devices`, { headers: { cookie: memberCookie } });
  const memberHtml = await memberPage.text(); assert.ok(memberHtml.includes("Administrator access required")); assert.ok(!memberHtml.includes(fields.deviceId));
  passed("admin console SSR renders devices without exposing them to ordinary users");
  const response = await token(fields.deviceId, created.secret);
  assert.equal(response.status, 200); assert.match(response.headers.get("cache-control"), /no-store/);
  const issued = await response.json(); assert.equal(issued.expires_in, 3600); assert.equal(issued.token_type, "Bearer");
  const key = new TextEncoder().encode(signingSecret);
  const { payload, protectedHeader } = await jwtVerify(issued.access_token, key, { algorithms: ["HS256"] });
  assert.equal(protectedHeader.alg, "HS256"); assert.equal(payload.username, fields.mqttUsername); assert.equal(payload.clientid, fields.deviceId); assert.equal(payload.exp - payload.iat, 3600);
  await assert.rejects(() => jwtVerify(issued.access_token, key, { currentDate: new Date((payload.exp + 1) * 1000) }));
  await assert.rejects(() => jwtVerify(`${issued.access_token.slice(0, -8)}tampered`, key));
  assert.ok((await prisma.device.findUniqueOrThrow({ where: { id: created.device.id } })).lastTokenIssuedAt);
  passed("device API compatibility, JWT claims/signature/expiry and issuance tracking");
  assert.equal((await token(fields.deviceId, "incorrect")).status, 401);
  assert.equal((await token("unknown", "incorrect")).status, 401);
  await admin.devices.update({ id: created.device.id, fields: { serialNumber: "updated", productModel: "Sensor 2", firmwareVersion: "2.0" } });
  const rotated = await admin.devices.rotateSecret({ id: created.device.id });
  assert.equal((await admin.devices.getSecret({ id: created.device.id })).secret, rotated.secret);
  assert.equal((await token(fields.deviceId, created.secret)).status, 401);
  assert.equal((await token(fields.deviceId, rotated.secret)).status, 200);
  passed("metadata editing and rotation invalidate old provisioning credentials");
  await admin.devices.setStatus({ id: created.device.id, status: "disabled" });
  assert.equal((await token(fields.deviceId, rotated.secret)).status, 401);
  await admin.devices.setStatus({ id: created.device.id, status: "active" });
  assert.equal((await token(fields.deviceId, rotated.secret)).status, 200);
  await admin.devices.setStatus({ id: created.device.id, status: "revoked" });
  assert.equal((await token(fields.deviceId, rotated.secret)).status, 401);
  await assert.rejects(() => admin.devices.rotateSecret({ id: created.device.id }), (error) => error.code === "CONFLICT");
  const revoked = await prisma.device.findUniqueOrThrow({ where: { id: created.device.id } }); assert.ok(revoked.revokedAt);
  await jwtVerify(issued.access_token, key);
  const restored = await admin.devices.setStatus({ id: created.device.id, status: "active" });
  assert.equal(restored.status, "active"); assert.equal(restored.revokedAt, null);
  assert.equal((await token(fields.deviceId, rotated.secret)).status, 200);
  passed("disable, revoke and reactivate; reactivation restores issuance and clears revokedAt");
  const suppliedSecret = "  existing-factory-secret-123  ";
  const importedFields = { ...fields, deviceId: "existing-secret-device", serialNumber: "factory-serial", mqttUsername: "factory-user", secret: suppliedSecret };
  const imported = await admin.devices.register(importedFields);
  assert.equal(imported.secret, suppliedSecret);
  assert.equal((await admin.devices.getSecret({ id: imported.device.id })).secret, suppliedSecret);
  const importedRow = await prisma.device.findUniqueOrThrow({ where: { id: imported.device.id } });
  assert.ok(importedRow.deviceSecretHash.startsWith("scrypt:"));
  assert.ok(!importedRow.deviceSecretHash.includes(suppliedSecret));
  assert.equal((await token(importedFields.deviceId, suppliedSecret)).status, 200);
  assert.equal((await token(importedFields.deviceId, suppliedSecret.trim())).status, 401);
  const importedListing = await admin.devices.list({ search: importedFields.deviceId });
  assert.ok(!JSON.stringify(importedListing).includes(suppliedSecret));
  assert.ok(!JSON.stringify(importedListing).includes(importedRow.deviceSecretHash));
  await assert.rejects(() => admin.devices.register({ ...importedFields, deviceId: "bad-secret-device", secret: "short" }), (error) => error.code === "BAD_REQUEST");
  const blankSecret = await admin.devices.register({ ...fields, deviceId: "blank-secret-device", serialNumber: "blank-serial", mqttUsername: "blank-user", secret: "" });
  assert.equal(blankSecret.secret.length, 43);
  assert.equal((await token("blank-secret-device", blankSecret.secret)).status, 200);
  passed("supplied and blank registration secrets, exact-byte verification and secret-free listings");
  assert.deepEqual(await admin.devices.delete({ id: blankSecret.device.id }), { id: blankSecret.device.id });
  assert.equal(await prisma.device.findUnique({ where: { id: blankSecret.device.id } }), null);
  await assert.rejects(() => admin.devices.getSecret({ id: blankSecret.device.id }), (error) => error.code === "NOT_FOUND");
  passed("admin deletion removes the device and subsequent secret retrieval returns not found");
  const denied = await fetch(`${origin}/api/rpc/devices/register`, { method: "POST", headers: { origin: "https://attacker.example", cookie: adminCookie, "content-type": "application/json" }, body: JSON.stringify(fields) });
  assert.equal(denied.status, 403);
  assert.equal((await fetch(`${origin}/api/devices/token`, { method: "POST", body: "x".repeat(3000) })).status, 413);
  assert.equal((await fetch(`${origin}/mcp`, { method: "POST" })).status, 404);
  passed("cross-origin writes, oversized device requests and removed demo endpoint");
  for (let attempt = 0; attempt < 10; attempt++) await token("limited-device", "invalid");
  assert.equal((await token("limited-device", "invalid")).status, 429);
  for (let attempt = 0; attempt < 5; attempt++) await authPost("sign-in/email", { email: "missing@example.test", password: "wrong-password" });
  assert.equal((await authPost("sign-in/email", { email: "missing@example.test", password: "wrong-password" })).status, 429);
  passed("device and admin sign-in throttling");
  const audit = await prisma.auditEvent.findMany();
  assert.ok(audit.some((event) => event.action === "device.secret.rotated"));
  assert.ok(audit.some((event) => event.action === "device.revoked" && event.actorId));
  assert.ok(!JSON.stringify(audit).includes(created.secret));
  assert.ok(!JSON.stringify(audit).includes(suppliedSecret));
  assert.ok(!JSON.stringify(audit).includes(issued.access_token));
  passed("durable, attributed device audit trail without secrets");
  const auditPage = await admin.audit.list({ pageSize: 2 });
  assert.equal(auditPage.events.length, 2); assert.equal(auditPage.total, audit.length);
  const auditNext = await admin.audit.list({ pageSize: 2, page: 2 });
  assert.ok(!auditNext.events.some((event) => auditPage.events.some((first) => first.id === event.id)));
  const deniedEvents = await admin.audit.list({ search: "device.token", outcome: "denied" });
  assert.ok(deniedEvents.total > 0); assert.ok(deniedEvents.events.every((event) => event.outcome === "denied" && event.action.includes("device.token")));
  assert.ok(deniedEvents.events.every((event) => event.actorKind === "anonymous"));
  const actorEvents = await admin.audit.list({ search: created.device.id });
  assert.ok(actorEvents.events.some((event) => event.actorKind === "user" && event.actorLabel === "Administrator"));
  assert.ok(actorEvents.events.some((event) => event.actorKind === "device" && event.actorLabel === fields.deviceId));
  assert.ok(!JSON.stringify(auditPage).includes(suppliedSecret));
  const auditHtml = await fetch(`${origin}/console/audit`, { headers: { cookie: adminCookie } });
  assert.equal(auditHtml.status, 200); assert.match(await auditHtml.text(), /Audit log/);
  const deniedAuditHtml = await fetch(`${origin}/console/audit`, { headers: { cookie: memberCookie } });
  const deniedAuditBody = await deniedAuditHtml.text(); assert.ok(deniedAuditBody.includes("Administrator access required")); assert.ok(!deniedAuditBody.includes("device.token.issued"));
  passed("audit log access control, paging, filtering, actor labels and protected page rendering");
  const bulkRows = Array.from({ length: 25 }, (_, index) => ({
    deviceId: `bulk-device-${index}`, serialNumber: `bulk-serial-${index}`, mqttUsername: `bulk-user-${index}`,
    firmwareVersion: null, productModel: "Bulk sensor", status: index === 0 ? "disabled" : "active",
    ...(index === 1 ? { secret: "bulk-provisioning-secret-123" } : {}),
  }));
  for (const [caller, expectedCode] of [[rpc(), "UNAUTHORIZED"], [rpc(memberCookie), "FORBIDDEN"]]) {
    await assert.rejects(() => caller.devices.import({ rows: [bulkRows[0]] }), (error) => error.code === expectedCode);
    await assert.rejects(() => caller.devices.export({ includeSecrets: true }), (error) => error.code === expectedCode);
  }
  assert.deepEqual(await admin.devices.import({ rows: bulkRows }), { imported: 25 });
  const publicExport = await admin.devices.export({ search: "bulk-device-" });
  assert.equal(publicExport.devices.length, 25);
  assert.ok(publicExport.devices.every((device) => !("secret" in device) && !("deviceSecretHash" in device)));
  const secretExport = await admin.devices.export({ search: "bulk-device-", includeSecrets: true });
  assert.equal(secretExport.devices.find((device) => device.deviceId === "bulk-device-1").secret, "bulk-provisioning-secret-123");
  assert.ok(secretExport.devices.every((device) => device.secret.length >= 12));
  assert.equal((await admin.devices.export({ search: "bulk-device-", status: "disabled" })).devices.length, 1);
  assert.equal((await admin.devices.list({ search: "bulk-device-", pageSize: 20 })).devices.length, 20);
  passed("bulk import and filtered exports span pagination, protect secrets by default, and require admin access");
  const beforeFailedImport = await prisma.device.count();
  const freshRow = { ...bulkRows[1], deviceId: "rollback-new", serialNumber: "rollback-new", mqttUsername: "rollback-new" };
  await assert.rejects(() => admin.devices.import({ rows: [freshRow, bulkRows[0]] }), (error) => error.code === "CONFLICT" && /Row 3/.test(error.message));
  assert.equal(await prisma.device.count(), beforeFailedImport);
  assert.equal(await prisma.device.findUnique({ where: { deviceId: "rollback-new" } }), null);
  await assert.rejects(() => admin.devices.import({ rows: [freshRow, freshRow] }), (error) => error.code === "BAD_REQUEST");
  await assert.rejects(() => admin.devices.import({ rows: [{ ...freshRow, role: "admin" }] }), (error) => error.code === "BAD_REQUEST");
  await assert.rejects(() => admin.devices.import({ rows: Array.from({ length: 201 }, () => freshRow) }), (error) => error.code === "BAD_REQUEST");
  assert.equal(await prisma.device.count(), beforeFailedImport);
  const importedAudit = await prisma.auditEvent.findMany({ where: { action: "device.imported" } });
  assert.equal(importedAudit.length, 25);
  assert.ok(importedAudit.every((event) => event.actorId && event.resourceId));
  assert.ok(!JSON.stringify(await prisma.auditEvent.findMany()).includes("bulk-provisioning-secret-123"));
  const csrfImport = await fetch(`${origin}/api/rpc/devices/import`, { method: "POST", headers: { origin: "https://attacker.example", cookie: adminCookie, "content-type": "application/json" }, body: JSON.stringify({ json: { rows: [freshRow] } }) });
  assert.equal(csrfImport.status, 403);
  const oversizedImport = await fetch(`${origin}/api/rpc/devices/import`, { method: "POST", headers: { origin: publicOrigin, cookie: adminCookie, "content-type": "application/json" }, body: "x".repeat(512 * 1024 + 1) });
  assert.equal(oversizedImport.status, 413);
  passed("duplicate imports roll back atomically; row limits, unexpected fields, CSRF and body limits are enforced with secret-free audit events");
  console.info(`${checks} integration groups passed against a temporary database.`);
  if (development && process.env.TEST_BROWSER_PREVIEW === "1") {
    await prisma.rateLimit.deleteMany();
    console.info(`Temporary browser preview ready at ${origin}; press Enter to clean up.`);
    await new Promise((resolve) => process.stdin.once("data", resolve));
    process.stdin.pause();
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : "Integration failure");
  console.error(serverLogs.slice(-4000));
  process.exitCode = 1;
} finally {
  if (server && server.exitCode === null) { server.kill(); await delay(300); }
  await prisma?.$disconnect();
  // The only deletion target is the internally generated test database above.
  assert.match(database, /^jwt_console_test_[a-f0-9]{32}$/);
  await adminPool.query(`DROP DATABASE IF EXISTS "${database}" WITH (FORCE)`);
  await adminPool.end();
}
