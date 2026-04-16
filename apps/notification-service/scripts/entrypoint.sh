#!/bin/bash
set -e

file_env() {
  local var_name="$1"
  local file_var_name="${var_name}_FILE"
  local value="${!var_name}"
  local file_value="${!file_var_name}"

  if [[ -n "$value" && -n "$file_value" ]]; then
    echo "Both ${var_name} and ${file_var_name} are set" >&2
    exit 1
  fi

  if [[ -n "$file_value" ]]; then
    export "${var_name}=$(tr -d '\r' < "$file_value" | tr -d '\n')"
    unset "${file_var_name}"
  fi
}

file_env DATABASE_URL
RUN_DB_MIGRATIONS="${RUN_DB_MIGRATIONS:-true}"
GOOSE_TABLE="${GOOSE_TABLE:-notification_goose_db_version}"

echo "Waiting for PostgreSQL to be ready..."
until psql "$DATABASE_URL" -c "\q" >/dev/null 2>&1; do
  >&2 echo "PostgreSQL is unavailable - sleeping"
  sleep 1
done

echo "✓ PostgreSQL is ready"

if [[ "$RUN_DB_MIGRATIONS" == "true" ]]; then
  echo "Running goose migrations (table: ${GOOSE_TABLE})..."
  goose -table "$GOOSE_TABLE" -dir /app/scripts/migrations postgres "$DATABASE_URL" up
fi

echo "Starting application..."
exec /app/bin/notification-service
