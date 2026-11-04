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
} from "#/components/ui/alert-dialog";
import { Button } from "#/components/ui/button";
import { Field, FieldLabel } from "#/components/ui/field";
import { Input } from "#/components/ui/input";

type Credential = { deviceId: string; secret: string };

export function CredentialDialog({
	credential,
	onClose,
}: {
	credential: Credential | null;
	onClose: () => void;
}) {
	return (
		<AlertDialog
			open={!!credential}
			onOpenChange={(open) => {
				if (!open) onClose();
			}}
		>
			<AlertDialogContent onEscapeKeyDown={(event) => event.preventDefault()}>
				{credential && (
					<CredentialDetails key={credential.secret} credential={credential} />
				)}
			</AlertDialogContent>
		</AlertDialog>
	);
}

export function CredentialDetails({ credential }: { credential: Credential }) {
	const [copied, setCopied] = useState(false);
	return (
		<>
			<AlertDialogHeader>
				<AlertDialogTitle>Save this device secret</AlertDialogTitle>
				<AlertDialogDescription>
					Provision {credential.deviceId} with this secret. You can retrieve it
					again later from this device list.
				</AlertDialogDescription>
			</AlertDialogHeader>
			<Field>
				<FieldLabel htmlFor="device-secret">Device secret</FieldLabel>
				<Input
					id="device-secret"
					className="font-mono"
					readOnly
					value={credential.secret}
					autoComplete="off"
					spellCheck={false}
				/>
			</Field>
			<AlertDialogFooter>
				<Button
					type="button"
					variant="outline"
					onClick={async () => {
						try {
							await navigator.clipboard.writeText(credential.secret);
							setCopied(true);
							toast.success("Device secret copied to your clipboard.");
						} catch {
							toast.error(
								"Copy failed. Select the secret and copy it manually.",
							);
						}
					}}
				>
					{copied ? "Copied" : "Copy secret"}
				</Button>
				<AlertDialogCancel>I have saved the secret</AlertDialogCancel>
			</AlertDialogFooter>
		</>
	);
}
