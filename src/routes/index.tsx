import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "#/components/ui/button";
export const Route = createFileRoute("/")({ component: Home });
function Home() {
	return (
		<main className="mx-auto flex min-h-dvh max-w-3xl flex-col justify-center gap-6 px-6 py-16">
			<p className="text-sm font-medium tracking-widest text-primary uppercase">
				EMQX Device Console
			</p>
			<h1 className="font-heading text-4xl leading-tight md:text-5xl">
				One place to manage
				<br />
				your device identities.
			</h1>
			<p className="max-w-lg text-lg leading-relaxed text-muted-foreground">
				Register devices, manage credentials, and control access to your MQTT
				infrastructure.
			</p>
			<div>
				<Button asChild size="lg">
					<Link to="/signin">Open console</Link>
				</Button>
			</div>
			<p className="mt-12 text-sm text-muted-foreground">
				Built for a single fleet. Controlled by your administrators.
			</p>
		</main>
	);
}
