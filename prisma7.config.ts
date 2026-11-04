import 'dotenv/config'
import { defineConfig } from '@prisma/prisma7/config'


export default defineConfig({
  schema: './prisma/legacy/schema.prisma',
  migrations: {
    path: './prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: process.env.DATABASE_URL ?? '',
  },
})
