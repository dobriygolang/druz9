-- +goose Up
-- +goose StatementBegin

-- The project is just launching — there was never a Season I or II.
-- Historical dev seed inserted Season III ("The Ember Pact"), which is
-- what every page shows today. Rename it to Season I so the UI reads
-- "Season I" across the board without us having to backfill two prior
-- seasons. Keep the same UUID so all FK references (tiers / progress /
-- wallet entries) stay intact.
UPDATE season_passes
   SET season_number = 1,
       title         = 'The Ember Pact',
       subtitle      = 'Chapter I · the founding season',
       -- Reset the window to start "now" so fresh users see a full season
       -- ahead of them rather than one already 10 days deep.
       starts_at     = NOW(),
       ends_at       = NOW() + INTERVAL '60 days'
 WHERE season_number = 3;

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
UPDATE season_passes
   SET season_number = 3,
       subtitle      = 'Chapter III · season of fire'
 WHERE season_number = 1 AND title = 'The Ember Pact';
-- +goose StatementEnd
