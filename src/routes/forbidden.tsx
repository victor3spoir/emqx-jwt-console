import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { Button } from "#/components/ui/button";
import { SignOutButton } from "#/features/auth/sign-out-button";
import { client } from "#/orpc/client";

export const Route = createFileRoute("/forbidden")({
	beforeLoad: async () => {
		const session = await client.session({});
		if (!session) throw redirect({ to: "/signin" });
		if (session.isAdmin) throw redirect({ to: "/console" });
	},
	headers: () => ({ "Cache-Control": "private, no-store" }),
	component: ForbiddenPage,
});

function ForbiddenPage() {
	return (
		<main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center gap-6 px-6 py-16">
			<p className="text-sm font-medium tracking-widest text-primary uppercase">
				EMQX Device Console
			</p>
			<h1 className="font-heading text-3xl">Administrator access required</h1>
			<p className="text-muted-foreground">
				Your identity is valid, but it does not have the required Keycloak
				administrator role.
			</p>
			<div className="flex flex-wrap gap-3">
				<SignOutButton />
				<Button asChild variant="ghost">
					<Link to="/">Return home</Link>
				</Button>
			</div>
		</main>
	);
}
