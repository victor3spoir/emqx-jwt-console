import { IconMoon, IconSun } from "@tabler/icons-react";
import { useRouteContext, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "#/components/ui/button";
import { themeCookieName } from "./theme.types";

export function ThemeToggle() {
	const { theme } = useRouteContext({ from: "__root__" });
	const router = useRouter();
	const [pending, setPending] = useState(false);
	const next = theme === "dark" ? "light" : "dark";
	return (
		<Button
			type="button"
			variant="outline"
			disabled={pending}
			aria-label={`Switch to ${next} theme`}
			onClick={async () => {
				// biome-ignore lint/suspicious/noDocumentCookie: A whitelisted, non-sensitive preference cookie supports SSR and browsers without Cookie Store API.
				document.cookie = `${themeCookieName}=${next}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
				document.documentElement.classList.remove("dark", "light");
				document.documentElement.classList.add(next);
				setPending(true);
				try {
					await router.invalidate();
				} catch {
					window.location.reload();
				}
				setPending(false);
			}}
		>
			{next === "light" ? (
				<IconSun data-icon="inline-start" aria-hidden="true" />
			) : (
				<IconMoon data-icon="inline-start" aria-hidden="true" />
			)}
			{next === "light" ? "Light theme" : "Dark theme"}
		</Button>
	);
}
