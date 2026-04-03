FROM golang:1.25-alpine AS base-builder

WORKDIR /app
RUN apk add --no-cache git
COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN go install github.com/pressly/goose/v3/cmd/goose@latest

FROM base-builder AS api-builder
RUN CGO_ENABLED=0 GOOS=linux go build -o bin/api ./cmd/api
RUN CGO_ENABLED=0 GOOS=linux go build -o bin/seed ./cmd/seed

FROM base-builder AS sandbox-builder
RUN CGO_ENABLED=0 GOOS=linux go build -o bin/sandbox-runner ./cmd/sandbox-runner
RUN CGO_ENABLED=0 GOOS=linux go build -o bin/sandbox-exec ./cmd/sandbox-exec

# Runtime image
FROM alpine:3.18

RUN apk add --no-cache bash ca-certificates postgresql-client go python3 sqlite

WORKDIR /app
COPY --from=api-builder /app/bin/api bin/
COPY --from=api-builder /app/bin/seed bin/
COPY --from=sandbox-builder /app/bin/sandbox-runner bin/
COPY --from=sandbox-builder /app/bin/sandbox-exec bin/
COPY --from=base-builder /go/bin/goose /usr/local/bin/goose
COPY --from=base-builder /app/scripts/entrypoint.sh /app/entrypoint.sh
COPY scripts scripts/
RUN chmod +x /app/entrypoint.sh /app/scripts/entrypoint.sh

EXPOSE 8080 9000
ENTRYPOINT ["/app/entrypoint.sh"]

FROM alpine:3.18 AS sandbox-runner-runtime

RUN apk add --no-cache ca-certificates docker-cli

WORKDIR /app
COPY --from=sandbox-builder /app/bin/sandbox-runner bin/

EXPOSE 8098
ENTRYPOINT ["/app/bin/sandbox-runner"]

FROM alpine:3.18 AS sandbox-exec-runtime

RUN apk add --no-cache ca-certificates go python3 sqlite

WORKDIR /app
COPY --from=sandbox-builder /app/bin/sandbox-exec bin/

ENTRYPOINT ["/app/bin/sandbox-exec"]
