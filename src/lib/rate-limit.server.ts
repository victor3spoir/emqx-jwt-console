import { ORPCError } from "@orpc/server";

// One-instance deployment: fixed windows, bounded memory and no client IP trust.
export class RateLimiter {
	private buckets = new Map<string, { count: number; expires: number }>();
	constructor(private capacity = 10000) {}
	consume(key: string, limit: number, now = Date.now()) {
		let bucket = this.buckets.get(key);
		if (!bucket || bucket.expires <= now) {
			for (const [id, entry] of this.buckets)
				if (entry.expires <= now) this.buckets.delete(id);
			if (!bucket && this.buckets.size >= this.capacity)
				throw new ORPCError("TOO_MANY_REQUESTS");
			bucket = { count: 0, expires: now + 60000 };
			this.buckets.set(key, bucket);
		}
		if (++bucket.count > limit) throw new ORPCError("TOO_MANY_REQUESTS");
	}
}
export const deviceRateLimiter = new RateLimiter();
