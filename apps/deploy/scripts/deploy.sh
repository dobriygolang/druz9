#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DEPLOY_DIR="${ROOT_DIR}/deploy"
ENV_FILE="${DEPLOY_DIR}/.env.prod"
SECRETS_DIR="${DEPLOY_DIR}/runtime/secrets/prod"

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

export DATABASE_URL="$(tr -d '\r\n' < "${SECRETS_DIR}/database_url")"
export TELEGRAM_BOT_TOKEN="$(tr -d '\r\n' < "${SECRETS_DIR}/telegram_bot_token")"
export S3_ACCESS_KEY="$(tr -d '\r\n' < "${SECRETS_DIR}/s3_access_key")"
export S3_SECRET_KEY="$(tr -d '\r\n' < "${SECRETS_DIR}/s3_secret_key")"
export S3_ENDPOINT="${S3_ENDPOINT:-http://minio:9000}"
export MINIO_ROOT_USER="$(tr -d '\r\n' < "${SECRETS_DIR}/minio_root_user")"
export MINIO_ROOT_PASSWORD="$(tr -d '\r\n' < "${SECRETS_DIR}/minio_root_password")"
export S3_HOST="${S3_HOST:-s3.${APP_DOMAIN}}"
export MINIO_CONSOLE_HOST="${MINIO_CONSOLE_HOST:-minio.${APP_DOMAIN}}"
export COOKIE_DOMAIN="${COOKIE_DOMAIN:-${APP_DOMAIN}}"

bash "${DEPLOY_DIR}/scripts/render-prod-values.sh"

docker compose \
  --env-file "${ENV_FILE}" \
  -f "${DEPLOY_DIR}/docker-compose.prod.yml" \
  up -d --build --remove-orphans

docker image prune -f >/dev/null 2>&1 || true
