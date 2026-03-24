FROM golang:1.25-alpine AS builder

WORKDIR /app
RUN apk add --no-cache git
COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN go install github.com/pressly/goose/v3/cmd/goose@latest
RUN CGO_ENABLED=0 GOOS=linux go build -o bin/back ./cmd/back

# Runtime image
FROM alpine:3.18

RUN apk add --no-cache bash ca-certificates postgresql-client

WORKDIR /app
COPY --from=builder /app/bin/back bin/
COPY --from=builder /go/bin/goose /usr/local/bin/goose
COPY --from=builder /app/scripts/entrypoint.sh /app/entrypoint.sh
COPY scripts scripts/
COPY configs configs/

EXPOSE 8000 9000
ENTRYPOINT ["/app/entrypoint.sh"]
