import { z } from "zod";
import { auditRouter } from "#/features/audit/audit.router.server";
import { devicesRouter } from "#/features/devices/devices.router.server";
import { auth } from "#/lib/auth";
import { publicProcedure } from "#/orpc/base.server";
export default {
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
				isAdmin: session.user.role?.split(",").includes("admin") ?? false,
			};
		}),
	devices: devicesRouter,
	audit: auditRouter,
};
