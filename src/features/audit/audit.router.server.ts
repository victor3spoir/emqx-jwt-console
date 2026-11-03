import { z } from "zod";
import { adminProcedure } from "#/orpc/base.server";
import { listAuditEvents } from "./audit.server";
import { auditEventDto, auditListInput } from "./audit.types";

export const auditRouter = {
	list: adminProcedure
		.input(auditListInput)
		.output(
			z.strictObject({
				events: z.array(auditEventDto),
				total: z.number().int(),
			}),
		)
		.handler(({ input }) => listAuditEvents(input)),
};
