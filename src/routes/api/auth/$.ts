import { createFileRoute } from "@tanstack/react-router";
import { auth } from "#/lib/auth";
import { boundedRequest, privateResponse } from "#/lib/http.server";

async function handle({ request }: { request: Request }) {
	const bounded = await boundedRequest(request);
	if (!bounded)
		return privateResponse(new Response("Request too large", { status: 413 }));
	return privateResponse(await auth.handler(bounded));
}

export const Route = createFileRoute("/api/auth/$")({
	server: {
		handlers: {
			GET: handle,
			POST: handle,
		},
	},
});
