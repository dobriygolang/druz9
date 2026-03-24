# Platform Back

Backend service on `go-kratos` for the friends platform MVP.

Current MVP domains:
- podcasts
- profiles and Telegram linking
- schedules
- places and map marks

## Current architecture

The project still uses the standard Kratos layering:
- `internal/service` for transport handlers
- `internal/biz` for use cases and domain contracts
- `internal/data` for infrastructure adapters
- `api` for protobuf contracts

This is acceptable as a starting point, but when schedules and places appear the next step should be to split implementation by domain and keep adapters isolated:
- `internal/domain/podcast`
- `internal/domain/profile`
- `internal/domain/schedule`
- `internal/domain/place`
- `internal/adapters/postgres`
- `internal/adapters/s3`
- `internal/adapters/telegram`

## Local run

1. Copy local env:
```bash
cp .env.local.example .env.local
```
2. Start dependencies and backend:
```bash
docker compose --env-file .env.local up -d --build
```
3. HTTP API:
```bash
http://localhost:8000
```
4. gRPC:
```bash
localhost:9009
```
5. MinIO console:
```bash
http://localhost:9001
```

On startup the backend waits for PostgreSQL and runs `goose up`.

## Migrations

`goose` is the only supported migration path.

Useful commands:
```bash
make migrate-status DATABASE_URL='postgres://postgres:postgres@127.0.0.1:5432/podcast?sslmode=disable'
make migrate-up DATABASE_URL='postgres://postgres:postgres@127.0.0.1:5432/podcast?sslmode=disable'
make migrate-down DATABASE_URL='postgres://postgres:postgres@127.0.0.1:5432/podcast?sslmode=disable'
```

Migrations live in `./scripts/migrations`.

## Production

Do not store production credentials in repository `.env` files.

Recommended approach on `mac-mini`:
- keep the compose file in the repo
- inject secrets from GitHub Actions into files on the host
- use Docker `secrets` and `*_FILE` variables for runtime reads
- expose only the ports you actually need through a reverse proxy such as `Caddy` or `Traefik`

Production deploy details live in `./deploy.md`.

## Realtime Values

Runtime-tunable variables live in `./.platform/values.yaml`.

These values are separate from bootstrap config:
- `config.yaml` is for app startup config
- `.platform/values.yaml` is for file-watched realtime variables

The current runtime manager lives in `internal/rtc` and watches `.platform/values.yaml` for changes.
