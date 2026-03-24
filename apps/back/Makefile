GOHOSTOS:=$(shell go env GOHOSTOS)
GOPATH:=$(shell go env GOPATH)
VERSION=$(shell git describe --tags --always)

ifeq ($(GOHOSTOS), windows)
	#the `find.exe` is different from `find` in bash/shell.
	#to see https://docs.microsoft.com/en-us/windows-server/administration/windows-commands/find.
	#changed to use git-bash.exe to run find cli or other cli friendly, caused of every developer has a Git.
	#Git_Bash= $(subst cmd\,bin\bash.exe,$(dir $(shell where git)))
	Git_Bash=$(subst \,/,$(subst cmd\,bin\bash.exe,$(dir $(shell where git))))
	API_PROTO_FILES=$(shell $(Git_Bash) -c "find api -name '*.proto' ! -name 'error_reason.proto'")
else
	API_PROTO_FILES=$(shell find api -name "*.proto" ! -name "error_reason.proto")
endif

.PHONY: init
# init env
init:
	go install google.golang.org/protobuf/cmd/protoc-gen-go@latest
	go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest
	go install github.com/go-kratos/kratos/cmd/kratos/v2@latest
	go install github.com/go-kratos/kratos/cmd/protoc-gen-go-http/v2@latest
	go install github.com/google/gnostic/cmd/protoc-gen-openapi@latest
	go install github.com/google/wire/cmd/wire@latest
	go install github.com/pressly/goose/v3/cmd/goose@latest
	go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest

.PHONY: api
# generate api proto
api:
	protoc --proto_path=./api \
	       --proto_path=./third_party \
 	       --go_out=paths=source_relative:./pkg/api \
 	       --go-http_out=paths=source_relative:./pkg/api \
 	       --go-grpc_out=paths=source_relative:./pkg/api \
	       --openapi_out=fq_schema_naming=true,default_response=false:. \
	       $(API_PROTO_FILES)

.PHONY: build
# build
build:
	mkdir -p bin/ && go build -ldflags "-X main.Version=$(VERSION)" -o ./bin/ ./...

.PHONY: migrate-up
# apply goose migrations to local database
migrate-up:
	goose -dir ./scripts/migrations postgres "$(DATABASE_URL)" up

.PHONY: migrate-down
# rollback latest goose migration from local database
migrate-down:
	goose -dir ./scripts/migrations postgres "$(DATABASE_URL)" down

.PHONY: migrate-status
# show goose migration status for local database
migrate-status:
	goose -dir ./scripts/migrations postgres "$(DATABASE_URL)" status

.PHONY: generate
# generate
generate:
	go generate ./...
	go mod tidy

.PHONY: lint
# run golangci-lint with repository config
lint:
	golangci-lint run

.PHONY: all
# generate all
all:
	make api
	make generate

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
	cp -n .env.local.example .env.local || true
	docker compose --env-file .env.local up -d

.PHONY: docker-down
# stop docker-compose
docker-down:
	docker compose down

.PHONY: docker-logs
# tail docker logs
docker-logs:
	docker compose logs -f backend

.PHONY: docker-build
# build docker image
docker-build:
	docker build -t podcast-service:latest .

.PHONY: docker-push
# push to registry (update REGISTRY variable)
docker-push:
	docker push podcast-service:latest

.DEFAULT_GOAL := help
