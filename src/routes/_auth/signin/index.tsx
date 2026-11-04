import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { authCapabilitiesQueryOptions } from "#/features/auth/auth.queries";
import { AuthForm } from "#/features/auth/auth-form";

export const Route = createFileRoute("/_auth/signin/")({
	loader: ({ context }) =>
		context.queryClient.ensureQueryData(authCapabilitiesQueryOptions()),
	component: SignInPage,
});

function SignInPage() {
	const { data: capabilities } = useSuspenseQuery(
		authCapabilitiesQueryOptions(),
	);
	return <AuthForm capabilities={capabilities} />;
}
