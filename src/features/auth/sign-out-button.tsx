import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "#/components/ui/button";
import { authClient } from "#/lib/auth-client";

export function SignOutButton() {
	const router = useRouter();
	const queryClient = useQueryClient();
	const [pending, setPending] = useState(false);
	return (
		<div className="flex items-center gap-3">
			<Button
				variant="outline"
				disabled={pending}
				onClick={async () => {
					setPending(true);
					try {
						const result = await authClient.signOut();
						if (result.error) {
							toast.error("Sign-out failed. Try again.");
							setPending(false);
							return;
						}
						queryClient.clear();
						await router.invalidate();
						await router.navigate({ to: "/signin" });
					} catch {
						toast.error("Sign-out failed. Try again.");
					}
					setPending(false);
				}}
			>
				{pending ? "Signing out…" : "Sign out"}
			</Button>
		</div>
	);
}
