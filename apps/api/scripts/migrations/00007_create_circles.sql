-- +goose Up
CREATE TABLE IF NOT EXISTS circles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    creator_id UUID NOT NULL REFERENCES users(id),
    member_count INT NOT NULL DEFAULT 0,
    tags TEXT[] NOT NULL DEFAULT '{}',
    is_public BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS circle_members (
    circle_id UUID NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member',
    joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (circle_id, user_id)
);

CREATE INDEX idx_circles_created ON circles(created_at DESC);
CREATE INDEX idx_circle_members_user ON circle_members(user_id);

-- +goose Down
DROP TABLE IF EXISTS circle_members;
DROP TABLE IF EXISTS circles;
