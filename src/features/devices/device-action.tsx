import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "#/components/ui/alert-dialog";
import { Button } from "#/components/ui/button";
import { client } from "#/orpc/client";
import { CredentialDialog } from "./credential-dialog";
import type { DeviceDto } from "./devices.types";

type Action = "active" | "disabled" | "revoked" | "rotate";
const labels: Record<Action, string> = {
	active: "Reactivate",
	disabled: "Disable",
	revoked: "Revoke",
	rotate: "Rotate secret",
};
export function DeviceAction({
	device,
	action,
}: {
	device: DeviceDto;
	action: Action;
}) {
	const [open, setOpen] = useState(false);
	const [pending, setPending] = useState(false);
	const [error, setError] = useState("");
	const [credential, setCredential] = useState<{
		deviceId: string;
		secret: string;
	} | null>(null);
	const queryClient = useQueryClient();
	async function perform() {
		setPending(true);
		setError("");
		try {
			if (action === "rotate") {
				const result = await client.devices.rotateSecret({ id: device.id });
				setCredential({ deviceId: device.deviceId, secret: result.secret });
			} else await client.devices.setStatus({ id: device.id, status: action });
			setOpen(false);
			await queryClient.invalidateQueries();
		} catch (failure) {
			setError(
				failure instanceof Error
					? failure.message
					: "Operation failed. Try again.",
			);
		}
		setPending(false);
	}
	return (
		<>
			<AlertDialog
				open={open}
				onOpenChange={(value) => {
					if (!pending) {
						setOpen(value);
						setError("");
					}
				}}
			>
				<AlertDialogTrigger asChild>
					<Button
						size="sm"
						variant={action === "revoked" ? "destructive" : "outline"}
					>
						{labels[action]}
					</Button>
				</AlertDialogTrigger>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>
							{labels[action]} {device.deviceId}?
						</AlertDialogTitle>
						<AlertDialogDescription>
							{action === "revoked"
								? "Future token requests will be denied until an administrator reactivates this device. Existing tokens and MQTT connections are not terminated."
								: action === "rotate"
									? "The current provisioning secret will stop working immediately. Save and provision the replacement secret. Existing JWTs remain valid."
									: action === "disabled"
										? "Future token requests will be denied until reactivated. Existing tokens and MQTT connections remain valid."
										: "Allow this device to request tokens again."}
						</AlertDialogDescription>
					</AlertDialogHeader>
					{error && (
						<p role="alert" className="text-sm text-destructive">
							{error}
						</p>
					)}
					<AlertDialogFooter>
						<AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
						<Button
							disabled={pending}
							variant={action === "revoked" ? "destructive" : "default"}
							onClick={() => void perform()}
						>
							{pending ? "Working…" : labels[action]}
						</Button>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
			<CredentialDialog
				credential={credential}
				onClose={() => setCredential(null)}
			/>
		</>
	);
}
