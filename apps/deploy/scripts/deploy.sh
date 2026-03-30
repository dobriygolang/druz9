#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DEPLOY_DIR="${ROOT_DIR}/deploy"
ENV_FILE="${DEPLOY_DIR}/.env.prod"
SECRETS_DIR="${DEPLOY_DIR}/runtime/secrets/prod"
VALUES_FILE="${DEPLOY_DIR}/runtime/values_prod.yaml"

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
  telegram_bot_token
do
  if [[ ! -s "${SECRETS_DIR}/${secret_name}" ]]; then
    echo "Missing secret file: ${SECRETS_DIR}/${secret_name}" >&2
    exit 1
  fi
done

set -a
source "${ENV_FILE}"
set +a

bash "${DEPLOY_DIR}/scripts/render-prod-values.sh"

if [[ ! -f "${VALUES_FILE}" ]]; then
  echo "Failed to render ${VALUES_FILE}" >&2
  exit 1
fi

docker compose \
  --env-file "${ENV_FILE}" \
  -f "${DEPLOY_DIR}/docker-compose.prod.yml" \
  up -d --build --remove-orphans

docker image prune -f >/dev/null 2>&1 || true
