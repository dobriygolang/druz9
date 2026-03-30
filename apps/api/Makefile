VERSION=$(shell git describe --tags --always)
DOCKER_GOOSE_IMAGE=golang:1.25
GOCACHE_DIR ?= /tmp/api-go-build
GOLANGCI_LINT_CACHE_DIR ?= /tmp/api-golangci-lint

API_PROTO_FILES=$(shell find api -name "*.proto")

.PHONY: proto-stubs
# generate internal api transport stubs from proto
proto-stubs:
	GOCACHE=$(GOCACHE_DIR) go run ./internal/api/cmd/apigen --proto-root ./api --output-root ./internal/api

.PHONY: api
# generate api proto
api:
	mkdir -p ./pkg/api
	mkdir -p ./docs
	protoc --proto_path=./api \
	       --proto_path=./third_party \
 	       --go_out=paths=source_relative:./pkg/api \
 	       --go-http_out=paths=source_relative:./pkg/api \
 	       --go-grpc_out=paths=source_relative:./pkg/api \
	       --openapi_out=fq_schema_naming=true,default_response=false:./docs \
	       $(API_PROTO_FILES)

.PHONY: build
# build
build:
	mkdir -p bin/ && GOCACHE=$(GOCACHE_DIR) go build -ldflags "-X main.Version=$(VERSION)" -o ./bin/api ./cmd/api

.PHONY: run
# run application with runtime config from .platform/values_<profile>.yaml
run:
	set -a && . ./.env && set +a && GOCACHE=$(GOCACHE_DIR) go run ./cmd/api

.PHONY: migrate-up
# apply goose migrations to local database
migrate-up:
	DATABASE_URL="$$(GOCACHE=$(GOCACHE_DIR) go run ./cmd/configvalue database_url)" && \
	GOCACHE=$(GOCACHE_DIR) go run github.com/pressly/goose/v3/cmd/goose@latest -dir ./scripts/migrations postgres "$$DATABASE_URL" up

.PHONY: migrate-down
# rollback latest goose migration from local database
migrate-down:
	DATABASE_URL="$$(GOCACHE=$(GOCACHE_DIR) go run ./cmd/configvalue database_url)" && \
	GOCACHE=$(GOCACHE_DIR) go run github.com/pressly/goose/v3/cmd/goose@latest -dir ./scripts/migrations postgres "$$DATABASE_URL" down

.PHONY: migrate-status
# show goose migration status for local database
migrate-status:
	DATABASE_URL="$$(GOCACHE=$(GOCACHE_DIR) go run ./cmd/configvalue database_url)" && \
	GOCACHE=$(GOCACHE_DIR) go run github.com/pressly/goose/v3/cmd/goose@latest -dir ./scripts/migrations postgres "$$DATABASE_URL" status

.PHONY: docker-migrate-up
# apply goose migrations through docker network
docker-migrate-up:
	set -a && . ./.env && set +a && docker run --rm \
		--network api_api_network \
		-v "$(CURDIR):/workspace" \
		-w /workspace \
		-e DATABASE_URL="postgres://$$POSTGRES_USER:$$POSTGRES_PASSWORD@postgres:5432/$$POSTGRES_DB?sslmode=disable" \
		$(DOCKER_GOOSE_IMAGE) \
		sh -lc '/usr/local/go/bin/go run github.com/pressly/goose/v3/cmd/goose@latest -dir ./scripts/migrations postgres "$$DATABASE_URL" up'

.PHONY: docker-migrate-down
# rollback latest goose migration through docker network
docker-migrate-down:
	set -a && . ./.env && set +a && docker run --rm \
		--network api_api_network \
		-v "$(CURDIR):/workspace" \
		-w /workspace \
		-e DATABASE_URL="postgres://$$POSTGRES_USER:$$POSTGRES_PASSWORD@postgres:5432/$$POSTGRES_DB?sslmode=disable" \
		$(DOCKER_GOOSE_IMAGE) \
		sh -lc '/usr/local/go/bin/go run github.com/pressly/goose/v3/cmd/goose@latest -dir ./scripts/migrations postgres "$$DATABASE_URL" down'

.PHONY: docker-migrate-status
# show goose migration status through docker network
docker-migrate-status:
	set -a && . ./.env && set +a && docker run --rm \
		--network api_api_network \
		-v "$(CURDIR):/workspace" \
		-w /workspace \
		-e DATABASE_URL="postgres://$$POSTGRES_USER:$$POSTGRES_PASSWORD@postgres:5432/$$POSTGRES_DB?sslmode=disable" \
		$(DOCKER_GOOSE_IMAGE) \
		sh -lc '/usr/local/go/bin/go run github.com/pressly/goose/v3/cmd/goose@latest -dir ./scripts/migrations postgres "$$DATABASE_URL" status'

.PHONY: generate
# generate
generate:
	$(MAKE) api
	$(MAKE) proto-stubs
	GOCACHE=$(GOCACHE_DIR) go generate ./...
	GOCACHE=$(GOCACHE_DIR) go mod tidy

.PHONY: seed-up
# apply SQL and Go seeds from scripts/seeds and internal seed packs
seed-up:
	GOCACHE=$(GOCACHE_DIR) go run ./cmd/seed -only all

.PHONY: seed-sql
# apply only SQL seeds from scripts/seeds
seed-sql:
	GOCACHE=$(GOCACHE_DIR) go run ./cmd/seed -only sql

.PHONY: seed-blind75
# apply only Blind 75 task pack
seed-blind75:
	GOCACHE=$(GOCACHE_DIR) go run ./cmd/seed -only blind75

.PHONY: seed-status
# show applied seed records
seed-status:
	GOCACHE=$(GOCACHE_DIR) go run ./cmd/seed -status

.PHONY: lint
# run golangci-lint with repository config
lint:
	GOCACHE=$(GOCACHE_DIR) GOLANGCI_LINT_CACHE=$(GOLANGCI_LINT_CACHE_DIR) golangci-lint run

# show help
help:
	@echo ''
	@echo 'Usage:'
	@echo ' make [target]'
	@echo ''
	@echo 'Targets:'
	@awk '/^[a-zA-Z\-\_0-9]+:/ { \
	helpMessage = match(lastLine, /^# (.*)/); \
		if (helpMessage) { \
			helpCommand = substr($$1, 0, index($$1, ":")); \
			helpMessage = substr(lastLine, RSTART + 2, RLENGTH); \
			printf "\033[36m%-22s\033[0m %s\n", helpCommand,helpMessage; \
		} \
	} \
	{ lastLine = $$0 }' $(MAKEFILE_LIST)

.PHONY: docker-up
# start docker-compose locally
docker-up:
	cp -n .env.example .env || true
	docker compose --env-file .env up -d
	$(MAKE) docker-migrate-up

.PHONY: docker-down
# stop docker-compose
docker-down:
	docker compose down

.PHONY: docker-logs
# tail local infra logs
docker-logs:
	docker compose logs -f postgres minio minio-init livekit prometheus grafana

.PHONY: docker-up-with-monitoring
# start docker-compose with monitoring (prometheus + grafana)
docker-up-with-monitoring:
	cp -n .env.example .env || true
	docker compose --env-file .env up -d prometheus grafana
	$(MAKE) docker-migrate-up

.PHONY: docker-logs-monitoring
# tail monitoring logs
docker-logs-monitoring:
	docker compose logs -f prometheus grafana

.DEFAULT_GOAL := help
