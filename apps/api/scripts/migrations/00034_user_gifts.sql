-- +goose Up
-- +goose StatementBegin

-- ADR / #5 — Inbox gift & trade flow. Replaces the text-message UX with
-- item exchanges between users. Two related tables:
--
--   user_gifts: a single-direction gift (sender → recipient) of a shop
--               item the sender owns. Stays in 'pending' until the
--               recipient claims (transfers ownership) or declines
--               (returns to sender). Never deleted — used for audit.
--
--   user_trades: two-way swap proposed by initiator. Either side can
--               cancel before both items move. Atomic exchange on accept.
--
-- Both are scoped to user_shop_inventory items (no currency yet — that's
-- a follow-up: gifts of currency mean dipping into the wallet ledger).
CREATE TABLE IF NOT EXISTS user_gifts (
    id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id     UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipient_id  UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    item_id       UUID         NOT NULL REFERENCES shop_items(id),
    note          TEXT         NOT NULL DEFAULT '',
    status        TEXT         NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','claimed','declined','expired')),
    sent_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    decided_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_user_gifts_recipient_pending
    ON user_gifts(recipient_id, sent_at DESC) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_user_gifts_sender
    ON user_gifts(sender_id, sent_at DESC);

CREATE TABLE IF NOT EXISTS user_trades (
    id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    initiator_id  UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    counterparty_id UUID       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    initiator_item_id   UUID   NOT NULL REFERENCES shop_items(id),
    counterparty_item_id UUID  NOT NULL REFERENCES shop_items(id),
    note          TEXT         NOT NULL DEFAULT '',
    status        TEXT         NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','accepted','declined','cancelled','expired')),
    proposed_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    decided_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_user_trades_counterparty_pending
    ON user_trades(counterparty_id, proposed_at DESC) WHERE status = 'pending';

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP INDEX IF EXISTS idx_user_trades_counterparty_pending;
DROP TABLE IF EXISTS user_trades;
DROP INDEX IF EXISTS idx_user_gifts_sender;
DROP INDEX IF EXISTS idx_user_gifts_recipient_pending;
DROP TABLE IF EXISTS user_gifts;
-- +goose StatementEnd
