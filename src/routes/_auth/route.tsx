import {
	createFileRoute,
	Link,
	Outlet,
	redirect,
} from "@tanstack/react-router";
import { client } from "#/orpc/client";
export const Route = createFileRoute("/_auth")({
	beforeLoad: async () => {
		if (await client.session({})) throw redirect({ to: "/console" });
	},
	headers: () => ({ "Cache-Control": "private, no-store" }),
	component: () => (
		<main className="flex min-h-dvh flex-col items-center justify-center gap-8 px-4 py-12">
			<Link to="/" className="font-heading text-lg text-primary">
				EMQX Device Console
			</Link>
			<Outlet />
		</main>
	),
});
