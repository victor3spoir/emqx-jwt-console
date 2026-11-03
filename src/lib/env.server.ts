import { z } from "zod";

const schema = z.object({
	DATABASE_URL: z.url(),
	BETTER_AUTH_URL: z.url(),
	BETTER_AUTH_SECRET: z.string().min(32),
	DEVICE_JWT_SECRET: z.string().min(32),
	AUTH_TRUSTED_IP_HEADER: z.enum(["x-forwarded-for", "x-real-ip"]).optional(),
	DEVICE_JWT_TTL_SECONDS: z.coerce
		.number()
		.int()
		.min(60)
		.max(86400)
		.default(3600),
});

export function getServerEnv() {
	const result = schema.safeParse(process.env);
	if (!result.success) {
		// Only field names: validation diagnostics must never disclose secret values.
		throw new Error(
			`Invalid server configuration: ${result.error.issues.map((issue) => issue.path.join(".")).join(", ")}`,
		);
	}
	if (
		process.env.NODE_ENV === "production" &&
		!result.data.BETTER_AUTH_URL.startsWith("https://")
	) {
		throw new Error("BETTER_AUTH_URL must use HTTPS in production");
	}
	if (result.data.BETTER_AUTH_SECRET === result.data.DEVICE_JWT_SECRET) {
		throw new Error("Authentication and device JWT secrets must be different");
	}
	return result.data;
}
