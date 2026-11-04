import assert from "node:assert/strict";
import { test } from "node:test";
import { generateDeviceSecret, verifyDeviceSecret, hashProvidedDeviceSecret } from "../src/features/devices/device-secrets.server";
import { tokenInput, listInput, deviceFields, registerDeviceInput } from "../src/features/devices/devices.types";
import { boundedRequest } from "../src/lib/http.server";
import { RateLimiter } from "../src/lib/rate-limit.server";
import { themeFromCookie } from "../src/features/theme/theme.types";
import { auditListInput } from "../src/features/audit/audit.types";
import { hasAdminRole, hasKeycloakRole } from "../src/features/auth/auth-roles";
import { getServerEnv } from "../src/lib/env.server";

const productionKeycloak = {
  KEYCLOAK_ISSUER: "https://identity.example.test/realms/emqx",
  KEYCLOAK_CLIENT_ID: "emqx-device-console",
  KEYCLOAK_CLIENT_SECRET: "keycloak-client-secret",
};

test("short broker signing keys require explicit development opt-in and never work in production", () => {
  const source = {
    DATABASE_URL: "postgresql://localhost/test",
    BETTER_AUTH_URL: "https://console.example.test",
    BETTER_AUTH_SECRET: "a".repeat(48),
    DEVICE_JWT_SECRET: "local-test-key",
  };
  assert.throws(() => getServerEnv(source), /DEVICE_JWT_SECRET/);
  assert.throws(() => getServerEnv({ ...source, NODE_ENV: "development" }), /DEVICE_JWT_SECRET/);
  assert.equal(getServerEnv({ ...source, NODE_ENV: "development", DEVICE_JWT_ALLOW_INSECURE_DEV_SECRET: "true" }).DEVICE_JWT_SECRET, source.DEVICE_JWT_SECRET);
  for (const NODE_ENV of ["production", "test", undefined]) {
    assert.throws(() => getServerEnv({ ...source, ...(NODE_ENV === "production" ? productionKeycloak : {}), NODE_ENV, DEVICE_JWT_ALLOW_INSECURE_DEV_SECRET: "true" }), /DEVICE_JWT_SECRET/);
  }
  assert.throws(() => getServerEnv({ ...source, NODE_ENV: "development", DEVICE_JWT_ALLOW_INSECURE_DEV_SECRET: "true", DEVICE_JWT_SECRET: "" }), /DEVICE_JWT_SECRET/);
  assert.ok(getServerEnv({ ...source, ...productionKeycloak, NODE_ENV: "production", DEVICE_JWT_SECRET: "b".repeat(48) }));
});

test("production requires complete HTTPS Keycloak configuration and disables passwords", () => {
  const source = {
    DATABASE_URL: "postgresql://localhost/test",
    BETTER_AUTH_URL: "https://console.example.test",
    BETTER_AUTH_SECRET: "a".repeat(48),
    DEVICE_JWT_SECRET: "b".repeat(48),
  };
  assert.throws(() => getServerEnv({ ...source, NODE_ENV: "production" }), /Keycloak/);
  assert.throws(() => getServerEnv({ ...source, ...productionKeycloak, KEYCLOAK_ISSUER: "http://identity.example.test/realms/emqx", NODE_ENV: "production" }), /HTTPS/);
  assert.equal(getServerEnv({ ...source, ...productionKeycloak, NODE_ENV: "production" }).AUTH_EMAIL_PASSWORD_ENABLED, false);
  assert.equal(getServerEnv({ ...source, NODE_ENV: "development" }).AUTH_EMAIL_PASSWORD_ENABLED, true);
});

test("Keycloak admin role accepts configured realm or client roles only", () => {
  const clientId = "emqx-device-console";
  assert.ok(hasKeycloakRole({ realm_access: { roles: ["admin"] } }, clientId, "admin", "realm"));
  assert.ok(hasKeycloakRole({ resource_access: { [clientId]: { roles: ["admin"] } } }, clientId, "admin", "client"));
  assert.equal(hasKeycloakRole({ realm_access: { roles: ["admin"] } }, clientId, "admin", "client"), false);
  assert.equal(hasKeycloakRole({ resource_access: { other: { roles: ["admin"] } } }, clientId, "admin", "client"), false);
  assert.equal(hasKeycloakRole({ realm_access: { roles: ["user"] } }, clientId, "admin", "realm"), false);
  assert.ok(hasAdminRole("user,admin"));
  assert.equal(hasAdminRole("administrator"), false);
});

test("theme cookie only accepts known themes and defaults to dark", () => {
  assert.equal(themeFromCookie(""), "dark");
  assert.equal(themeFromCookie("other=light; emqx-console-theme=light; session=hidden"), "light");
  assert.equal(themeFromCookie("emqx-console-theme=dark"), "dark");
  assert.equal(themeFromCookie("emqx-console-theme=unexpected"), "dark");
  assert.equal(themeFromCookie("fake-emqx-console-theme=light"), "dark");
});

test("audit queries bound pagination, filters and accepted fields", () => {
  assert.ok(auditListInput.safeParse({ search: "device.revoked", outcome: "success", pageSize: 20 }).success);
  for (const input of [{ page: 0 }, { pageSize: 101 }, { search: "x".repeat(101) }, { outcome: "unrecognized" }, { actorRole: "admin" }]) assert.ok(!auditListInput.safeParse(input).success);
});

test("generated credentials verify without retaining plaintext, and reject another secret", async () => {
  const first = generateDeviceSecret();
  const second = generateDeviceSecret();
  assert.equal(first.secret.length, 43);
  assert.notEqual(first.secret, second.secret);
  assert.ok(await verifyDeviceSecret(first.secret, first.hash));
  assert.ok(!await verifyDeviceSecret(second.secret, first.hash));
  assert.ok(!await verifyDeviceSecret(first.secret, "invalid-hash"));
});

test("supplied secrets use salted hashes and preserve exact bytes", async () => {
  const secret = "  existing-secret-123  ";
  const hash = await hashProvidedDeviceSecret(secret);
  assert.notEqual(hash, await hashProvidedDeviceSecret(secret));
  assert.ok(hash.startsWith("scrypt:"));
  assert.ok(await verifyDeviceSecret(secret, hash));
  assert.ok(!await verifyDeviceSecret(secret.trim(), hash));
  assert.ok(!await verifyDeviceSecret("wrong-secret-123", hash));
});

test("registration allows supplied, blank or omitted secrets and rejects invalid lengths", () => {
  const fields = { deviceId: "device", serialNumber: "serial", mqttUsername: "device", firmwareVersion: null, productModel: null };
  for (const value of [undefined, "", "existing-device-secret"]) assert.ok(registerDeviceInput.safeParse({ ...fields, secret: value }).success);
  for (const value of ["short", "x".repeat(257)]) assert.ok(!registerDeviceInput.safeParse({ ...fields, secret: value }).success);
});

test("device boundaries reject privilege fields, oversized input and unbounded pagination", () => {
  assert.ok(!tokenInput.safeParse({ device_id: "device", device_secret: "x", status: "active" }).success);
  assert.ok(!tokenInput.safeParse({ device_id: "device", device_secret: "x".repeat(257) }).success);
  assert.ok(!listInput.safeParse({ page: -1 }).success);
  assert.ok(!listInput.safeParse({ pageSize: 101 }).success);
  assert.ok(!deviceFields.safeParse({ deviceId: "device", serialNumber: "serial", mqttUsername: "device", firmwareVersion: null, productModel: null, deviceSecretHash: "injected" }).success);
});

test("limiter blocks repeated requests, expires windows and bounds unique identities", () => {
  const limiter = new RateLimiter(2);
  limiter.consume("a", 2, 1000); limiter.consume("a", 2, 1000);
  assert.throws(() => limiter.consume("a", 2, 1000));
  limiter.consume("b", 2, 1000);
  assert.throws(() => limiter.consume("c", 2, 1000));
  limiter.consume("a", 2, 61001);
  limiter.consume("c", 2, 61001);
});

test("body limit checks actual bytes even when Content-Length is absent", async () => {
  const oversized = new Request("http://localhost", { method: "POST", body: "é".repeat(8) });
  assert.equal(await boundedRequest(oversized, 10), null);
  const allowed = await boundedRequest(new Request("http://localhost", { method: "POST", body: "hello" }), 10);
  assert.equal(await allowed?.text(), "hello");
});
