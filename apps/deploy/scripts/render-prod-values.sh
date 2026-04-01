#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
VALUES_FILE="${ROOT_DIR}/api/.platform/values_prod.yaml"

if [[ ! -f "${VALUES_FILE}" ]]; then
  echo "Missing ${VALUES_FILE}" >&2
  exit 1
fi

yaml_value() {
  local key="$1"
  awk -v target="${key}" '
    $0 ~ "^" target ":" { inside=1; next }
    inside == 1 && $1 == "value:" {
      sub(/^value:[[:space:]]*/, "", $0)
      gsub(/^"/, "", $0)
      gsub(/"$/, "", $0)
      print $0
      exit
    }
    inside == 1 && $0 ~ "^[a-z0-9_]+:" { exit }
  ' "${VALUES_FILE}"
}

cat <<EOF
ARENA_REQUIRE_AUTH=$(yaml_value arena_require_auth)
S3_BUCKET=$(yaml_value s3_bucket)
TELEGRAM_BOT_NAME=$(yaml_value telegram_bot_username)
EOF
