# Platform Back

> Полный runbook (local + Oracle Cloud) см. в корневом [`../README.md`](../README.md).

Backend service on `go-kratos` for the friends platform MVP.

Current MVP domains:
- podcasts
- profiles and Telegram linking
- schedules
- places and map marks

## Current architecture

The project still uses the standard Kratos layering:
- `internal/api` for transport handlers
- `internal/biz` for use cases and domain contracts
- `internal/data` for infrastructure adapters
- `api` for protobuf contracts
- `pkg/api` for generated protobuf Go files

This is acceptable as a starting point, but when schedules and places appear the next step should be to split implementation by domain and keep adapters isolated:
- `internal/domain/podcast`
- `internal/domain/profile`
- `internal/domain/schedule`
- `internal/domain/place`
- `internal/adapters/postgres`
- `internal/adapters/s3`
- `internal/adapters/telegram`

## Local run

Bootstrap app config now lives in profile files:
- `./.platform/values_local.yaml`
- `./.platform/values_prod.yaml`

Profile selection:
- default: `local`
- override: `CONFIG_PROFILE=prod`
- explicit path still works through `RTC_VALUES_PATH`

1. Prepare optional compose env:
```bash
cp .env.example .env
```
2. Start infra:
```bash
make docker-up
```
3. Start backend:
```bash
make run
```
4. HTTP API:
```bash
http://localhost:8080
```
5. gRPC:
```bash
localhost:9000
```
6. MinIO console:
```bash
http://localhost:9011
```

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
- expose only the localhost ports you actually need through a host reverse proxy such as `nginx`

Production deploy details live in [`../deploy/README.md`](../deploy/README.md).

## Runtime Config

`./.platform/values_local.yaml` / `./.platform/values_prod.yaml` are the primary config sources for the service.

It now holds:
- bootstrap config for server, database, auth, S3, LiveKit, geocoder
- file-watched runtime values through `internal/rtc`

Environment variables are only a fallback/override layer and are mainly useful for:
- local docker-compose interpolation
- secret injection in deployment environments

Recommended split:
- keep non-sensitive defaults in `values_local.yaml` / `values_prod.yaml`
- keep secrets empty in those files
- inject secrets through env or `*_FILE`
