import type { z } from "zod";
import { prisma } from "#/db";
import type { Prisma } from "#/generated/prisma/client";
import type { auditListInput } from "./audit.types";

export async function listAuditEvents(input: z.infer<typeof auditListInput>) {
	const where: Prisma.AuditEventWhereInput = {
		outcome: input.outcome,
		...(input.search
			? {
					OR: ["action", "actorId", "resourceId"].map((key) => ({
						[key]: { contains: input.search, mode: "insensitive" },
					})),
				}
			: {}),
	};
	const [events, total] = await prisma.$transaction(
		[
			prisma.auditEvent.findMany({
				where,
				select: {
					id: true,
					actorId: true,
					action: true,
					resourceId: true,
					outcome: true,
					createdAt: true,
				},
				orderBy: [{ createdAt: "desc" }, { id: "desc" }],
				skip: (input.page - 1) * input.pageSize,
				take: input.pageSize,
			}),
			prisma.auditEvent.count({ where }),
		],
		{ isolationLevel: "RepeatableRead" },
	);
	const actorIds = [
		...new Set(
			events.flatMap((event) => (event.actorId ? [event.actorId] : [])),
		),
	];
	// Resolve display labels in bounded batches; no account/session/secret fields.
	const [users, devices] = await Promise.all([
		prisma.user.findMany({
			where: { id: { in: actorIds } },
			select: { id: true, name: true },
		}),
		prisma.device.findMany({
			where: {
				id: {
					in: actorIds.filter((id) =>
						/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
							id,
						),
					),
				},
			},
			select: { id: true, deviceId: true },
		}),
	]);
	const userNames = new Map(users.map((user) => [user.id, user.name]));
	const deviceNames = new Map(
		devices.map((device) => [device.id, device.deviceId]),
	);
	return {
		total,
		events: events.map((event) => ({
			...event,
			createdAt: event.createdAt.toISOString(),
			actorLabel: event.actorId
				? (userNames.get(event.actorId) ??
					deviceNames.get(event.actorId) ??
					event.actorId)
				: "Anonymous / not identified",
			actorKind: !event.actorId
				? ("anonymous" as const)
				: deviceNames.has(event.actorId)
					? ("device" as const)
					: userNames.has(event.actorId)
						? ("user" as const)
						: ("unknown" as const),
		})),
	};
}
