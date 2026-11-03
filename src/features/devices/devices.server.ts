import { ORPCError } from "@orpc/server";
import type { z } from "zod";
import { prisma } from "#/db";
import { Prisma } from "#/generated/prisma/client";
import {
	generateDeviceSecret,
	hashProvidedDeviceSecret,
} from "./device-secrets.server";
import type {
	deviceFields,
	listInput,
	registerDeviceInput,
} from "./devices.types";

export const publicDeviceSelect = {
	id: true,
	deviceId: true,
	serialNumber: true,
	mqttUsername: true,
	status: true,
	firmwareVersion: true,
	productModel: true,
	createdAt: true,
	lastTokenIssuedAt: true,
	revokedAt: true,
} satisfies Prisma.DeviceSelect;
type PublicDevice = Prisma.DeviceGetPayload<{
	select: typeof publicDeviceSelect;
}>;
export function toDeviceDto(device: PublicDevice) {
	return {
		...device,
		createdAt: device.createdAt.toISOString(),
		lastTokenIssuedAt: device.lastTokenIssuedAt?.toISOString() ?? null,
		revokedAt: device.revokedAt?.toISOString() ?? null,
	};
}
export async function listDevices(input: z.infer<typeof listInput>) {
	const where: Prisma.DeviceWhereInput = {
		status: input.status,
		...(input.search
			? {
					OR: ["deviceId", "serialNumber", "mqttUsername", "productModel"].map(
						(field) => ({
							[field]: { contains: input.search, mode: "insensitive" },
						}),
					),
				}
			: {}),
	};
	const [devices, total] = await prisma.$transaction([
		prisma.device.findMany({
			where,
			select: publicDeviceSelect,
			skip: (input.page - 1) * input.pageSize,
			take: input.pageSize,
			orderBy: [{ createdAt: "desc" }, { id: "desc" }],
		}),
		prisma.device.count({ where }),
	]);
	return { devices: devices.map(toDeviceDto), total };
}
export async function withDeviceErrors<T>(
	operation: () => Promise<T>,
): Promise<T> {
	try {
		return await operation();
	} catch (error) {
		if (
			error instanceof Prisma.PrismaClientKnownRequestError &&
			error.code === "P2002"
		)
			throw new ORPCError("CONFLICT", {
				message: "Device ID, serial number or MQTT username already exists.",
			});
		throw error;
	}
}
export async function registerDevice(
	input: z.infer<typeof registerDeviceInput>,
	actorId: string,
) {
	const { secret, ...fields } = input;
	const credential = secret
		? { secret, hash: await hashProvidedDeviceSecret(secret) }
		: generateDeviceSecret();
	return withDeviceErrors(() =>
		prisma.$transaction(async (tx) => {
			const device = await tx.device.create({
				data: { ...fields, deviceSecretHash: credential.hash },
				select: publicDeviceSelect,
			});
			await tx.auditEvent.create({
				data: {
					actorId,
					action: "device.registered",
					resourceId: device.id,
					outcome: "success",
				},
			});
			return { device: toDeviceDto(device), secret: credential.secret };
		}),
	);
}
export async function updateDevice(
	id: string,
	input: Pick<
		z.infer<typeof deviceFields>,
		"serialNumber" | "firmwareVersion" | "productModel"
	>,
	actorId: string,
) {
	return withDeviceErrors(() =>
		prisma.$transaction(async (tx) => {
			const result = await tx.device.updateMany({
				where: { id, status: { not: "revoked" } },
				data: input,
			});
			if (!result.count)
				throw new ORPCError("CONFLICT", {
					message:
						"Device is missing or revoked. Reactivate revoked devices first.",
				});
			await tx.auditEvent.create({
				data: {
					actorId,
					action: "device.updated",
					resourceId: id,
					outcome: "success",
				},
			});
			return toDeviceDto(
				await tx.device.findUniqueOrThrow({
					where: { id },
					select: publicDeviceSelect,
				}),
			);
		}),
	);
}
export async function setDeviceStatus(
	id: string,
	status: "active" | "disabled" | "revoked",
	actorId: string,
) {
	return prisma.$transaction(async (tx) => {
		const result = await tx.device.updateMany({
			where: {
				id,
				...(status === "active" ? {} : { status: { not: "revoked" as const } }),
			},
			data: { status, revokedAt: status === "revoked" ? new Date() : null },
		});
		if (!result.count)
			throw new ORPCError("CONFLICT", {
				message:
					"Device is missing or revoked. Reactivate revoked devices first.",
			});
		await tx.auditEvent.create({
			data: {
				actorId,
				action: `device.${status}`,
				resourceId: id,
				outcome: "success",
			},
		});
		return toDeviceDto(
			await tx.device.findUniqueOrThrow({
				where: { id },
				select: publicDeviceSelect,
			}),
		);
	});
}
export async function rotateDeviceSecret(id: string, actorId: string) {
	const credential = generateDeviceSecret();
	return prisma.$transaction(async (tx) => {
		const result = await tx.device.updateMany({
			where: { id, status: { not: "revoked" } },
			data: { deviceSecretHash: credential.hash },
		});
		if (!result.count)
			throw new ORPCError("CONFLICT", {
				message:
					"Device is missing or revoked. Reactivate revoked devices first.",
			});
		await tx.auditEvent.create({
			data: {
				actorId,
				action: "device.secret.rotated",
				resourceId: id,
				outcome: "success",
			},
		});
		return {
			device: toDeviceDto(
				await tx.device.findUniqueOrThrow({
					where: { id },
					select: publicDeviceSelect,
				}),
			),
			secret: credential.secret,
		};
	});
}
