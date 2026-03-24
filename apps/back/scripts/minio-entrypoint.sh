#!/bin/sh
set -e

file_env() {
  var_name="$1"
  file_var_name="${var_name}_FILE"

  eval "value=\${$var_name}"
  eval "file_value=\${$file_var_name}"

  if [ -n "$value" ] && [ -n "$file_value" ]; then
    echo "Both ${var_name} and ${file_var_name} are set" >&2
    exit 1
  fi

  if [ -n "$file_value" ]; then
    export "$var_name=$(tr -d '\r' < "$file_value" | tr -d '\n')"
  fi
}

file_env MINIO_ROOT_USER
file_env MINIO_ROOT_PASSWORD

exec minio "$@"
