// Bound actual streamed bytes, including requests without Content-Length.
export async function boundedRequest(request: Request, limit = 16384) {
	if (!request.body) return request;
	if (Number(request.headers.get("content-length")) > limit) return null;
	const reader = request.body.getReader();
	const chunks: Uint8Array[] = [];
	let size = 0;
	while (true) {
		const { done, value } = await reader.read();
		if (done) break;
		size += value.byteLength;
		if (size > limit) {
			await reader.cancel();
			return null;
		}
		chunks.push(value);
	}
	const body = new Uint8Array(size);
	let offset = 0;
	for (const chunk of chunks) {
		body.set(chunk, offset);
		offset += chunk.byteLength;
	}
	return new Request(request.url, {
		method: request.method,
		headers: request.headers,
		body,
		signal: request.signal,
	});
}
export function privateResponse(response: Response) {
	response.headers.set("Cache-Control", "private, no-store");
	response.headers.set("X-Content-Type-Options", "nosniff");
	return response;
}
