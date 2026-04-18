-- +goose Up
-- +goose StatementBegin

-- Ensure the active season pass has a 40-tier ladder. Idempotent: only
-- inserts when the tier table is empty for the active pass. This used to
-- live only in scripts/seeds/003_season_pass_s3.sql, which isn't applied
-- automatically on prod deploys — resulting in an empty /seasonpass
-- page. Putting it in a migration guarantees fresh environments always
-- have a playable pass.

DO $$
DECLARE
    pass_id UUID;
    t INT;
    free_kind SMALLINT; free_amt INT; free_lbl TEXT;
    prem_kind SMALLINT; prem_amt INT; prem_lbl TEXT;
BEGIN
    -- Pick the first active pass (there's only ever one at a time).
    SELECT id INTO pass_id
      FROM season_passes
     WHERE starts_at <= NOW() AND ends_at > NOW()
     ORDER BY starts_at DESC
     LIMIT 1;

    IF pass_id IS NULL THEN
        RETURN;
    END IF;

    -- Skip if this pass already has tiers.
    IF EXISTS (SELECT 1 FROM season_pass_tiers WHERE season_pass_id = pass_id) THEN
        RETURN;
    END IF;

    FOR t IN 1..40 LOOP
        IF t % 10 = 0 THEN
            free_kind := 9; free_amt := 1; free_lbl := 'Rare cosmetic';
            prem_kind := 7; prem_amt := 1; prem_lbl := 'Ember banner';
        ELSIF t % 5 = 0 THEN
            free_kind := 4; free_amt := 1; free_lbl := 'Bronze frame';
            prem_kind := 5; prem_amt := 1; prem_lbl := 'Pet companion';
        ELSE
            CASE t % 3
                WHEN 0 THEN free_kind := 1; free_amt := 80;  free_lbl := '+80 gold';
                WHEN 1 THEN free_kind := 3; free_amt := 120; free_lbl := '+120 xp';
                ELSE         free_kind := 2; free_amt := 10;  free_lbl := '+10 gems';
            END CASE;
            prem_kind := 1; prem_amt := 200; prem_lbl := '+200 gold';
        END IF;

        IF t = 40 THEN
            free_kind := 4; free_amt := 1; free_lbl := 'Season I frame';
            prem_kind := 8; prem_amt := 1; prem_lbl := 'Ember Sovereign aura';
        END IF;

        INSERT INTO season_pass_tiers (
            season_pass_id, tier,
            free_reward_kind, free_reward_amount, free_reward_label,
            premium_reward_kind, premium_reward_amount, premium_reward_label
        ) VALUES (
            pass_id, t,
            free_kind, free_amt, free_lbl,
            prem_kind, prem_amt, prem_lbl
        );
    END LOOP;
END $$;

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
-- No-op: we don't tear down seed data on rollback.
SELECT 1;
-- +goose StatementEnd
