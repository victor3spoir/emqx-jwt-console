# JWT-DASHBOARD-FOR-EMQX

## Description

This combine backend api & admin dashboard to manage devices that will connect to emqx broker using jwt. the app allows:

- Admin user to register and manages new devices infos in the the db
- Devices to challenges and get jwt access token

## Stacks

- bun/bunx: packages mananger
- prisma/postgres: orm and db management
- shadcn/tailwindcss@v4: for ui/ux
- upfetch: for external api clients & calls
- tanstack-query: for all data fetch operations
- tanstack-table: for rich tables with rich features
- tanstast-form: for rich forms operations

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
