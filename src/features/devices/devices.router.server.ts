import { z } from "zod";
import { adminProcedure } from "#/orpc/base.server";
import { exportDevices, importDevices } from "./device-transfer.server";
import {
	exportDevicesInput,
	exportDevicesOutput,
	importDevicesInput,
} from "./device-transfer.types";
import {
	deleteDevice,
	getDeviceSecret,
	listDevices,
	registerDevice,
	rotateDeviceSecret,
	setDeviceStatus,
	updateDevice,
} from "./devices.server";
import {
	deviceDto,
	deviceFields,
	deviceSecretOutput,
	deviceStatus,
	idInput,
	listInput,
	registerDeviceInput,
} from "./devices.types";

const secretOutput = deviceSecretOutput;
export const devicesRouter = {
	import: adminProcedure
		.input(importDevicesInput)
		.output(z.object({ imported: z.number().int() }))
		.handler(({ input, context }) =>
			importDevices(input.rows, context.actorId),
		),
	export: adminProcedure
		.input(exportDevicesInput)
		.output(exportDevicesOutput)
		.handler(({ input, context }) => exportDevices(input, context.actorId)),
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
	getSecret: adminProcedure
		.input(idInput)
		.output(secretOutput)
		.handler(({ input, context }) =>
			getDeviceSecret(input.id, context.actorId),
		),
	delete: adminProcedure
		.input(idInput)
		.output(idInput)
		.handler(({ input, context }) => deleteDevice(input.id, context.actorId)),
};
