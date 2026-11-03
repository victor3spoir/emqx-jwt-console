import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "#/components/ui/button";
import { authClient } from "#/lib/auth-client";

export function SignOutButton() {
	const router = useRouter();
	const queryClient = useQueryClient();
	const [pending, setPending] = useState(false);
	const [error, setError] = useState(false);
	return (
		<div className="flex items-center gap-3">
			{error && (
				<span role="alert" className="text-sm text-destructive">
					Sign-out failed. Try again.
				</span>
			)}
			<Button
				variant="outline"
				disabled={pending}
				onClick={async () => {
					setPending(true);
					setError(false);
					try {
						const result = await authClient.signOut();
						if (result.error) {
							setError(true);
							setPending(false);
							return;
						}
						queryClient.clear();
						await router.invalidate();
						await router.navigate({ to: "/signin" });
					} catch {
						setError(true);
					}
					setPending(false);
				}}
			>
				{pending ? "Signing out…" : "Sign out"}
			</Button>
		</div>
	);
}
