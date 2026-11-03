import "#/polyfill";

import { RPCHandler } from "@orpc/server/fetch";
import { createFileRoute } from "@tanstack/react-router";
import { getServerEnv } from "#/lib/env.server";
import { boundedRequest, privateResponse } from "#/lib/http.server";
import router from "#/orpc/router";

const handler = new RPCHandler(router);

async function handle({ request }: { request: Request }) {
	const origin = request.headers.get("origin");
	const allowed = new URL(getServerEnv().BETTER_AUTH_URL).origin;
	if (
		(origin && origin !== allowed) ||
		(request.method !== "GET" &&
			request.headers.has("cookie") &&
			origin !== allowed)
	)
		return new Response("Forbidden", { status: 403 });
	const bounded = await boundedRequest(request);
	if (!bounded) return new Response("Request too large", { status: 413 });
	const { response } = await handler.handle(bounded, {
		prefix: "/api/rpc",
		context: { headers: request.headers },
	});

	return privateResponse(
		response ?? new Response("Not Found", { status: 404 }),
	);
}

export const Route = createFileRoute("/api/rpc/$")({
	server: {
		handlers: {
			HEAD: handle,
			GET: handle,
			POST: handle,
			PUT: handle,
			PATCH: handle,
			DELETE: handle,
		},
	},
});
