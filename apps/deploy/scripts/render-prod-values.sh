#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TARGET_DIR="${ROOT_DIR}/deploy/runtime"
TARGET_FILE="${TARGET_DIR}/values_prod.yaml"

required_vars=(
  COOKIE_DOMAIN
  S3_PUBLIC_ENDPOINT
  S3_BUCKET
)

for var_name in "${required_vars[@]}"; do
  if [[ -z "${!var_name:-}" ]]; then
    echo "Missing required env: ${var_name}" >&2
    exit 1
  fi
done

mkdir -p "${TARGET_DIR}"

cat > "${TARGET_FILE}" <<EOF
server_http_addr:
  usage: "HTTP server listen address"
  group: "server"
  value: ":8080"
  type: "string"
  writable: false

server_http_timeout:
  usage: "HTTP server request timeout"
  group: "server"
  value: "30s"
  type: "duration"
  writable: false

server_grpc_addr:
  usage: "gRPC server listen address"
  group: "server"
  value: ":9000"
  type: "string"
  writable: false

server_grpc_timeout:
  usage: "gRPC server request timeout"
  group: "server"
  value: "30s"
  type: "duration"
  writable: false

arena_require_auth:
  usage: "Require authentication for arena endpoints"
  group: "arena"
  value: "${ARENA_REQUIRE_AUTH:-false}"
  type: "bool"
  writable: true

database_url:
  usage: "Primary PostgreSQL DSN"
  group: "data"
  value: ""
  type: "string"
  writable: false

cookie_domain:
  usage: "Session cookie domain"
  group: "auth"
  value: "${COOKIE_DOMAIN}"
  type: "string"
  writable: false

cookie_secure:
  usage: "Use secure cookies"
  group: "auth"
  value: "true"
  type: "bool"
  writable: false

cookie_same_site:
  usage: "Session cookie same-site policy"
  group: "auth"
  value: "None"
  type: "string"
  writable: false

telegram_bot_token:
  usage: "Telegram bot token"
  group: "external"
  value: ""
  type: "string"
  writable: false

s3_endpoint:
  usage: "S3 endpoint"
  group: "external"
  value: "${S3_ENDPOINT:-http://minio:9000}"
  type: "string"
  writable: false

s3_public_endpoint:
  usage: "Public S3 endpoint for signed URLs"
  group: "external"
  value: "${S3_PUBLIC_ENDPOINT}"
  type: "string"
  writable: false

s3_bucket:
  usage: "S3 bucket name"
  group: "external"
  value: "${S3_BUCKET}"
  type: "string"
  writable: false

s3_access_key:
  usage: "S3 access key"
  group: "external"
  value: ""
  type: "string"
  writable: false

s3_secret_key:
  usage: "S3 secret key"
  group: "external"
  value: ""
  type: "string"
  writable: false
EOF

echo "Rendered ${TARGET_FILE}"
