import { z } from "zod";

export const auditOutcome = z.enum(["success", "denied"]);
export const auditListInput = z.strictObject({
	search: z.string().trim().max(100).default(""),
	outcome: auditOutcome.optional(),
	page: z.number().int().min(1).max(100000).default(1),
	pageSize: z.number().int().min(1).max(100).default(20),
});
export const auditEventDto = z.strictObject({
	id: z.uuid(),
	actorId: z.string().nullable(),
	actorLabel: z.string(),
	actorKind: z.enum(["user", "device", "unknown", "anonymous"]),
	action: z.string(),
	resourceId: z.string().nullable(),
	outcome: z.string(),
	createdAt: z.string(),
});
export type AuditEventDto = z.infer<typeof auditEventDto>;
