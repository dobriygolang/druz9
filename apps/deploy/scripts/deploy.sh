#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DEPLOY_DIR="${ROOT_DIR}/deploy"
ENV_FILE="${DEPLOY_DIR}/.env.prod"
SECRETS_DIR="${DEPLOY_DIR}/runtime/secrets/prod"
VALUES_FILE="${ROOT_DIR}/api/.platform/values_prod.yaml"

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Missing ${ENV_FILE}" >&2
  exit 1
fi

for secret_name in \
  database_url \
  postgres_password \
  minio_root_user \
  minio_root_password \
  s3_access_key \
  s3_secret_key \
  telegram_bot_token \
  ai_review_api_key
do
  if [[ ! -s "${SECRETS_DIR}/${secret_name}" ]]; then
    echo "Missing secret file: ${SECRETS_DIR}/${secret_name}" >&2
    exit 1
  fi
done

set -a
source "${ENV_FILE}"
set +a

if [[ ! -f "${VALUES_FILE}" ]]; then
  echo "Missing ${VALUES_FILE}" >&2
  exit 1
fi

bash "${DEPLOY_DIR}/scripts/validate-config.sh"

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

export ARENA_REQUIRE_AUTH="${ARENA_REQUIRE_AUTH:-$(yaml_value arena_require_auth)}"
export S3_BUCKET="${S3_BUCKET:-$(yaml_value s3_bucket)}"
export TELEGRAM_BOT_NAME="${TELEGRAM_BOT_NAME:-$(yaml_value telegram_bot_username)}"

docker compose \
  --env-file "${ENV_FILE}" \
  -f "${DEPLOY_DIR}/docker-compose.prod.yml" \
  up -d --build --remove-orphans

docker image prune -f >/dev/null 2>&1 || true
