-- +goose Up
-- +goose StatementBegin

-- Killer feature #3 — AI Post-Mock Coach. A structured coaching report
-- generated after a peer mock completes. The current generator is a
-- heuristic that summarises the interviewer's review notes; swapping
-- in a Whisper → Claude pipeline is a drop-in replacement for
-- internal/domain/peer_mock_coach/Generate.

CREATE TABLE IF NOT EXISTS mock_coach_reports (
    booking_id          UUID        PRIMARY KEY REFERENCES mock_bookings(id) ON DELETE CASCADE,
    strengths           TEXT        NOT NULL DEFAULT '',
    areas_to_revisit    TEXT        NOT NULL DEFAULT '',
    recommended_focus   TEXT[]      NOT NULL DEFAULT ARRAY[]::TEXT[],
    filler_word_hits    INT         NOT NULL DEFAULT 0,
    overall_score       INT         NOT NULL DEFAULT 0,
    generated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mock_coach_reports_generated_at ON mock_coach_reports(generated_at DESC);

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS mock_coach_reports;
-- +goose StatementEnd
