import { orpc } from "#/orpc/client";

export function authCapabilitiesQueryOptions() {
	return orpc.authCapabilities.queryOptions({
		input: {},
		staleTime: Number.POSITIVE_INFINITY,
	});
}
