#!/usr/bin/env bash
set -euo pipefail

# Run: bash scripts/request-device-token.sh esp32-01
# You will be prompted for the device secret. Requires only Bash and curl.
API_URL="${API_URL:-http://localhost:3000}"
DEVICE_ID="${1:-esp32-01}"

if [[ "$DEVICE_ID" == "--help" ]]; then
  echo "Usage: bash scripts/request-device-token.sh [device-id]"
  echo "Default device: esp32-01. Default API: http://localhost:3000."
  echo "Override API_URL or supply DEVICE_SECRET through environment variables."
  exit 0
fi

if [[ -z "${DEVICE_SECRET:-}" ]]; then
  read -r -s -p "Device secret for $DEVICE_ID: " DEVICE_SECRET
  printf '\n' >&2
fi

# Escape JSON strings so quotes and backslashes in a secret remain valid.
json_string() {
  local value="$1"
  if [[ "$value" =~ [[:cntrl:]] ]]; then
    echo "Device IDs and secrets must not contain control characters." >&2
    return 1
  fi
  value="${value//\\/\\\\}"
  value="${value//\"/\\\"}"
  printf '"%s"' "$value"
}

device_id_json="$(json_string "$DEVICE_ID")"
device_secret_json="$(json_string "$DEVICE_SECRET")"

# POST the credentials. Print the API response, including access_token.
echo "Requesting a token for $DEVICE_ID from ${API_URL%/} ..." >&2
curl --silent --show-error --fail-with-body --max-time 30 \
  --header 'Content-Type: application/json' \
  --data-binary @- \
  "${API_URL%/}/api/devices/token" <<JSON
{"device_id":$device_id_json,"device_secret":$device_secret_json}
JSON
printf '\n'
