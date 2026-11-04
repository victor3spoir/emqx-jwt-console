import { ORPCError, os } from "@orpc/server";
import { hasAdminRole } from "#/features/auth/auth-roles";
import { auth } from "#/lib/auth";

export const publicProcedure = os
	.$context<{ headers: Headers }>()
	.use(async ({ next, path }) => {
		const started = performance.now();
		let outcome = "error";
		try {
			const result = await next();
			outcome = "success";
			return result;
		} finally {
			console.info(
				JSON.stringify({
					operation: path.join("."),
					outcome,
					durationMs: Math.round(performance.now() - started),
				}),
			);
		}
	});
export const adminProcedure = publicProcedure.use(async ({ context, next }) => {
	const session = await auth.api.getSession({ headers: context.headers });
	if (!session) throw new ORPCError("UNAUTHORIZED");
	if (session.user.banned || !hasAdminRole(session.user.role))
		throw new ORPCError("FORBIDDEN");
	return next({ context: { actorId: session.user.id } });
});
