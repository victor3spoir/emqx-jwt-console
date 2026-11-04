import { IconUpload } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "#/components/ui/alert";
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
import {
	Field,
	FieldDescription,
	FieldGroup,
	FieldLabel,
} from "#/components/ui/field";
import { Input } from "#/components/ui/input";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "#/components/ui/table";
import { client } from "#/orpc/client";
import { downloadDeviceFile } from "../device-file-download";
import type { DeviceFileFormat, DeviceFilePreview } from "../device-files";
import {
	MAX_DEVICE_FILE_BYTES,
	MAX_IMPORT_ROWS,
} from "../device-transfer.types";

export function ImportDevices() {
	const [open, setOpen] = useState(false);
	const [busy, setBusy] = useState(false);
	const [preview, setPreview] = useState<DeviceFilePreview | null>(null);
	const [error, setError] = useState("");
	const queryClient = useQueryClient();
	function changeOpen(value: boolean) {
		if (busy) return;
		setOpen(value);
		setPreview(null);
		setError("");
	}
	async function selectFile(file?: File) {
		setPreview(null);
		setError("");
		if (!file) return;
		setBusy(true);
		try {
			if (file.size > MAX_DEVICE_FILE_BYTES)
				throw new Error("Choose a file no larger than 2 MB.");
			const { parseDeviceFile } = await import("../device-files");
			setPreview(
				parseDeviceFile(new Uint8Array(await file.arrayBuffer()), file.name),
			);
		} catch (failure) {
			setError(
				failure instanceof Error
					? failure.message
					: "Unable to read this file.",
			);
		} finally {
			setBusy(false);
		}
	}
	async function template(format: DeviceFileFormat) {
		try {
			const { createDeviceTemplate } = await import("../device-files");
			downloadDeviceFile(
				createDeviceTemplate(format),
				"devices-template",
				format,
			);
		} catch {
			toast.error("Unable to download the template. Please try again.");
		}
	}
	async function importRows() {
		if (!preview || preview.errors.length || busy) return;
		setBusy(true);
		setError("");
		try {
			const result = await client.devices.import({ rows: preview.rows });
			setPreview(null);
			setOpen(false);
			toast.success(`${result.imported} devices imported.`);
			await queryClient.invalidateQueries();
		} catch (failure) {
			setError(
				failure instanceof Error
					? failure.message
					: "Import failed. Please try again.",
			);
		} finally {
			setBusy(false);
		}
	}
	return (
		<AlertDialog open={open} onOpenChange={changeOpen}>
			<AlertDialogTrigger asChild>
				<Button variant="outline">
					<IconUpload data-icon="inline-start" />
					Import
				</Button>
			</AlertDialogTrigger>
			<AlertDialogContent className="max-h-[85dvh] overflow-y-auto data-[size=default]:sm:max-w-3xl">
				<AlertDialogHeader>
					<AlertDialogTitle>Import devices</AlertDialogTitle>
					<AlertDialogDescription>
						Add up to {MAX_IMPORT_ROWS} new devices from CSV or Excel. Existing
						identities cause the whole batch to be rejected. Blank secrets are
						generated and can be viewed afterward.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<FieldGroup>
					<Field>
						<FieldLabel htmlFor="device-import-file">Device file</FieldLabel>
						<Input
							id="device-import-file"
							type="file"
							accept=".csv,.xlsx"
							disabled={busy}
							onChange={(event) => void selectFile(event.target.files?.[0])}
							aria-describedby="device-import-help"
						/>
						<FieldDescription id="device-import-help">
							CSV or XLSX, up to 2 MB. Required columns: device_id and
							serial_number. MQTT username defaults to the device ID; status
							defaults to active.
						</FieldDescription>
					</Field>
				</FieldGroup>
				<div className="flex flex-wrap items-center gap-2">
					<span className="text-sm text-muted-foreground">
						Download a template:
					</span>
					<Button
						variant="outline"
						size="sm"
						disabled={busy}
						onClick={() => void template("csv")}
					>
						CSV template
					</Button>
					<Button
						variant="outline"
						size="sm"
						disabled={busy}
						onClick={() => void template("xlsx")}
					>
						Excel template
					</Button>
				</div>
				{error && (
					<Alert variant="destructive">
						<AlertDescription role="alert">{error}</AlertDescription>
					</Alert>
				)}
				{preview && (
					<div className="flex flex-col gap-3">
						<output className="text-sm">
							{preview.total} rows found ·{" "}
							{preview.errors.length
								? `${preview.errors.length} errors to fix`
								: "Ready to import"}
						</output>
						{preview.errors.length > 0 && (
							<Alert variant="destructive">
								<AlertDescription role="alert">
									<ul className="list-disc pl-4">
										{preview.errors.slice(0, 20).map((message) => (
											<li key={message}>{message}</li>
										))}
									</ul>
									{preview.errors.length > 20 && (
										<p>Showing the first 20 errors.</p>
									)}
								</AlertDescription>
							</Alert>
						)}
						{preview.rows.length > 0 && !preview.errors.length && (
							<div className="overflow-hidden rounded-md border">
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Device ID</TableHead>
											<TableHead>Serial number</TableHead>
											<TableHead>MQTT username</TableHead>
											<TableHead>Status</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{preview.rows.slice(0, 5).map((row) => (
											<TableRow key={row.deviceId}>
												<TableCell>{row.deviceId}</TableCell>
												<TableCell>{row.serialNumber}</TableCell>
												<TableCell>{row.mqttUsername}</TableCell>
												<TableCell>{row.status}</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</div>
						)}
						{preview.rows.length > 5 && (
							<p className="text-sm text-muted-foreground">
								Previewing the first 5 devices. All {preview.total} rows will be
								imported.
							</p>
						)}
					</div>
				)}
				<AlertDialogFooter>
					<AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
					<Button
						disabled={
							busy || !preview?.rows.length || Boolean(preview.errors.length)
						}
						onClick={() => void importRows()}
					>
						{busy
							? "Please wait…"
							: `Import${preview && !preview.errors.length ? ` ${preview.rows.length}` : ""} devices`}
					</Button>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
