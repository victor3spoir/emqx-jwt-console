import { z } from "zod";
export const deviceStatus = z.enum(["active", "disabled", "revoked"]);
const identifier = z
	.string()
	.trim()
	.min(1)
	.max(100)
	.regex(
		/^[A-Za-z0-9._:-]+$/,
		"Use letters, numbers, dots, underscores, colons or hyphens.",
	);
export const deviceFields = z.strictObject({
	deviceId: identifier,
	serialNumber: z.string().trim().min(1).max(100),
	mqttUsername: identifier,
	firmwareVersion: z.string().trim().max(50).nullable(),
	productModel: z.string().trim().max(100).nullable(),
});
export const registrationSecret = z.union([
	z.string().min(12, "Use at least 12 characters.").max(256),
	z.literal(""),
]);
export const registerDeviceInput = deviceFields.extend({
	secret: registrationSecret.optional(),
});
export const deviceDto = deviceFields.extend({
	id: z.uuid(),
	status: deviceStatus,
	createdAt: z.string(),
	lastTokenIssuedAt: z.string().nullable(),
	revokedAt: z.string().nullable(),
});
export type DeviceDto = z.infer<typeof deviceDto>;
export const listInput = z.strictObject({
	search: z.string().trim().max(100).default(""),
	status: deviceStatus.optional(),
	page: z.number().int().min(1).max(100000).default(1),
	pageSize: z.number().int().min(1).max(100).default(20),
});
export const idInput = z.strictObject({ id: z.uuid() });
export const deviceSecretOutput = z.strictObject({
	device: deviceDto,
	secret: z.string(),
});
export const tokenInput = z.strictObject({
	device_id: identifier,
	device_secret: z.string().min(1).max(256),
});
export const tokenOutput = z.strictObject({
	access_token: z.string(),
	token_type: z.literal("Bearer"),
	expires_in: z.number().int(),
});
