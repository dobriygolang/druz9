FROM golang:1.25-alpine AS builder

WORKDIR /app
RUN apk add --no-cache git
COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN go install github.com/pressly/goose/v3/cmd/goose@latest
RUN CGO_ENABLED=0 GOOS=linux go build -o bin/api ./cmd/api
RUN CGO_ENABLED=0 GOOS=linux go build -o bin/seed ./cmd/seed

# Runtime image
FROM alpine:3.18

RUN apk add --no-cache bash ca-certificates postgresql-client

WORKDIR /app
COPY --from=builder /app/bin/api bin/
COPY --from=builder /app/bin/seed bin/
COPY --from=builder /go/bin/goose /usr/local/bin/goose
COPY --from=builder /app/scripts/entrypoint.sh /app/entrypoint.sh
COPY scripts scripts/
RUN chmod +x /app/entrypoint.sh /app/scripts/entrypoint.sh

EXPOSE 8080 9000
ENTRYPOINT ["/app/entrypoint.sh"]
