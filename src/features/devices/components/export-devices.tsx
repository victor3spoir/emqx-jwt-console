import { IconDownload } from "@tabler/icons-react";
import { useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "#/components/ui/alert";
import { Button } from "#/components/ui/button";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "#/components/ui/dialog";
import {
	Field,
	FieldDescription,
	FieldGroup,
	FieldLabel,
} from "#/components/ui/field";
import { Switch } from "#/components/ui/switch";
import { client } from "#/orpc/client";
import { downloadDeviceFile } from "../device-file-download";
import type { DeviceFileFormat } from "../device-files";
import { MAX_EXPORT_ROWS } from "../device-transfer.types";
import type { DeviceDto } from "../devices.types";

export function ExportDevices({
	search,
	status,
	total,
}: {
	search: string;
	status?: DeviceDto["status"];
	total: number;
}) {
	const [open, setOpen] = useState(false);
	const [format, setFormat] = useState<DeviceFileFormat>("csv");
	const [includeSecrets, setIncludeSecrets] = useState(false);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState("");
	async function download() {
		setBusy(true);
		setError("");
		try {
			const { createDeviceFile } = await import("../device-files");
			const result = await client.devices.export({
				search,
				status,
				includeSecrets,
			});
			downloadDeviceFile(
				createDeviceFile(result.devices, format, includeSecrets),
				`devices-${new Date().toISOString().slice(0, 10)}`,
				format,
			);
			toast.success(`${result.devices.length} devices exported.`);
			setOpen(false);
			setIncludeSecrets(false);
		} catch (failure) {
			setError(
				failure instanceof Error
					? failure.message
					: "Export failed. Please try again.",
			);
		} finally {
			setBusy(false);
		}
	}
	return (
		<Dialog
			open={open}
			onOpenChange={(value) => {
				if (!busy) {
					setOpen(value);
					setIncludeSecrets(false);
					setError("");
				}
			}}
		>
			<DialogTrigger asChild>
				<Button variant="outline" disabled={!total}>
					<IconDownload data-icon="inline-start" />
					Export
				</Button>
			</DialogTrigger>
			<DialogContent showCloseButton={!busy}>
				<DialogHeader>
					<DialogTitle>Export devices</DialogTitle>
					<DialogDescription>
						Download all {total} devices matching the current filters, across
						every page. Limit: {MAX_EXPORT_ROWS} devices per export.
					</DialogDescription>
				</DialogHeader>
				<FieldGroup>
					<Field>
						<FieldLabel htmlFor="device-export-format">File format</FieldLabel>
						<select
							id="device-export-format"
							className="h-8 rounded-md border border-input bg-surface-inset px-2 text-sm"
							value={format}
							disabled={busy}
							onChange={(event) =>
								setFormat(event.target.value as DeviceFileFormat)
							}
						>
							<option value="csv">CSV (.csv)</option>
							<option value="xlsx">Excel (.xlsx)</option>
						</select>
					</Field>
					<Field>
						<FieldLabel htmlFor="device-export-secrets">
							Include device secrets
						</FieldLabel>
						<Switch
							id="device-export-secrets"
							checked={includeSecrets}
							disabled={busy}
							onCheckedChange={setIncludeSecrets}
							aria-describedby="device-export-secrets-help"
						/>
						<FieldDescription id="device-export-secrets-help">
							Secrets are excluded by default. Enable this only when you need
							credentials for provisioning or migration.
						</FieldDescription>
					</Field>
				</FieldGroup>
				{includeSecrets && (
					<Alert>
						<AlertDescription>
							This file will contain provisioning secrets. Store it securely.
							Older devices with hash-only credentials have a blank secret.
						</AlertDescription>
					</Alert>
				)}
				{error && (
					<Alert variant="destructive">
						<AlertDescription role="alert">{error}</AlertDescription>
					</Alert>
				)}
				<DialogFooter>
					<DialogClose asChild>
						<Button variant="outline" disabled={busy}>
							Cancel
						</Button>
					</DialogClose>
					<Button
						disabled={busy || total > MAX_EXPORT_ROWS}
						onClick={() => void download()}
					>
						{busy ? "Exporting…" : "Download file"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
