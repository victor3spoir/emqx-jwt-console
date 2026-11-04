# EMQX Device Console

A single-organization device registry and JWT issuer for EMQX, with a protected administrator console. Built with TanStack Start, Better Auth, Prisma/PostgreSQL, oRPC and Zod.

## Local setup

1. Install Bun and Node.js 22 or later.
2. Run `bun install`.
3. Copy `example.env` to `.env` and fill in the database URL and two separate random secrets. Generate each secret independently with `bun -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"`.
4. Run `docker compose up -d db` for local PostgreSQL on port 55432, or use your own PostgreSQL instance.
5. Run `bun run db:generate` followed by `bun run db:deploy`.
6. Set `BOOTSTRAP_ADMIN_EMAIL` and `BOOTSTRAP_ADMIN_PASSWORD` in your current shell, then run `bun run admin:bootstrap`. The password must have 12–128 characters. Optional: `BOOTSTRAP_ADMIN_NAME`. Remove those shell variables afterward. The command refuses to overwrite an account or create another bootstrap admin.
7. Run `bun run dev` and open http://localhost:3000. Development applies pending database migrations before starting; development and production builds regenerate Prisma Client automatically.

Public sign-up is disabled: `/signup` returns 404 and the authentication API rejects email/password registration. Accounts must be provisioned by a trusted administrator. To create an administrator with Better Auth's CLI, run `bunx auth@latest create-admin --config ./src/lib/auth.ts --email admin@example.com --name Administrator --role admin` and enter the password when prompted. Sign-in is at `/signin`; the console is at `/console/devices`. The console header includes a dark/light toggle. Its preference is stored in a non-sensitive cookie and applied during server rendering.

## Devices

Register a device with a unique device ID, serial number and MQTT username. The MQTT username initially follows the device ID; choose a different username during registration if needed. Device ID and MQTT username stay fixed after registration. Firmware and model are optional.

Registration accepts an existing device secret (12–256 characters). Leave the secret blank to generate a cryptographically random 256-bit secret. Save it from the one-time credential dialog and provision it securely. Supplied secrets use salted scrypt hashes; generated high-entropy secrets use SHA-256. Existing generated credentials remain compatible. Admin account passwords use Better Auth's password hashing.

- **Active:** may request new tokens.
- **Disabled:** cannot request tokens; can be reactivated.
- **Revoked:** cannot request tokens, with a revocation timestamp. An administrator can choose **Reactivate** to restore access using the existing secret and clear the timestamp. Editing and rotation require reactivation first; audit history is retained.
- **Rotate secret:** invalidates the previous provisioning secret and displays a replacement once.

`last_token_issued_at` records successful issuance, not MQTT connection activity. Device changes and token outcomes have persistent audit records in `audit_events`. Device writes and their audit events commit together. Administrators can inspect the read-only Audit log at `/console/audit`, linked from the console navigation. It supports search by action/actor ID/resource ID, outcome filters, refresh and pagination; names are resolved from current users/devices when available. It covers the recorded device/token events and initial administrator setup, not all authentication or broker activity.

## Device CSV and Excel files

Use **Import** and **Export** above the device table. Imports accept UTF-8 CSV or the first worksheet of an XLSX file, up to 200 devices and 2 MB per file. Download either template from the import dialog, edit it, then choose the file to preview validation results before confirming.

Required columns are `device_id` and `serial_number`. Optional columns are `mqtt_username` (defaults to device ID), `product_model`, `firmware_version`, `status` (defaults to `active`), and `secret` (blank generates a secret). Imported secrets can be retrieved through **View secret**. Duplicate device IDs, serial numbers, or MQTT usernames reject the whole import; existing devices are preserved.

Exports include every device matching the current search and status filters, across all pages, up to 5,000 devices. Choose CSV or XLSX and optionally enable **Include device secrets**. Secrets are excluded by default. Exported timestamps are informational and ignored when importing. CSV exports escape formula-like values for spreadsheet safety; XLSX exports write values as text to preserve identifiers and leading zeros. Imports, exports, and exports containing secrets are recorded in the audit log.

## Device token API

`POST /api/devices/token` accepts JSON:

```json
{ "device_id": "sensor-001", "device_secret": "the-provisioned-secret" }
```

Successful response:

```json
{ "access_token": "<signed-jwt>", "token_type": "Bearer", "expires_in": 3600 }
```

The response is not cacheable. Invalid credentials, disabled devices and revoked devices return 401 with a generic error. Invalid input returns 400; requests larger than 2 KiB return 413; throttled requests return 429 with `Retry-After`.

To request a token, run this in Bash (Git Bash on Windows also works):

```bash
bash scripts/request-device-token.sh esp32-01
```

Enter the device secret at the hidden prompt. The script requests a token from `POST http://localhost:3000/api/devices/token`, prints the JSON response, then uses `access_token` as the MQTT password to connect to **`mqtts://localhost:8883`**. It uses the token's registered MQTT username and client ID, verifies the TLS certificate, reports whether EMQX accepted the connection, and disconnects. A failed request or connection exits with an error.

Requires Bash, curl, Node.js, and the project dependencies (`bun install`). By default it reads the public CA certificate from the local `emqx-broker-emqx-broker-01-1` Docker container. Set `MQTT_CA` to a CA certificate file to connect without Docker, or override `EMQX_CONTAINER` for another local container. The token is passed through stdin, not command arguments or a saved credentials file.

To use another console, run `API_URL=https://console.example.com bash scripts/request-device-token.sh esp32-01`. Set `BROKER_URL` to change the MQTTS address. For automation, supply `DEVICE_SECRET` through the environment instead of the prompt.

JWTs use HS256 with `username = mqtt_username`, `clientid = device_id`, `iat`, and `exp`. The default lifetime is one hour, configured with `DEVICE_JWT_TTL_SECONDS` (60–86400 seconds).

Configure EMQX JWT authentication with the same **literal UTF-8** `DEVICE_JWT_SECRET` (disable base64 decoding if offered). Require the JWT `username` and `clientid` claims to match the MQTT connection's username and client ID. Devices use the issued JWT as the MQTT password. EMQX owns topic authorization; tokens do not grant topic ACLs.

When testing against an existing local broker with a short signing key, set the same `DEVICE_JWT_SECRET` and explicitly opt in with `DEVICE_JWT_ALLOW_INSECURE_DEV_SECRET=true`. This exception works only in `NODE_ENV=development`; production and other environments still reject keys shorter than 32 characters. Restart development after changing environment settings. For a private MQTTS certificate, trust the broker's CA and connect to a hostname listed in its certificate instead of disabling TLS verification.

Disabling, revoking or rotating a device does **not** invalidate previously issued JWTs or terminate existing MQTT connections. Obtain a new JWT before reconnecting with an expired one. Immediate disconnection/revocation requires additional broker integration, outside this release.

The request/response format is compatible with the sibling backend, but the default lifetime is now one hour and identities use the registered MQTT username. This application does not automatically import the sibling's hardcoded device registry.

## Security and deployment

Deploy one application instance behind a reverse proxy that terminates HTTPS. Production startup requires an HTTPS `BETTER_AUTH_URL`, `DATABASE_URL`, and distinct authentication/device signing secrets of at least 32 characters. Keep `.env` and provisioning secrets out of source control.

Build with `bun run db:generate` and `bun run build`. Apply migrations with `bun run db:deploy`, then start with `node .output/server/index.mjs`. Supply environment variables at runtime through your deployment's secret store; the built server does not depend on a checked-in `.env`. Set `PORT` for the private listener.

Better Auth rate limits are stored in PostgreSQL. Without a configured trusted source-IP header, sign-in limits share one bucket per path. If your reverse proxy **overwrites** incoming source-IP headers and prevents direct application access, set `AUTH_TRUSTED_IP_HEADER=x-forwarded-for` or `x-real-ip`. Do not trust arbitrary headers from public clients.

Device issuance has an application-wide limit of 600 requests/minute and a per-device limit of 10/minute. Its bounded in-memory limiter is intended for the agreed single-instance deployment; it resets on restart. Add edge throttling for internet-facing deployments and replace it with a shared limiter before scaling to multiple instances. Set proxy request/time limits, prohibit framing of admin pages, maintain database backups, and manage audit retention for your environment.

The browser console uses protected oRPC procedures at `/api/rpc`. Every device procedure checks the current server-side admin role, independently of page navigation. Cookie-authenticated RPC writes require the configured browser origin. Starter Todo and MCP endpoints have been removed.

Email delivery, password reset, MFA, organization management and broker session control are not enabled in this first version.

## Verification

- `bun run typecheck`
- `bun run check`
- `bun run test`
- `bun run build`
- `bun run test:integration`

Integration checks require a completed build and PostgreSQL. They create and delete only a randomly named `jwt_console_test_*` database, never migrate or clear your development database. The database user must be allowed to create databases. Default local connection: `postgresql://postgres:postgres@localhost:55432/postgres`. Override with `TEST_DATABASE_BASE_URL`; override the test listener with `TEST_PORT` (default 3101).

The integration server uses a configured HTTPS public origin with a private HTTP listener, matching TLS termination at a reverse proxy. Checks cover admin bootstrap, sign-in, removed sign-up pages, rejected public account creation, all device operations' access controls, unique constraints, DTO secrecy, signed JWTs and expiry, rotation, lifecycle transitions, throttling, CSRF, payload limits and audit persistence.

Development uses TanStack Start's Vite server directly; Nitro is enabled for production builds. This avoids the installed Nitro beta's Windows development-worker transport timeout. To run the integration suite against development mode, set `TEST_DEV=1` before `bun run test:integration`.

Browser checks covered landing/sign-in, administrator entry, device registration, one-time credential display, table refresh and sign-out. Regression checks also cover supplied/blank secrets and revoke/reactivate behavior. The changed source passes its scoped Biome check. The project-wide check still reports pre-existing formatting/import issues in untouched starter files and an explicit `any` in `src/polyfill.ts`.
