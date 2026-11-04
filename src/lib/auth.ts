import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { admin } from "better-auth/plugins";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { prisma } from "#/db";
import { getServerEnv } from "#/lib/env.server";

const config = getServerEnv();
export const auth = betterAuth({
	appName: "EMQX Device Console",
	baseURL: config.BETTER_AUTH_URL,
	secret: config.BETTER_AUTH_SECRET,
	database: prismaAdapter(prisma, {
		provider: "postgresql",
	}),
	emailAndPassword: {
		enabled: true,
		disableSignUp: true,
		minPasswordLength: 12,
	},
	rateLimit: {
		enabled: true,
		storage: "database",
		window: 60,
		max: 60,
		customRules: {
			"/sign-in/email": { window: 60, max: 5 },
		},
	},
	advanced: {
		ipAddress: {
			ipAddressHeaders: config.AUTH_TRUSTED_IP_HEADER
				? [config.AUTH_TRUSTED_IP_HEADER]
				: [],
		},
	},
	plugins: [admin(), tanstackStartCookies()],
});
