import { prisma } from "#/db";
import { hasKeycloakRole } from "#/features/auth/auth-roles";
import { getServerEnv } from "#/lib/env.server";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { admin } from "better-auth/plugins";
import {
	type GenericOAuthConfig,
	genericOAuth,
	keycloak,
} from "better-auth/plugins/generic-oauth";
import { tanstackStartCookies } from "better-auth/tanstack-start";

const config = getServerEnv();

function createKeycloakProvider() {
	const { KEYCLOAK_ISSUER, KEYCLOAK_CLIENT_ID, KEYCLOAK_CLIENT_SECRET } =
		config;
	if (
		!config.KEYCLOAK_ENABLED ||
		!KEYCLOAK_ISSUER ||
		!KEYCLOAK_CLIENT_ID ||
		!KEYCLOAK_CLIENT_SECRET
	)
		return null;
	return {
		...keycloak({
			clientId: KEYCLOAK_CLIENT_ID,
			clientSecret: KEYCLOAK_CLIENT_SECRET,
			issuer: KEYCLOAK_ISSUER,
			postLogoutRedirectURI: config.BETTER_AUTH_URL,
			pkce: true,
			overrideUserInfo: true,
		}),
		requireIdTokenVerification: true,
		requireEmailVerification: true,
		mapProfileToUser: (profile) => ({
			role: hasKeycloakRole(
				profile,
				KEYCLOAK_CLIENT_ID,
				config.KEYCLOAK_ADMIN_ROLE,
				config.KEYCLOAK_ROLE_SOURCE,
			)
				? "admin"
				: "user",
		}),
	} satisfies GenericOAuthConfig<"keycloak">;
}

const keycloakProvider = createKeycloakProvider();

export const authCapabilities = {
	keycloak: config.KEYCLOAK_ENABLED,
	password: config.AUTH_EMAIL_PASSWORD_ENABLED,
};

export const auth = betterAuth({
	appName: "EMQX Device Console",
	baseURL: config.BETTER_AUTH_URL,
	secret: config.BETTER_AUTH_SECRET,
	database: prismaAdapter(prisma, {
		provider: "postgresql",
	}),
	emailAndPassword: {
		enabled: config.AUTH_EMAIL_PASSWORD_ENABLED,
		disableSignUp: true,
		minPasswordLength: 12,
	},
	account: {
		encryptOAuthTokens: true,
		accountLinking: {
			enabled: false,
		},
	},
	session: {
		expiresIn: 60 * 60,
		disableSessionRefresh: true,
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
		cookiePrefix: "emqx-device-console",
	},
	plugins: [
		admin(),
		...(keycloakProvider ? [genericOAuth({ config: [keycloakProvider] })] : []),
		tanstackStartCookies(),
	],
});
