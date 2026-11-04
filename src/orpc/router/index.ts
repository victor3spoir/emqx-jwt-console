import { z } from "zod";
import { auditRouter } from "#/features/audit/audit.router.server";
import { hasAdminRole } from "#/features/auth/auth-roles";
import { devicesRouter } from "#/features/devices/devices.router.server";
import { auth, authCapabilities } from "#/lib/auth";
import { publicProcedure } from "#/orpc/base.server";
export default {
	authCapabilities: publicProcedure
		.input(z.strictObject({}))
		.output(
			z.strictObject({
				keycloak: z.boolean(),
				password: z.boolean(),
			}),
		)
		.handler(() => authCapabilities),
	session: publicProcedure
		.input(z.strictObject({}))
		.output(
			z
				.strictObject({
					id: z.string(),
					name: z.string(),
					isAdmin: z.boolean(),
				})
				.nullable(),
		)
		.handler(async ({ context }) => {
			const session = await auth.api.getSession({ headers: context.headers });
			if (!session || session.user.banned) return null;
			return {
				id: session.user.id,
				name: session.user.name,
				isAdmin: hasAdminRole(session.user.role),
			};
		}),
	devices: devicesRouter,
	audit: auditRouter,
};
