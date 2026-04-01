#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
LOCAL_VALUES="${ROOT_DIR}/api/.platform/values_local.yaml"
PROD_VALUES="${ROOT_DIR}/api/.platform/values_prod.yaml"

extract_keys() {
  local file="$1"
  grep -E '^[a-z0-9_]+:' "$file" | sed 's/:$//' | sort
}

if [[ ! -f "${LOCAL_VALUES}" ]]; then
  echo "Missing ${LOCAL_VALUES}" >&2
  exit 1
fi

if [[ ! -f "${PROD_VALUES}" ]]; then
  echo "Missing ${PROD_VALUES}" >&2
  exit 1
fi

local_keys="$(mktemp)"
prod_keys="$(mktemp)"
trap 'rm -f "${local_keys}" "${prod_keys}"' EXIT

extract_keys "${LOCAL_VALUES}" > "${local_keys}"
extract_keys "${PROD_VALUES}" > "${prod_keys}"

if ! diff -u "${local_keys}" "${prod_keys}" >/dev/null; then
  echo "values_local.yaml and values_prod.yaml diverged:" >&2
  diff -u "${local_keys}" "${prod_keys}" >&2 || true
  exit 1
fi

for required_key in cookie_domain s3_public_endpoint s3_bucket telegram_bot_username arena_require_auth; do
  if ! grep -q "^${required_key}:" "${PROD_VALUES}"; then
    echo "Missing required prod runtime key: ${required_key}" >&2
    exit 1
  fi
done

for required_key in ai_review_provider ai_review_base_url ai_review_model ai_review_timeout ai_review_max_image_bytes metrics_addr; do
  if ! grep -q "^${required_key}:" "${LOCAL_VALUES}" || ! grep -q "^${required_key}:" "${PROD_VALUES}"; then
    echo "Missing runtime key in values_local.yaml or values_prod.yaml: ${required_key}" >&2
    exit 1
  fi
done

for deprecated_key in database_url s3_access_key s3_secret_key; do
  if grep -q "^${deprecated_key}:" "${LOCAL_VALUES}"; then
    echo "Deprecated secret-like key must not live in api/.platform/values_local.yaml: ${deprecated_key}" >&2
    exit 1
  fi
  if grep -q "^${deprecated_key}:" "${PROD_VALUES}"; then
    echo "Deprecated secret-like key must not live in api/.platform/values_prod.yaml: ${deprecated_key}" >&2
    exit 1
  fi
done

echo "Config validation passed"
