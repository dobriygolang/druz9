# apihelpers

Utilities shared by the transport (api) layer. Handlers should use these
instead of hand-rolling auth-context extraction, UUID parsing and page
clamping — the "write it three times, then extract" debt from before
this package existed was sitting at ~60 handler files.

## Migration cheat sheet

**Before:**

```go
user, ok := model.UserFromContext(ctx)
if !ok || user == nil {
    return nil, errors.Unauthorized("UNAUTHORIZED", "authentication required")
}

threadID, err := uuid.Parse(req.GetThreadId())
if err != nil {
    return nil, errors.BadRequest("INVALID_THREAD_ID", "thread_id must be a valid UUID")
}
```

**After:**

```go
user, err := apihelpers.RequireUser(ctx)
if err != nil {
    return nil, err
}
threadID, err := apihelpers.ParseUUID(req.GetThreadId(), "INVALID_THREAD_ID", "thread_id")
if err != nil {
    return nil, err
}
```

## Helpers

| Helper            | Replaces                                      | Error shape                   |
|-------------------|-----------------------------------------------|-------------------------------|
| `RequireUser`     | `model.UserFromContext` + 401 boilerplate     | `Unauthorized(UNAUTHORIZED)`  |
| `OptionalUser`    | `model.UserFromContext` where guest is OK     | (returns nil, no error)       |
| `ParseUUID`       | `uuid.Parse` + `BadRequest` with error code   | `BadRequest(<code>)`          |
| `ParseOptionalUUID` | `uuid.Parse` for optional fields            | `BadRequest(<code>)` or nil   |
| `ClampPage`       | per-endpoint limit/offset validation          | n/a (returns `Page`)          |

## When NOT to use

- If your handler has domain-specific auth (e.g. guild admin check), keep
  the custom logic. The helper's 401 is the correct default; 403 lives
  in handlers.
- If you need a non-proto UUID source (e.g. URL path params pulled
  directly from Kratos request), `uuid.Parse` on the raw string is fine.

## Adding helpers

Keep this package **transport-aware but framework-agnostic**:

- OK: kratos errors, uuid, model types
- NOT OK: importing domain/data packages, importing proto-generated
  types (would couple helpers to a specific proto package)
