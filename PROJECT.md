# JWT-DASHBOARD-FOR-EMQX

## Description

This combine backend api & admin dashboard to manage devices that will connect to emqx broker using jwt. the app allows:

- Admin user to register and manages new devices infos in the the db
- Devices to challenges and get jwt access token

## Technology Stack

- **Bun and Bunx:** JavaScript runtime, package manager, and project script runner for local development and builds.
- **React 19 and TanStack Start:** Full-stack application framework for server-rendered React pages, server routes, and production builds.
- **TanStack Router:** File-based, type-safe routing for public, authentication, and administrator pages.
- **TanStack Query:** Client-side server-state fetching, caching, invalidation, and mutation coordination.
- **TanStack Form and Zod:** Type-safe form state and validation for user and device inputs.
- **TanStack Table:** Headless table behavior for device and audit-log listing, filtering, sorting, and pagination.
- **oRPC and Zod:** Type-safe application APIs with validated inputs and outputs shared between the server and client.
- **Better Auth and Keycloak:** Local email/password authentication in development and Keycloak-based identity in production, with role-based administrator access.
- **Prisma ORM and PostgreSQL:** Persistent storage, schema management, migrations, and type-safe database access.
- **JOSE:** Signing device JWTs used to authenticate MQTT connections to EMQX.
- **Tailwind CSS v4, shadcn, and Radix UI:** Styling, design tokens, and accessible interface primitives.
- **Vite and Nitro:** Development server and frontend bundling through Vite, with Nitro packaging the production server.
- **TypeScript and Biome:** Static type checking, formatting, and linting.

## Spaces Layouts

This give app layouts & structure

- `/console/*`: Admin area, only for admin users to manage, register devices
- `/api/devices/token`: external endpoints used by devices (empx module) to get token (that will be used later to auth against emqx broker)

## Rules

### Do

- Use features based architecture in the project (for features folder based one)
- Use oprc to create endpoins instead of using simple Server Functions ;
- Add input validation layer uisng `zod` to every inputs, outputs
- Add auth validation where needed to pages, orpc api routes and others (you can use help of middlewares)
- Follow DESIGN.md and docs/design/admin-layout.md for visual decisions;
- Use semantic colors defined in src/styles.css for surfaces, text, controls, navigation and status. Primary is reserved for primary actions.

### Don't

- Do not hardcode colors in components. Define colors in src/styles.css and expose semantic theme tokens before use.
- Create generic color for everything
