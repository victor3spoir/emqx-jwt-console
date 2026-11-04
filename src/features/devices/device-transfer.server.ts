import { ORPCError } from "@orpc/server";
import type { z } from "zod";
import { prisma } from "#/db";
import {
	generateDeviceSecret,
	hashProvidedDeviceSecret,
} from "./device-secrets.server";
import {
	type exportDevicesInput,
	type ImportDeviceRow,
	MAX_EXPORT_ROWS,
} from "./device-transfer.types";
import {
	publicDeviceSelect,
	toDeviceDto,
	withDeviceErrors,
} from "./devices.server";

export async function importDevices(rows: ImportDeviceRow[], actorId: string) {
	// Hash before entering the transaction so slow password hashing holds no DB locks.
	const prepared: Array<
		Omit<ImportDeviceRow, "secret"> & {
			deviceSecret: string;
			deviceSecretHash: string;
		}
	> = [];
	for (const row of rows) {
		const { secret, ...fields } = row;
		const credential = secret
			? { secret, hash: await hashProvidedDeviceSecret(secret) }
			: generateDeviceSecret();
		prepared.push({
			...fields,
			deviceSecret: credential.secret,
			deviceSecretHash: credential.hash,
		});
	}
	return withDeviceErrors(() =>
		prisma.$transaction(
			async (tx) => {
				const existing = await tx.device.findMany({
					where: {
						OR: [
							{ deviceId: { in: rows.map((row) => row.deviceId) } },
							{ serialNumber: { in: rows.map((row) => row.serialNumber) } },
							{ mqttUsername: { in: rows.map((row) => row.mqttUsername) } },
						],
					},
					select: { deviceId: true, serialNumber: true, mqttUsername: true },
				});
				for (const [index, row] of rows.entries()) {
					for (const field of [
						"deviceId",
						"serialNumber",
						"mqttUsername",
					] as const) {
						if (existing.some((device) => device[field] === row[field])) {
							throw new ORPCError("CONFLICT", {
								message: `Row ${index + 2}: ${field} already exists. No devices were imported.`,
							});
						}
					}
				}
				const ids = [];
				for (const device of prepared) {
					const created = await tx.device.create({
						data: {
							...device,
							revokedAt: device.status === "revoked" ? new Date() : null,
						},
						select: { id: true },
					});
					ids.push(created.id);
				}
				await tx.auditEvent.createMany({
					data: ids.map((id) => ({
						actorId,
						action: "device.imported",
						resourceId: id,
						outcome: "success",
					})),
				});
				return { imported: ids.length };
			},
			{ timeout: 20000 },
		),
	);
}

export async function exportDevices(
	input: z.infer<typeof exportDevicesInput>,
	actorId: string,
) {
	const where = {
		status: input.status,
		...(input.search
			? {
					OR: ["deviceId", "serialNumber", "mqttUsername", "productModel"].map(
						(field) => ({
							[field]: { contains: input.search, mode: "insensitive" as const },
						}),
					),
				}
			: {}),
	};
	return prisma.$transaction(async (tx) => {
		const devices = await tx.device.findMany({
			where,
			select: { ...publicDeviceSelect, deviceSecret: input.includeSecrets },
			orderBy: [{ createdAt: "desc" }, { id: "desc" }],
			take: MAX_EXPORT_ROWS + 1,
		});
		if (devices.length > MAX_EXPORT_ROWS) {
			throw new ORPCError("BAD_REQUEST", {
				message: `Export is limited to ${MAX_EXPORT_ROWS} devices. Narrow your filters and try again.`,
			});
		}
		await tx.auditEvent.create({
			data: {
				actorId,
				action: input.includeSecrets
					? "devices.secrets.exported"
					: "devices.exported",
				outcome: "success",
			},
		});
		return {
			devices: devices.map((device) => ({
				...toDeviceDto(device),
				...(input.includeSecrets ? { secret: device.deviceSecret } : {}),
			})),
		};
	});
}
