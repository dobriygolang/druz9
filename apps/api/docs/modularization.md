# Modularization Rules

This document fixes the target structure for incremental monolith decomposition.

## Goals

- Keep the API monolith readable while features continue to ship.
- Make external service boundaries explicit before extracting more services.
- Reduce debugging cost by giving each domain one predictable layout.

## Target Domain Layout

Each domain should converge to the same structure:

- `internal/api/<domain>`: transport handlers, request parsing, enum/DTO mapping
- `internal/app/<domain>` or `internal/domain/<domain>`: business logic and use-cases
- `internal/data/<domain>`: persistence and external storage details
- `internal/clients/<service>`: outbound clients to external services

## Boundary Rules

- `internal/api/*` may depend on domain/app layers and clients, but not on storage internals outside its domain.
- `internal/data/*` must not call transport handlers.
- Outbound gRPC/HTTP integrations belong in `internal/clients/*`, not in `cmd/*` and not in domain packages.
- Cross-domain communication inside the monolith should prefer interfaces owned by the consuming domain.
- Background workers should depend on domain services or clients, never on transport implementations.

## Current First-Step Decisions

- Notification outbound integration lives in `internal/clients/notification`.
- Geocoder HTTP integration lives in `internal/clients/geocoder`.
- Geo SQL queries stay in `internal/data/geo`.
- `notification-service` owns notification transport handlers and delivery workers.
- The API monolith keeps only the client-side adapter and business calls that trigger notifications.

## Next Candidates

- Revisit `realtime` and `code_editor` as the next extraction candidate only if load isolation or deploy isolation is needed.
- Keep `profile` and `admin` in the monolith until their data ownership is cleaner.
