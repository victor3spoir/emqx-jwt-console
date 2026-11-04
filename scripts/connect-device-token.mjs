// Called by request-device-token.sh. The token response arrives through stdin.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import mqtt from "mqtt";
import { decodeJwt } from "jose";

try {
  let input = "";
  for await (const chunk of process.stdin) {
    input += chunk;
    if (input.length > 16384) throw new Error("Token response is too large.");
  }
  const { access_token: token, token_type: type } = JSON.parse(input);
  if (typeof token !== "string" || type !== "Bearer") {
    throw new Error("The API did not return an access token.");
  }
  // These claims select the MQTT identity. EMQX verifies the JWT itself.
  const { clientid, username } = decodeJwt(token);
  if (typeof clientid !== "string" || typeof username !== "string") {
    throw new Error("The token is missing its MQTT client ID or username.");
  }
  const broker = process.env.BROKER_URL ?? "mqtts://localhost:8883";
  if (new URL(broker).protocol !== "mqtts:") {
    throw new Error("BROKER_URL must use mqtts:// for TLS.");
  }
  const ca = process.env.MQTT_CA
    ? readFileSync(process.env.MQTT_CA)
    : execFileSync("docker", [
        "exec", process.env.EMQX_CONTAINER ?? "emqx-broker-emqx-broker-01-1",
        "cat", "/opt/emqx/etc/certs/cacert.pem",
      ], { timeout: 10000, stdio: ["ignore", "pipe", "pipe"] });

  console.error(`2. Connecting to ${broker} as ${username} (client ID: ${clientid}) ...`);
  const client = mqtt.connect(broker, {
    clientId: clientid, username, password: token,
    ca, rejectUnauthorized: true, protocolVersion: 5,
    clean: true, reconnectPeriod: 0, connectTimeout: 10000,
  });
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      client.end(true);
      reject(new Error("MQTT connection check timed out after 15 seconds."));
    }, 15000);
    client.once("error", (error) => {
      clearTimeout(timer);
      client.end(true);
      reject(error);
    });
    client.once("connect", () => {
      console.error("3. Connected: EMQX accepted the access token; TLS certificate verified.");
      client.end(false, {}, () => {
        clearTimeout(timer);
        console.error("Connection check complete. Disconnected.");
        resolve();
      });
    });
  });
} catch (error) {
  console.error(`Connection check failed: ${error instanceof Error ? error.message : "Unknown error"}`);
  process.exitCode = 1;
}
