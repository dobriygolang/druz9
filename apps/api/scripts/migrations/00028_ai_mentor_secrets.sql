-- +goose Up
-- +goose StatementBegin

-- ADR-001 — Per-mentor API key storage. The encrypted_key is opaque to
-- Postgres (stored as bytea); the application encrypts/decrypts via the
-- AI_MENTOR_KEY_KMS env (NaCl secretbox or AES-GCM, see internal/aireview).
-- Until the encryption layer lands, callers may store the raw key as bytes
-- — the table contract doesn't change.
--
-- One row per mentor. Cascading delete keeps secrets consistent when an
-- admin removes a mentor from the catalog.
CREATE TABLE IF NOT EXISTS ai_mentor_secrets (
    mentor_id     UUID         PRIMARY KEY REFERENCES ai_mentors(id) ON DELETE CASCADE,
    encrypted_key BYTEA        NOT NULL,
    nonce         BYTEA        NOT NULL DEFAULT ''::bytea,
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_by    UUID
);

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS ai_mentor_secrets;
-- +goose StatementEnd
