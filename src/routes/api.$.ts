import "#/polyfill";
import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { createFileRoute } from "@tanstack/react-router";
import { tokenRouter } from "#/features/devices/device-token.router.server";
import { boundedRequest, privateResponse } from "#/lib/http.server";
import { deviceRateLimiter } from "#/lib/rate-limit.server";

const handler = new OpenAPIHandler(tokenRouter);
async function handle({ request }: { request: Request }) {
	try {
		deviceRateLimiter.consume("global", 600);
	} catch {
		return privateResponse(
			new Response("Too many requests", {
				status: 429,
				headers: { "Retry-After": "60" },
			}),
		);
	}
	const bounded = await boundedRequest(request, 2048);
	if (!bounded)
		return privateResponse(new Response("Request too large", { status: 413 }));
	const { response } = await handler.handle(bounded, {
		prefix: "/api",
		context: { headers: request.headers },
	});
	const result = privateResponse(
		response ?? new Response("Not found", { status: 404 }),
	);
	if (result.status === 429) result.headers.set("Retry-After", "60");
	return result;
}
export const Route = createFileRoute("/api/$")({
	server: { handlers: { POST: handle } },
});
