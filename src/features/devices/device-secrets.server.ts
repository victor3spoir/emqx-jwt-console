import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";

function deriveKey(secret: string, salt: string): Promise<Buffer> {
	return new Promise((resolve, reject) => {
		scrypt(secret, salt, 32, (error, key) => {
			if (error) reject(error);
			else resolve(key);
		});
	});
}
// Machine-generated 256-bit secrets; never use this hash for human passwords.
export function hashDeviceSecret(secret: string) {
	return createHash("sha256").update(secret).digest("hex");
}
export function generateDeviceSecret() {
	const secret = randomBytes(32).toString("base64url");
	return { secret, hash: hashDeviceSecret(secret) };
}
// Supplied secrets may have less entropy than our generated credentials.
// Salted scrypt slows offline guessing while preserving the exact secret bytes.
export async function hashProvidedDeviceSecret(secret: string) {
	const salt = randomBytes(16).toString("hex");
	const hash = await deriveKey(secret, salt);
	return `scrypt:${salt}:${hash.toString("hex")}`;
}
export async function verifyDeviceSecret(secret: string, hash: string) {
	if (/^scrypt:[a-f0-9]{32}:[a-f0-9]{64}$/.test(hash)) {
		const [, salt, expected] = hash.split(":");
		const actual = await deriveKey(secret, salt);
		return timingSafeEqual(actual, Buffer.from(expected, "hex"));
	}
	const actual = Buffer.from(hashDeviceSecret(secret), "hex");
	const expected = Buffer.from(hash, "hex");
	return actual.length === expected.length && timingSafeEqual(actual, expected);
}
