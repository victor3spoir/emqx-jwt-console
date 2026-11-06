import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";

import { AuthForm } from "#/features/auth/auth-form";
import { authCapabilitiesQueryOptions } from "#/features/auth/auth.queries";

export const Route = createFileRoute("/_auth/signup/")({
	loader: async ({ context }) => {
		const capabilities = await context.queryClient.ensureQueryData(
			authCapabilitiesQueryOptions(),
		);
		if (!capabilities.password) throw redirect({ to: "/signin" });
		return capabilities;
	},
	component: SignUpPage,
});

function SignUpPage() {
	const { data: capabilities } = useSuspenseQuery(
		authCapabilitiesQueryOptions(),
	);
	return <AuthForm capabilities={capabilities} mode="sign-up" />;
}
