VERSION=$(shell git describe --tags --always)
DOCKER_GOOSE_IMAGE=golang:1.25
GOCACHE_DIR ?= /tmp/notification-service-go-build
GOLANGCI_LINT_CACHE_DIR ?= /tmp/notification-service-golangci-lint

.PHONY: build
# build
build:
	mkdir -p bin/ && GOCACHE=$(GOCACHE_DIR) go build -ldflags "-X main.Version=$(VERSION)" -o ./bin/notification-service ./cmd/notification-service

.PHONY: generate
# generate rtc config and tidy module
generate:
	GOCACHE=$(GOCACHE_DIR) go generate ./internal/rtc/...
	GOCACHE=$(GOCACHE_DIR) go generate ./...
	GOCACHE=$(GOCACHE_DIR) go mod tidy

.PHONY: run
# run application with .env loaded
run:
	set -a && . ./.env && set +a && GOCACHE=$(GOCACHE_DIR) go run ./cmd/notification-service

.PHONY: lint
# run golangci-lint with repository config
lint:
	GOCACHE=$(GOCACHE_DIR) GOLANGCI_LINT_CACHE=$(GOLANGCI_LINT_CACHE_DIR) golangci-lint run

.PHONY: migrate-up
# apply goose migrations to local database
migrate-up:
	set -a && . ./.env && set +a && GOCACHE=$(GOCACHE_DIR) go run github.com/pressly/goose/v3/cmd/goose@latest -dir ./scripts/migrations postgres "$$DATABASE_URL" up

.PHONY: migrate-down
# rollback latest goose migration from local database
migrate-down:
	set -a && . ./.env && set +a && GOCACHE=$(GOCACHE_DIR) go run github.com/pressly/goose/v3/cmd/goose@latest -dir ./scripts/migrations postgres "$$DATABASE_URL" down

.PHONY: docker-migrate-up
# apply goose migrations through docker network
docker-migrate-up:
	set -a && . ./.env && set +a && docker run --rm \
		--network notification-service_notification_service_network \
		-v "$(CURDIR):/workspace" \
		-w /workspace \
		-e DATABASE_URL="postgres://$$POSTGRES_USER:$$POSTGRES_PASSWORD@postgres:5432/$$POSTGRES_DB?sslmode=disable" \
		$(DOCKER_GOOSE_IMAGE) \
		sh -lc '/usr/local/go/bin/go run github.com/pressly/goose/v3/cmd/goose@latest -dir ./scripts/migrations postgres "$$DATABASE_URL" up'

.PHONY: docker-migrate-down
# rollback latest goose migration through docker network
docker-migrate-down:
	set -a && . ./.env && set +a && docker run --rm \
		--network notification-service_notification_service_network \
		-v "$(CURDIR):/workspace" \
		-w /workspace \
		-e DATABASE_URL="postgres://$$POSTGRES_USER:$$POSTGRES_PASSWORD@postgres:5432/$$POSTGRES_DB?sslmode=disable" \
		$(DOCKER_GOOSE_IMAGE) \
		sh -lc '/usr/local/go/bin/go run github.com/pressly/goose/v3/cmd/goose@latest -dir ./scripts/migrations postgres "$$DATABASE_URL" down'

.PHONY: docker-up
# start docker-compose locally and apply migrations
docker-up:
	cp -n .env.example .env || true
	docker compose --env-file .env up -d
	make docker-migrate-up

.PHONY: docker-down
# stop docker-compose
docker-down:
	docker compose down

.PHONY: docker-logs
# tail local infra logs
docker-logs:
	docker compose logs -f postgres

.PHONY: all
# generate and build
all:
	make generate
	make build

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

.DEFAULT_GOAL := help
