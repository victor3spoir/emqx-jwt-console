import { ORPCError } from "@orpc/server";
import { SignJWT } from "jose";
import type { z } from "zod";
import { prisma } from "#/db";
import { getServerEnv } from "#/lib/env.server";
import { deviceRateLimiter } from "#/lib/rate-limit.server";
import { hashDeviceSecret, verifyDeviceSecret } from "./device-secrets.server";
import type { tokenInput } from "./devices.types";

export async function issueDeviceToken(input: z.infer<typeof tokenInput>) {
	deviceRateLimiter.consume(`device:${input.device_id}`, 10);
	const device = await prisma.device.findUnique({
		where: { deviceId: input.device_id },
	});
	const validSecret = await verifyDeviceSecret(
		input.device_secret,
		device?.deviceSecretHash ?? hashDeviceSecret("invalid-device-dummy-secret"),
	);
	if (!device || !validSecret || device.status !== "active") {
		await prisma.auditEvent.create({
			data: { action: "device.token.denied", outcome: "denied" },
		});
		throw new ORPCError("UNAUTHORIZED", {
			message: "Invalid device credentials or unavailable device.",
		});
	}
	const config = getServerEnv();
	const now = Math.floor(Date.now() / 1000);
	const token = await new SignJWT({
		username: device.mqttUsername,
		clientid: device.deviceId,
	})
		.setProtectedHeader({ alg: "HS256", typ: "JWT" })
		.setIssuedAt(now)
		.setExpirationTime(now + config.DEVICE_JWT_TTL_SECONDS)
		.sign(new TextEncoder().encode(config.DEVICE_JWT_SECRET));
	await prisma.$transaction(async (tx) => {
		// Recheck status and credential atomically after signing, guarding concurrent
		// rotation/revocation without serializing the secret or token to audit logs.
		const result = await tx.device.updateMany({
			where: {
				id: device.id,
				status: "active",
				deviceSecretHash: device.deviceSecretHash,
			},
			data: { lastTokenIssuedAt: new Date() },
		});
		if (!result.count)
			throw new ORPCError("UNAUTHORIZED", {
				message: "Invalid device credentials or unavailable device.",
			});
		await tx.auditEvent.create({
			data: {
				actorId: device.id,
				action: "device.token.issued",
				resourceId: device.id,
				outcome: "success",
			},
		});
	});
	return {
		access_token: token,
		token_type: "Bearer" as const,
		expires_in: config.DEVICE_JWT_TTL_SECONDS,
	};
}
