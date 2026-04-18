-- Season III "The Ember Pact": the default/active pass used by the UI.
-- Idempotent: guarded by unique(season_number).

INSERT INTO season_passes (
    id, season_number, title, subtitle, starts_at, ends_at,
    max_tier, xp_per_tier, premium_price_gems
)
VALUES (
    '00000000-0000-0000-0000-00000000ce03'::UUID,  -- stable id: "ce03" = ChaptEr 03
    3, 'The Ember Pact', 'Chapter III · season of fire',
    NOW() - INTERVAL '10 days',
    NOW() + INTERVAL '30 days',
    40, 500, 400
)
ON CONFLICT (season_number) DO NOTHING;

-- Tier ladder. Every 5 tiers we hand out a big cosmetic; other tiers give
-- gold/gems/xp. Premium track mirrors the structure with larger rewards.
-- Reward kind constants:
--   1 GOLD, 2 GEMS, 3 XP, 4 FRAME, 5 PET, 6 EMOTE, 7 BANNER, 8 AURA, 9 COSMETIC
DO $$
DECLARE
    pass_id UUID;
    t INT;
    free_kind SMALLINT; free_amt INT; free_lbl TEXT;
    prem_kind SMALLINT; prem_amt INT; prem_lbl TEXT;
BEGIN
    SELECT id INTO pass_id FROM season_passes WHERE season_number = 3;
    IF pass_id IS NULL THEN
        RETURN;
    END IF;

    -- Skip if tiers already seeded.
    IF EXISTS (SELECT 1 FROM season_pass_tiers WHERE season_pass_id = pass_id) THEN
        RETURN;
    END IF;

    FOR t IN 1..40 LOOP
        -- Big-reward tiers every 5.
        IF t % 10 = 0 THEN
            free_kind := 9; free_amt := 1; free_lbl := 'Rare cosmetic';
            prem_kind := 7; prem_amt := 1; prem_lbl := 'Ember banner';
        ELSIF t % 5 = 0 THEN
            free_kind := 4; free_amt := 1; free_lbl := 'Bronze frame';
            prem_kind := 5; prem_amt := 1; prem_lbl := 'Pet companion';
        ELSE
            -- Alternate gold / xp / gems across the fills.
            CASE t % 3
                WHEN 0 THEN free_kind := 1; free_amt := 80;  free_lbl := '+80 gold';
                WHEN 1 THEN free_kind := 3; free_amt := 120; free_lbl := '+120 xp';
                ELSE         free_kind := 2; free_amt := 10;  free_lbl := '+10 gems';
            END CASE;
            prem_kind := 1; prem_amt := 200; prem_lbl := '+200 gold';
        END IF;

        -- Final tier gets the legendary frame.
        IF t = 40 THEN
            free_kind := 4; free_amt := 1; free_lbl := 'Season III frame';
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
