import { z } from "zod";
import { deviceDto, deviceStatus, registerDeviceInput } from "./devices.types";

export const MAX_IMPORT_ROWS = 200;
export const MAX_EXPORT_ROWS = 5000;
export const MAX_DEVICE_FILE_BYTES = 2 * 1024 * 1024;
export const importDeviceRow = registerDeviceInput.extend({
	status: deviceStatus.default("active"),
});
export type ImportDeviceRow = z.infer<typeof importDeviceRow>;

export const importDevicesInput = z
	.strictObject({ rows: z.array(importDeviceRow).min(1).max(MAX_IMPORT_ROWS) })
	.superRefine(({ rows }, context) => {
		for (const field of ["deviceId", "serialNumber", "mqttUsername"] as const) {
			const seen = new Set<string>();
			rows.forEach((row, index) => {
				if (seen.has(row[field])) {
					context.addIssue({
						code: "custom",
						path: ["rows", index, field],
						message: `Duplicate ${field} in this file.`,
					});
				}
				seen.add(row[field]);
			});
		}
	});

export const exportDevicesInput = z.strictObject({
	search: z.string().trim().max(100).default(""),
	status: deviceStatus.optional(),
	includeSecrets: z.boolean().default(false),
});
export const exportDevicesOutput = z.object({
	devices: z.array(deviceDto.extend({ secret: z.string().optional() })),
});
