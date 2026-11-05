FROM oven/bun:1.4.2-alpine AS base

FROM base AS builder

WORKDIR /usr/app 
COPY package.json bun.lock ./ 
RUN bun install --frozen-lockfile 
COPY . . 

# The server bundle validates its configuration while building. These values
# are deliberately non-secret and scoped to this command in the discarded stage.
RUN DATABASE_URL=postgresql://build:build@localhost:5432/build \
  BETTER_AUTH_URL=https://build.invalid \
  BETTER_AUTH_SECRET=build-only-auth-secret-000000000000 \
  KEYCLOAK_ISSUER=https://build.invalid/realms/build \
  KEYCLOAK_CLIENT_ID=build \
  KEYCLOAK_CLIENT_SECRET=build-only \
  DEVICE_JWT_SECRET=build-only-device-secret-0000000000 \
  bun run build

FROM base AS deploy
WORKDIR /usr/app
ENV NODE_ENV=production \
  PORT=3000 \
  HOST=0.0.0.0
COPY --from=builder --chown=bun:bun /usr/app/package.json /usr/app/bun.lock ./
RUN bun install --frozen-lockfile --production
COPY --from=builder --chown=bun:bun /usr/app/.output ./.output
# for prisma migration
COPY --from=builder --chown=bun:bun /usr/app/prisma ./prisma
COPY --from=builder --chown=bun:bun /usr/app/prisma.config.ts ./
EXPOSE 3000
USER bun
ENTRYPOINT [ "bun" ]
CMD ["./.output/server/index.mjs"]
