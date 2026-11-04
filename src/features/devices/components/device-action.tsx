import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
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
import type { DeviceDto } from "../devices.types";
import { CredentialDialog } from "./credential-dialog";

type Action =
	| "active"
	| "disabled"
	| "revoked"
	| "rotate"
	| "secret"
	| "delete";
const labels: Record<Action, string> = {
	active: "Reactivate",
	disabled: "Disable",
	revoked: "Revoke",
	rotate: "Rotate secret",
	secret: "View secret",
	delete: "Delete",
};
export function DeviceAction({
	device,
	action,
	children,
}: {
	device: DeviceDto;
	action: Action;
	children?: React.ReactNode;
}) {
	const [open, setOpen] = useState(false);
	const [pending, setPending] = useState(false);
	const [credential, setCredential] = useState<{
		deviceId: string;
		secret: string;
	} | null>(null);
	const queryClient = useQueryClient();
	async function perform() {
		setPending(true);
		try {
			if (action === "rotate") {
				const result = await client.devices.rotateSecret({ id: device.id });
				setCredential({ deviceId: device.deviceId, secret: result.secret });
			} else if (action === "secret") {
				const result = await client.devices.getSecret({ id: device.id });
				setCredential({ deviceId: device.deviceId, secret: result.secret });
			} else if (action === "delete") {
				await client.devices.delete({ id: device.id });
			} else await client.devices.setStatus({ id: device.id, status: action });
			setOpen(false);
			await queryClient.invalidateQueries();
			toast.success(`${labels[action]} completed.`);
		} catch (failure) {
			toast.error(
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
					}
				}}
			>
				<AlertDialogTrigger asChild>
					<Button
						size={children ? "icon-sm" : "sm"}
						title={labels[action]}
						aria-label={`${labels[action]} ${device.deviceId}`}
						variant={
							action === "revoked" || action === "delete"
								? "destructive"
								: "outline"
						}
					>
						{children ?? labels[action]}
					</Button>
				</AlertDialogTrigger>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>
							{labels[action]} {device.deviceId}?
						</AlertDialogTitle>
						<AlertDialogDescription>
							{action === "delete"
								? "This permanently removes the device and its provisioning credentials. This cannot be undone."
								: action === "secret"
									? "The stored provisioning secret will be shown so you can copy it for later use."
									: action === "revoked"
										? "Future token requests will be denied until an administrator reactivates this device. Existing tokens and MQTT connections are not terminated."
										: action === "rotate"
											? "The current provisioning secret will stop working immediately. Save and provision the replacement secret. Existing JWTs remain valid."
											: action === "disabled"
												? "Future token requests will be denied until reactivated. Existing tokens and MQTT connections remain valid."
												: "Allow this device to request tokens again."}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
						<Button
							disabled={pending}
							variant={
								action === "revoked" || action === "delete"
									? "destructive"
									: "default"
							}
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
