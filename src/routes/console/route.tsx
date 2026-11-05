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
		<div className="min-h-dvh bg-[radial-gradient(circle_at_top_right,color-mix(in_oklab,var(--ring)_8%,transparent),transparent_32rem)]">
			<header className="sticky top-0 z-40 flex min-h-16 flex-wrap items-center justify-between gap-3 border-b border-border/70 bg-background/80 px-5 py-3 backdrop-blur-xl supports-[backdrop-filter]:bg-background/70 md:px-6">
				<Link
					to="/"
					className="font-heading text-lg font-semibold tracking-[-0.02em] text-primary"
				>
					EMQX Device Console
				</Link>
				<div className="flex items-center gap-2.5">
					<ThemeToggle />
					<span className="hidden text-sm font-medium text-muted-foreground sm:inline">
						{session.name}
					</span>
					<SignOutButton />
				</div>
			</header>
			<div className="mx-auto grid max-w-screen-2xl md:grid-cols-[200px_1fr]">
				<nav
					aria-label="Console"
					className="flex flex-col gap-1.5 border-b border-sidebar-border/70 bg-sidebar/75 p-3 backdrop-blur-xl md:sticky md:top-16 md:h-[calc(100dvh-4rem)] md:border-r md:border-b-0 md:p-4"
				>
					<Link
						to="/console/devices"
						search={{ search: "", status: undefined, page: 1 }}
						className="block rounded-xl px-3 py-2.5 text-sm font-medium text-sidebar-foreground transition-[transform,background-color,color,box-shadow] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.98] hover:bg-sidebar-accent/70"
						activeOptions={{ includeSearch: false }}
						activeProps={{
							className:
								"bg-sidebar-accent text-sidebar-accent-foreground shadow-sm ring-1 ring-sidebar-border/60",
							"aria-current": "page",
						}}
					>
						Devices
					</Link>
					<Link
						to="/console/audit"
						search={{ search: "", outcome: undefined, page: 1 }}
						className="block rounded-xl px-3 py-2.5 text-sm font-medium text-sidebar-foreground transition-[transform,background-color,color,box-shadow] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.98] hover:bg-sidebar-accent/70"
						activeOptions={{ includeSearch: false }}
						activeProps={{
							className:
								"bg-sidebar-accent text-sidebar-accent-foreground shadow-sm ring-1 ring-sidebar-border/60",
							"aria-current": "page",
						}}
					>
						Audit log
					</Link>
				</nav>
				<main id="main" className="min-w-0 p-5 md:p-8 lg:p-10">
					<Outlet />
				</main>
			</div>
		</div>
	);
}
