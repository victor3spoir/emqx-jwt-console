import { useForm } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
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
	FieldError,
	FieldGroup,
	FieldLabel,
} from "#/components/ui/field";
import { Input } from "#/components/ui/input";
import { client } from "#/orpc/client";
import {
	type DeviceDto,
	deviceFields,
	registrationSecret,
} from "../devices.types";
import { CredentialDetails } from "./credential-dialog";

const labels = {
	deviceId: "Device ID",
	serialNumber: "Serial number",
	mqttUsername: "MQTT username",
	productModel: "Product model",
	firmwareVersion: "Firmware version",
};
const keys = [
	"deviceId",
	"serialNumber",
	"mqttUsername",
	"productModel",
	"firmwareVersion",
] as const;

export function DeviceEditor({
	device,
	children,
}: {
	device?: DeviceDto;
	children: React.ReactNode;
}) {
	const [open, setOpen] = useState(false);
	const [credential, setCredential] = useState<{
		deviceId: string;
		secret: string;
	} | null>(null);
	return (
		<AlertDialog
			open={open}
			onOpenChange={(next) => {
				setOpen(next);
				if (!next) {
					setCredential(null);
				}
			}}
		>
			<AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
			<AlertDialogContent
				className="max-h-[85dvh] overflow-y-auto data-[size=default]:sm:max-w-lg"
				onEscapeKeyDown={(event) => event.preventDefault()}
			>
				{credential ? (
					<CredentialDetails credential={credential} />
				) : (
					<>
						<AlertDialogHeader>
							<AlertDialogTitle>
								{device ? "Edit device" : "Register device"}
							</AlertDialogTitle>
							<AlertDialogDescription>
								{device
									? "Update device information. Broker identity stays fixed."
									: "Create an identity using an existing secret or generate one."}
							</AlertDialogDescription>
						</AlertDialogHeader>
						{open && (
							<DeviceForm
								device={device}
								onSaved={(secret) => {
									toast.success(
										device
											? "Device changes saved."
											: "Device registered successfully.",
									);
									if (secret) {
										setCredential(secret);
									} else {
										setOpen(false);
									}
								}}
							/>
						)}
					</>
				)}
			</AlertDialogContent>
		</AlertDialog>
	);
}

function DeviceForm({
	device,
	onSaved,
}: {
	device?: DeviceDto;
	onSaved: (credential?: { deviceId: string; secret: string }) => void;
}) {
	const queryClient = useQueryClient();
	const form = useForm({
		defaultValues: {
			deviceId: device?.deviceId ?? "",
			serialNumber: device?.serialNumber ?? "",
			mqttUsername: device?.mqttUsername ?? "",
			productModel: device?.productModel ?? "",
			firmwareVersion: device?.firmwareVersion ?? "",
			secret: "",
		},
		validators: {
			onSubmit: deviceFields.extend({
				firmwareVersion: z.string().max(50),
				productModel: z.string().max(100),
				secret: registrationSecret,
			}),
		},
		onSubmit: async ({ value }) => {
			try {
				const fields = {
					...value,
					productModel: value.productModel.trim() || null,
					firmwareVersion: value.firmwareVersion.trim() || null,
				};
				if (device) {
					await client.devices.update({
						id: device.id,
						fields: {
							serialNumber: fields.serialNumber,
							productModel: fields.productModel,
							firmwareVersion: fields.firmwareVersion,
						},
					});
					onSaved();
				} else {
					const result = await client.devices.register(fields);
					onSaved({ deviceId: result.device.deviceId, secret: result.secret });
				}
				await queryClient.invalidateQueries();
			} catch (failure) {
				toast.error(
					failure instanceof Error ? failure.message : "Unable to save device.",
				);
			}
		},
	});
	return (
		<form
			onSubmit={(event) => {
				event.preventDefault();
				void form.handleSubmit();
			}}
		>
			<FieldGroup>
				{keys.map((key) => (
					<form.Field key={key} name={key}>
						{(field) => {
							const invalid = field.state.meta.errors.length > 0;
							return (
								<Field data-invalid={invalid}>
									<FieldLabel htmlFor={`device-${key}`}>
										{labels[key]}
										{(key === "productModel" || key === "firmwareVersion") &&
											" (optional)"}
									</FieldLabel>
									<Input
										id={`device-${key}`}
										name={key}
										required={
											key !== "productModel" && key !== "firmwareVersion"
										}
										disabled={
											!!device && (key === "deviceId" || key === "mqttUsername")
										}
										maxLength={key === "firmwareVersion" ? 50 : 100}
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(event) => {
											const value = event.target.value;
											if (
												key === "deviceId" &&
												!device &&
												form.getFieldValue("mqttUsername") === field.state.value
											)
												form.setFieldValue("mqttUsername", value);
											field.handleChange(value);
										}}
										aria-invalid={invalid}
										aria-describedby={
											invalid ? `device-${key}-error` : undefined
										}
									/>
									{invalid && (
										<FieldError
											id={`device-${key}-error`}
											errors={field.state.meta.errors}
										/>
									)}
								</Field>
							);
						}}
					</form.Field>
				))}
				{!device && (
					<form.Field name="secret">
						{(field) => {
							const invalid = field.state.meta.errors.length > 0;
							return (
								<Field data-invalid={invalid}>
									<FieldLabel htmlFor="device-existing-secret">
										Device secret (optional)
									</FieldLabel>
									<Input
										id="device-existing-secret"
										name="secret"
										type="password"
										autoComplete="new-password"
										minLength={12}
										maxLength={256}
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(event) => field.handleChange(event.target.value)}
										aria-invalid={invalid}
										aria-describedby="device-existing-secret-help device-existing-secret-error"
									/>
									<FieldDescription id="device-existing-secret-help">
										Enter your existing secret (12–256 characters), or leave
										blank to generate one.
									</FieldDescription>
									{invalid && (
										<FieldError
											id="device-existing-secret-error"
											errors={field.state.meta.errors}
										/>
									)}
								</Field>
							);
						}}
					</form.Field>
				)}
				<form.Subscribe selector={(state) => state.isSubmitting}>
					{(pending) => (
						<AlertDialogFooter>
							<AlertDialogCancel type="button" disabled={pending}>
								Close
							</AlertDialogCancel>
							<Button type="submit" disabled={pending}>
								{pending
									? "Saving…"
									: device
										? "Save changes"
										: "Register device"}
							</Button>
						</AlertDialogFooter>
					)}
				</form.Subscribe>
			</FieldGroup>
		</form>
	);
}
