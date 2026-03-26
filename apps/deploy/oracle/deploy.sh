#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/druz9/apps}"
API_SERVICE_NAME="${API_SERVICE_NAME:-druz9-api}"

echo "[deploy] app dir: ${APP_DIR}"

cd "${APP_DIR}"

echo "[deploy] start infra"
cd api
cp -n .env.example .env || true
docker compose --env-file .env up -d postgres minio minio-init livekit postgres-exporter prometheus grafana

echo "[deploy] build backend"
make build

echo "[deploy] restart backend service: ${API_SERVICE_NAME}"
sudo systemctl restart "${API_SERVICE_NAME}"
sudo systemctl status "${API_SERVICE_NAME}" --no-pager --lines=20 || true

echo "[deploy] build frontend"
cd ../front
cp -n .env.example .env || true
npm ci
npm run build

echo "[deploy] reload nginx"
sudo nginx -t
sudo systemctl reload nginx

echo "[deploy] done"
