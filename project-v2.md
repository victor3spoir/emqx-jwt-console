# EMQX JWT Device Console

## Overview

This full-stack application manages device identities for an EMQX broker. Administrators register and revoke devices, while registered devices exchange their credentials for short-lived JWTs used as MQTT passwords.

## Goals

- Provide an administrator console for managing devices and reviewing audit events.
- Issue short-lived, signed JWTs only to registered devices with valid credentials.
- Support local email/password authentication during development and Keycloak authentication in production.
- Keep administrative actions protected, validated, and auditable.

## Non-goals

- Managing EMQX topic authorization or ACLs.
- Acting as an MQTT broker or proxy.
- Providing public account registration in production.
- Storing device JWTs after they are issued.

## User Roles

- **Administrator:** Can access the console, manage devices, and view audit events.
- **User:** Has a valid account but cannot access administrator features without the required role.
- **Device:** Uses its device ID and secret to request an MQTT access token.

## Technology Stack

- **Bun and Bunx:** Package management and project scripts.
- **React 19 and TanStack Start:** Full-stack, server-rendered application framework.
- **TanStack Router, Query, Form, and Table:** Routing, server state, forms, and data tables.
- **oRPC and Zod:** Type-safe APIs with validated inputs and outputs.
- **Better Auth and Keycloak:** Development authentication and production identity management.
- **Prisma ORM and PostgreSQL:** Database access, schema management, and migrations.
- **JOSE:** Device JWT signing.
- **Tailwind CSS v4, shadcn, and Radix UI:** Styling and accessible interface components.
- **Vite and Nitro:** Development tooling and production server packaging.
- **TypeScript and Biome:** Type checking, formatting, and linting.

## Application Surfaces

- `/`: Public landing page.
- `/signin`: Authentication page.
- `/signup`: Local account creation, available only in development.
- `/console/*`: Administrator-only device management and audit area.
- `/api/devices/token`: Public device endpoint that validates credentials and issues JWTs.
- `/api/auth/*`: Better Auth endpoints.
- `/api/rpc/*`: Type-safe application API endpoints.

## Core Workflows

### Administrator access

1. The administrator authenticates locally in development or through Keycloak in production.
2. The server verifies the session and administrator role.
3. Authorized administrators can register, update, revoke, import, or export devices and inspect audit events.

### Device authentication

1. A device submits its device ID and secret to `/api/devices/token`.
2. The server validates the request, device status, and stored credential hash.
3. The server returns a short-lived signed JWT containing the registered MQTT identity.
4. The device uses that JWT as its MQTT password when connecting to EMQX.

## Architecture

- The browser uses TanStack Start pages and the oRPC client.
- Server routes enforce validation, authentication, and role-based authorization.
- Prisma persists users, sessions, devices, rate limits, and audit events in PostgreSQL.
- The token endpoint signs device JWTs with a secret shared with EMQX.
- EMQX validates JWT identity claims and remains responsible for topic authorization.

## Security and Environments

- Email/password authentication and account creation are enabled only when `NODE_ENV=development`.
- Production requires Keycloak configuration and HTTPS identity endpoints.
- Administrator authorization must be enforced on the server, not only in the interface.
- Every API input and output must be validated with Zod.
- Authentication secrets and device-signing secrets must be different and must never be exposed to the client or logs.
- Device secrets must be generated securely, stored safely, and omitted from exports unless explicitly requested.
- Sensitive endpoints must be rate-limited, and business writes must produce audit events.

## Engineering Rules

### Do

- Organize domain code under `src/features`.
- Use oRPC for application APIs and middleware for shared authorization rules.
- Validate page, form, API, import, and export boundaries.
- Follow `DESIGN.md` for interface and visual decisions.
- Use semantic color tokens defined in `src/styles.css`.
- Add focused tests for authentication, authorization, device credentials, and token issuance.

### Do not

- Hardcode colors in components.
- Trust roles, identifiers, or status values supplied by clients.
- Return secrets in logs, errors, audit metadata, or default exports.
- Bypass server-side authorization because a route is hidden in the interface.
- Add generic abstractions or design tokens without a concrete reusable purpose.

## Acceptance Criteria

- Development users can create an account and sign in locally.
- Production users authenticate through Keycloak; public sign-up remains disabled.
- Anonymous and non-administrator users cannot access or mutate console resources.
- Administrators can manage devices and review recorded audit events.
- Valid active devices receive a time-limited JWT; invalid, disabled, or revoked devices do not.
- JWT identity claims match the registered device and are accepted by the configured EMQX broker.
- Linting, type checking, builds, and relevant automated tests pass.
