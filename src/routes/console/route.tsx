import {
	createFileRoute,
	Link,
	Outlet,
	redirect,
} from "@tanstack/react-router";
import { SignOutButton } from "#/features/auth/sign-out-button";
import { ThemeToggle } from "#/features/theme/theme-toggle";
import { client } from "#/orpc/client";

export const Route = createFileRoute("/console")({
	beforeLoad: async () => {
		const session = await client.session({});
		if (!session) throw redirect({ to: "/signin" });
		if (!session.isAdmin) throw redirect({ to: "/forbidden" });
		return { session };
	},
	headers: () => ({ "Cache-Control": "private, no-store" }),
	component: ConsoleLayout,
});

function ConsoleLayout() {
	const { session } = Route.useRouteContext();
	return (
		<div className="min-h-dvh">
			<header className="flex flex-wrap items-center justify-between gap-4 border-b bg-card px-6 py-4">
				<Link to="/" className="font-heading text-lg text-primary">
					EMQX Device Console
				</Link>
				<div className="flex items-center gap-4">
					<ThemeToggle />
					<span className="text-sm text-muted-foreground">{session.name}</span>
					<SignOutButton />
				</div>
			</header>
			<div className="mx-auto grid max-w-screen-2xl md:grid-cols-[200px_1fr]">
				<nav
					aria-label="Console"
					className="flex flex-col gap-1 border-b bg-sidebar p-4 md:min-h-[calc(100dvh-81px)] md:border-r md:border-b-0"
				>
					<Link
						to="/console/devices"
						search={{ search: "", status: undefined, page: 1 }}
						className="block rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent"
						activeOptions={{ includeSearch: false }}
						activeProps={{
							className: "bg-sidebar-accent text-sidebar-accent-foreground",
							"aria-current": "page",
						}}
					>
						Devices
					</Link>
					<Link
						to="/console/audit"
						search={{ search: "", outcome: undefined, page: 1 }}
						className="block rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent"
						activeOptions={{ includeSearch: false }}
						activeProps={{
							className: "bg-sidebar-accent text-sidebar-accent-foreground",
							"aria-current": "page",
						}}
					>
						Audit log
					</Link>
				</nav>
				<main id="main" className="min-w-0 p-6 md:p-8">
					<Outlet />
				</main>
			</div>
		</div>
	);
}
