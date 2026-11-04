import { randomUUID } from 'node:crypto'
import { hashPassword } from 'better-auth/crypto'
import { z } from 'zod'
import { prisma } from '../src/db'

async function main() {
  if (process.env.NODE_ENV !== 'development') throw new Error('Local administrator bootstrap is only available with NODE_ENV=development.')
  const input = z.object({
    BOOTSTRAP_ADMIN_EMAIL: z.email(),
    BOOTSTRAP_ADMIN_PASSWORD: z.string().min(12).max(128),
    BOOTSTRAP_ADMIN_NAME: z.string().trim().min(1).default('Administrator'),
  }).safeParse(process.env)
  if (!input.success) throw new Error('Set BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD (12–128 characters).')
  const password = await hashPassword(input.data.BOOTSTRAP_ADMIN_PASSWORD)
  await prisma.$transaction(async (tx) => {
    if (await tx.user.count({ where: { role: 'admin' } })) throw new Error('An admin already exists. Use an existing admin to manage access.')
    if (await tx.user.findUnique({ where: { email: input.data.BOOTSTRAP_ADMIN_EMAIL.toLowerCase() } })) throw new Error('This email is registered. Bootstrap requires a new email address.')
    const id = randomUUID()
    await tx.user.create({ data: {
      id, email: input.data.BOOTSTRAP_ADMIN_EMAIL.toLowerCase(), name: input.data.BOOTSTRAP_ADMIN_NAME, role: 'admin',
      accounts: { create: { id: randomUUID(), accountId: id, providerId: 'credential', password } },
    } })
    await tx.auditEvent.create({ data: { actorId: id, action: 'admin.bootstrapped', resourceId: id, outcome: 'success' } })
  }, { isolationLevel: 'Serializable' })
  console.info('Initial administrator created. Sign in through the application.')
}
main().catch((error) => { console.error(error instanceof Error ? error.message : 'Admin setup failed'); process.exitCode = 1 }).finally(() => prisma.$disconnect())
