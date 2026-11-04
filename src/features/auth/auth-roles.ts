type KeycloakRoleSet = {
	roles?: unknown;
};

function includesRole(value: unknown, requiredRole: string) {
	if (!value || typeof value !== "object") return false;
	const roles = (value as KeycloakRoleSet).roles;
	return (
		Array.isArray(roles) &&
		roles.some((role) => typeof role === "string" && role === requiredRole)
	);
}

export function hasKeycloakRole(
	profile: Record<string, unknown>,
	clientId: string,
	requiredRole: string,
	roleSource: "client" | "realm",
) {
	if (roleSource === "realm")
		return includesRole(profile.realm_access, requiredRole);
	if (!profile.resource_access || typeof profile.resource_access !== "object")
		return false;
	return includesRole(
		(profile.resource_access as Record<string, unknown>)[clientId],
		requiredRole,
	);
}

export function hasAdminRole(role: string | null | undefined) {
	return role?.split(",").includes("admin") ?? false;
}
