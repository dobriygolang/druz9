-- +goose Up

CREATE TABLE circle_challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    circle_id UUID NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
    template_key TEXT NOT NULL CHECK (template_key IN ('streak_days', 'daily_completion', 'duels_count', 'mocks_count')),
    target_value INT NOT NULL CHECK (target_value > 0),
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    created_by UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_circle_challenges_circle_active ON circle_challenges(circle_id, ends_at DESC);

-- +goose Down

DROP TABLE IF EXISTS circle_challenges;
