import { publicProcedure } from "#/orpc/base.server";
import { issueDeviceToken } from "./device-token.server";
import { tokenInput, tokenOutput } from "./devices.types";

export const tokenRouter = {
	token: publicProcedure
		.route({ method: "POST", path: "/devices/token" })
		.input(tokenInput)
		.output(tokenOutput)
		.handler(({ input }) => issueDeviceToken(input)),
};
