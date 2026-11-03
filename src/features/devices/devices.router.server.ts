import { z } from "zod";
import { adminProcedure } from "#/orpc/base.server";
import {
	listDevices,
	registerDevice,
	rotateDeviceSecret,
	setDeviceStatus,
	updateDevice,
} from "./devices.server";
import {
	deviceDto,
	deviceFields,
	deviceStatus,
	idInput,
	listInput,
	registerDeviceInput,
} from "./devices.types";

const secretOutput = z.object({ device: deviceDto, secret: z.string() });
export const devicesRouter = {
	list: adminProcedure
		.input(listInput)
		.output(z.object({ devices: z.array(deviceDto), total: z.number().int() }))
		.handler(({ input }) => listDevices(input)),
	register: adminProcedure
		.input(registerDeviceInput)
		.output(secretOutput)
		.handler(({ input, context }) => registerDevice(input, context.actorId)),
	update: adminProcedure
		.input(
			idInput.extend({
				fields: deviceFields.pick({
					serialNumber: true,
					firmwareVersion: true,
					productModel: true,
				}),
			}),
		)
		.output(deviceDto)
		.handler(({ input, context }) =>
			updateDevice(input.id, input.fields, context.actorId),
		),
	setStatus: adminProcedure
		.input(idInput.extend({ status: deviceStatus }))
		.output(deviceDto)
		.handler(({ input, context }) =>
			setDeviceStatus(input.id, input.status, context.actorId),
		),
	rotateSecret: adminProcedure
		.input(idInput)
		.output(secretOutput)
		.handler(({ input, context }) =>
			rotateDeviceSecret(input.id, context.actorId),
		),
};
