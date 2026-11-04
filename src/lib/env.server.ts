import { z } from "zod";

const schema = z.object({
	DATABASE_URL: z.url(),
	BETTER_AUTH_URL: z.url(),
	BETTER_AUTH_SECRET: z.string().min(32),
	DEVICE_JWT_SECRET: z.string().min(1),
	DEVICE_JWT_ALLOW_INSECURE_DEV_SECRET: z
		.enum(["true", "false"])
		.default("false"),
	AUTH_TRUSTED_IP_HEADER: z.enum(["x-forwarded-for", "x-real-ip"]).optional(),
	DEVICE_JWT_TTL_SECONDS: z.coerce
		.number()
		.int()
		.min(60)
		.max(86400)
		.default(3600),
});

export function getServerEnv(source: NodeJS.ProcessEnv = process.env) {
	const result = schema.safeParse(source);
	if (!result.success) {
		// Only field names: validation diagnostics must never disclose secret values.
		throw new Error(
			`Invalid server configuration: ${result.error.issues.map((issue) => issue.path.join(".")).join(", ")}`,
		);
	}
	if (
		source.NODE_ENV === "production" &&
		!result.data.BETTER_AUTH_URL.startsWith("https://")
	) {
		throw new Error("BETTER_AUTH_URL must use HTTPS in production");
	}
	if (
		result.data.DEVICE_JWT_SECRET.length < 32 &&
		!(
			source.NODE_ENV === "development" &&
			result.data.DEVICE_JWT_ALLOW_INSECURE_DEV_SECRET === "true"
		)
	) {
		throw new Error(
			"DEVICE_JWT_SECRET must have at least 32 characters; a short local broker key requires NODE_ENV=development and DEVICE_JWT_ALLOW_INSECURE_DEV_SECRET=true",
		);
	}
	if (result.data.BETTER_AUTH_SECRET === result.data.DEVICE_JWT_SECRET) {
		throw new Error("Authentication and device JWT secrets must be different");
	}
	return result.data;
}
