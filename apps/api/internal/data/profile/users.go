package profile

import (
	"context"
	"errors"
	"fmt"
	"strconv"

	profileerrors "api/internal/errors/profile"
	"api/internal/model"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

const userSelectColumns = `
  u.id,
  NULLIF(u.username, ''),
  NULLIF(u.first_name, ''),
  NULLIF(u.last_name, ''),
  COALESCE(NULLIF(u.avatar_url, ''), NULLIF(u.yandex_avatar_url, ''), NULLIF(u.telegram_avatar_url, ''), ''),
  NULLIF(u.current_workplace, ''),
  g.region,
  g.country,
  g.city,
  g.latitude,
  g.longitude,
  u.status,
  u.is_admin,
  %s,
  ARRAY_REMOVE(ARRAY[
    CASE WHEN u.telegram_id IS NOT NULL THEN 'telegram' END,
    CASE WHEN NULLIF(u.yandex_id, '') IS NOT NULL THEN 'yandex' END
  ], NULL),
  NULLIF(u.primary_provider, ''),
  u.last_active_at,
  u.created_at,
  u.updated_at
`

func (r *Repo) userByIDQuery() string {
	return fmt.Sprintf(`
SELECT `+userSelectColumns+`
FROM users u
LEFT JOIN geo g ON g.user_id = u.id
WHERE u.id = $1
`, r.trustedSelect("u.is_trusted"))
}

func (r *Repo) selectUserByIDTx(ctx context.Context, tx pgx.Tx, userID uuid.UUID) (*model.User, error) {
	return scanUser(tx.QueryRow(ctx, r.userByIDQuery(), userID))
}

func parseTelegramProviderID(value string) (int64, error) {
	parsed, err := strconv.ParseInt(value, 10, 64)
	if err != nil {
		return 0, fmt.Errorf("parse telegram provider id: %w", err)
	}
	return parsed, nil
}

func (r *Repo) upsertTelegramUserTx(ctx context.Context, tx pgx.Tx, payload model.IdentityAuthPayload) (*model.User, error) {
	telegramID, err := parseTelegramProviderID(payload.ProviderUserID)
	if err != nil {
		return nil, err
	}

	query := `
INSERT INTO users (
  id,
  username,
  first_name,
  last_name,
  avatar_url,
  telegram_id,
  telegram_username,
  telegram_avatar_url,
  primary_provider,
  current_workplace,
  status,
  last_active_at,
  created_at,
  updated_at
)
VALUES (
  gen_random_uuid(),
  COALESCE(NULLIF($2, ''), ''),
  COALESCE(NULLIF($3, ''), ''),
  COALESCE(NULLIF($4, ''), ''),
  COALESCE(NULLIF($5, ''), ''),
  $1,
  COALESCE(NULLIF($2, ''), ''),
  COALESCE(NULLIF($5, ''), ''),
  'telegram',
  '',
  $6,
  NOW(),
  NOW(),
  NOW()
)
ON CONFLICT (telegram_id)
WHERE telegram_id IS NOT NULL
DO UPDATE
SET
  username = COALESCE(NULLIF(users.username, ''), NULLIF(EXCLUDED.username, ''), ''),
  first_name = COALESCE(NULLIF(EXCLUDED.first_name, ''), users.first_name),
  last_name = COALESCE(NULLIF(EXCLUDED.last_name, ''), users.last_name),
  avatar_url = COALESCE(NULLIF(users.avatar_url, ''), NULLIF(EXCLUDED.avatar_url, ''), ''),
  telegram_username = COALESCE(NULLIF(EXCLUDED.telegram_username, ''), users.telegram_username, ''),
  telegram_avatar_url = COALESCE(NULLIF(EXCLUDED.telegram_avatar_url, ''), users.telegram_avatar_url, ''),
  primary_provider = COALESCE(NULLIF(users.primary_provider, ''), 'telegram'),
  last_active_at = NOW(),
  updated_at = NOW()
RETURNING id
`

	var userID uuid.UUID
	if err := tx.QueryRow(
		ctx,
		query,
		telegramID,
		payload.Username,
		payload.FirstName,
		payload.LastName,
		payload.AvatarURL,
		model.UserStatusPendingProfile,
	).Scan(&userID); err != nil {
		return nil, fmt.Errorf("upsert telegram user: %w", err)
	}

	return r.selectUserByIDTx(ctx, tx, userID)
}

func (r *Repo) upsertYandexUserTx(ctx context.Context, tx pgx.Tx, payload model.IdentityAuthPayload) (*model.User, error) {
	query := `
INSERT INTO users (
  id,
  username,
  first_name,
  last_name,
  avatar_url,
  yandex_id,
  yandex_login,
  yandex_email,
  yandex_avatar_url,
  primary_provider,
  current_workplace,
  status,
  last_active_at,
  created_at,
  updated_at
)
VALUES (
  gen_random_uuid(),
  COALESCE(NULLIF($2, ''), ''),
  COALESCE(NULLIF($3, ''), ''),
  COALESCE(NULLIF($4, ''), ''),
  COALESCE(NULLIF($5, ''), ''),
  $1,
  COALESCE(NULLIF($2, ''), ''),
  COALESCE(NULLIF($6, ''), ''),
  COALESCE(NULLIF($5, ''), ''),
  'yandex',
  '',
  $7,
  NOW(),
  NOW(),
  NOW()
)
ON CONFLICT (yandex_id)
WHERE yandex_id IS NOT NULL AND yandex_id <> ''
DO UPDATE
SET
  username = COALESCE(NULLIF(users.username, ''), NULLIF(EXCLUDED.username, ''), ''),
  first_name = COALESCE(NULLIF(EXCLUDED.first_name, ''), users.first_name),
  last_name = COALESCE(NULLIF(EXCLUDED.last_name, ''), users.last_name),
  avatar_url = COALESCE(NULLIF(users.avatar_url, ''), NULLIF(EXCLUDED.avatar_url, ''), ''),
  yandex_login = COALESCE(NULLIF(EXCLUDED.yandex_login, ''), users.yandex_login, ''),
  yandex_email = COALESCE(NULLIF(EXCLUDED.yandex_email, ''), users.yandex_email, ''),
  yandex_avatar_url = COALESCE(NULLIF(EXCLUDED.yandex_avatar_url, ''), users.yandex_avatar_url, ''),
  primary_provider = COALESCE(NULLIF(users.primary_provider, ''), 'yandex'),
  last_active_at = NOW(),
  updated_at = NOW()
RETURNING id
`

	var userID uuid.UUID
	if err := tx.QueryRow(
		ctx,
		query,
		payload.ProviderUserID,
		payload.Username,
		payload.FirstName,
		payload.LastName,
		payload.AvatarURL,
		payload.Email,
		model.UserStatusPendingProfile,
	).Scan(&userID); err != nil {
		return nil, fmt.Errorf("upsert yandex user: %w", err)
	}

	return r.selectUserByIDTx(ctx, tx, userID)
}

func (r *Repo) UpsertUserByIdentity(ctx context.Context, payload model.IdentityAuthPayload) (*model.User, error) {
	tx, err := r.data.DB.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, fmt.Errorf("begin tx: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	var user *model.User
	switch payload.Provider {
	case model.AuthProviderTelegram:
		user, err = r.upsertTelegramUserTx(ctx, tx, payload)
	case model.AuthProviderYandex:
		user, err = r.upsertYandexUserTx(ctx, tx, payload)
	default:
		return nil, profileerrors.ErrInvalidPayload
	}
	if err != nil {
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("commit tx: %w", err)
	}
	return user, nil
}

func (r *Repo) FindUserByProviderIdentity(ctx context.Context, provider model.AuthProvider, providerUserID string) (*model.User, error) {
	switch provider {
	case model.AuthProviderTelegram:
		telegramID, err := parseTelegramProviderID(providerUserID)
		if err != nil {
			return nil, err
		}
		query := fmt.Sprintf(`
SELECT `+userSelectColumns+`
FROM users u
LEFT JOIN geo g ON g.user_id = u.id
WHERE u.telegram_id = $1
`, r.trustedSelect("u.is_trusted"))
		return scanUser(r.data.DB.QueryRow(ctx, query, telegramID))
	case model.AuthProviderYandex:
		query := fmt.Sprintf(`
SELECT `+userSelectColumns+`
FROM users u
LEFT JOIN geo g ON g.user_id = u.id
WHERE u.yandex_id = $1
`, r.trustedSelect("u.is_trusted"))
		return scanUser(r.data.DB.QueryRow(ctx, query, providerUserID))
	default:
		return nil, profileerrors.ErrInvalidPayload
	}
}

func (r *Repo) FindUserByID(ctx context.Context, id uuid.UUID) (*model.User, error) {
	return scanUser(r.data.DB.QueryRow(ctx, r.userByIDQuery(), id))
}

func (r *Repo) UpdateProfile(ctx context.Context, userID uuid.UUID, currentWorkplace string) (*model.User, error) {
	query := fmt.Sprintf(`
WITH updated_user AS (
  UPDATE users
  SET current_workplace = $2,
      updated_at = NOW()
  WHERE id = $1
  RETURNING id
)
SELECT `+userSelectColumns+`
FROM users u
JOIN updated_user uu ON uu.id = u.id
LEFT JOIN geo g ON g.user_id = u.id
`, r.trustedSelect("u.is_trusted"))
	return scanUser(r.data.DB.QueryRow(ctx, query, userID, currentWorkplace))
}

func (r *Repo) CompleteRegistration(ctx context.Context, userID uuid.UUID, req model.CompleteRegistrationRequest) (*model.User, error) {
	tx, err := r.data.DB.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, fmt.Errorf("begin tx: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	if _, err := tx.Exec(
		ctx,
		`
UPDATE users
SET status = $2,
    updated_at = NOW()
WHERE id = $1
`,
		userID,
		model.UserStatusActive,
	); err != nil {
		return nil, fmt.Errorf("update user registration: %w", err)
	}

	if _, err := tx.Exec(
		ctx,
		`
INSERT INTO geo (user_id, region, country, city, latitude, longitude)
VALUES ($1, $2, $3, $4, $5, $6)
ON CONFLICT (user_id) DO UPDATE SET
  region = EXCLUDED.region,
  country = EXCLUDED.country,
  city = EXCLUDED.city,
  latitude = EXCLUDED.latitude,
  longitude = EXCLUDED.longitude
`,
		userID,
		req.Region,
		nullIfEmpty(req.Country),
		nullIfEmpty(req.City),
		req.Latitude,
		req.Longitude,
	); err != nil {
		return nil, fmt.Errorf("upsert user geo: %w", err)
	}

	user, err := r.selectUserByIDTx(ctx, tx, userID)
	if err != nil {
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("commit tx: %w", err)
	}
	return user, nil
}

func (r *Repo) UpdateLocation(ctx context.Context, userID uuid.UUID, req model.CompleteRegistrationRequest) (*model.User, error) {
	return r.CompleteRegistration(ctx, userID, req)
}

func (r *Repo) UpdateAvatarURL(ctx context.Context, userID uuid.UUID, avatarURL string) (*model.User, error) {
	query := fmt.Sprintf(`
WITH updated_user AS (
  UPDATE users
  SET avatar_url = $2,
      updated_at = NOW()
  WHERE id = $1
  RETURNING id
)
SELECT `+userSelectColumns+`
FROM users u
JOIN updated_user uu ON uu.id = u.id
LEFT JOIN geo g ON g.user_id = u.id
`, r.trustedSelect("u.is_trusted"))
	return scanUser(r.data.DB.QueryRow(ctx, query, userID, nullIfEmpty(avatarURL)))
}

func (r *Repo) bindTelegramToUserTx(ctx context.Context, tx pgx.Tx, userID uuid.UUID, payload model.IdentityAuthPayload) error {
	telegramID, err := parseTelegramProviderID(payload.ProviderUserID)
	if err != nil {
		return err
	}

	tag, err := tx.Exec(ctx, `
UPDATE users
SET username = COALESCE(NULLIF(username, ''), NULLIF($2, ''), ''),
    first_name = COALESCE(NULLIF($3, ''), first_name),
    last_name = COALESCE(NULLIF($4, ''), last_name),
    avatar_url = COALESCE(NULLIF(avatar_url, ''), NULLIF($5, ''), ''),
    telegram_id = $6,
    telegram_username = COALESCE(NULLIF($2, ''), telegram_username, ''),
    telegram_avatar_url = COALESCE(NULLIF($5, ''), telegram_avatar_url, ''),
    updated_at = NOW()
WHERE id = $1
`, userID, payload.Username, payload.FirstName, payload.LastName, payload.AvatarURL, telegramID)
	if err != nil {
		return fmt.Errorf("bind telegram user: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return profileerrors.ErrUserNotFound
	}
	return nil
}

func (r *Repo) bindYandexToUserTx(ctx context.Context, tx pgx.Tx, userID uuid.UUID, payload model.IdentityAuthPayload) error {
	tag, err := tx.Exec(ctx, `
UPDATE users
SET username = COALESCE(NULLIF(username, ''), NULLIF($2, ''), ''),
    first_name = COALESCE(NULLIF($3, ''), first_name),
    last_name = COALESCE(NULLIF($4, ''), last_name),
    avatar_url = COALESCE(NULLIF(avatar_url, ''), NULLIF($5, ''), ''),
    yandex_id = $6,
    yandex_login = COALESCE(NULLIF($2, ''), yandex_login, ''),
    yandex_email = COALESCE(NULLIF($7, ''), yandex_email, ''),
    yandex_avatar_url = COALESCE(NULLIF($5, ''), yandex_avatar_url, ''),
    updated_at = NOW()
WHERE id = $1
`, userID, payload.Username, payload.FirstName, payload.LastName, payload.AvatarURL, payload.ProviderUserID, payload.Email)
	if err != nil {
		return fmt.Errorf("bind yandex user: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return profileerrors.ErrUserNotFound
	}
	return nil
}

func (r *Repo) bindProviderToUserTx(ctx context.Context, tx pgx.Tx, userID uuid.UUID, payload model.IdentityAuthPayload) error {
	switch payload.Provider {
	case model.AuthProviderTelegram:
		return r.bindTelegramToUserTx(ctx, tx, userID, payload)
	case model.AuthProviderYandex:
		return r.bindYandexToUserTx(ctx, tx, userID, payload)
	default:
		return profileerrors.ErrInvalidPayload
	}
}

func (r *Repo) mergeUsersTx(ctx context.Context, tx pgx.Tx, canonicalUserID, secondaryUserID uuid.UUID) error {
	if canonicalUserID == secondaryUserID {
		return nil
	}

	if _, err := tx.Exec(ctx, `
UPDATE users canonical
SET
  username = COALESCE(NULLIF(canonical.username, ''), NULLIF(secondary.username, ''), ''),
  first_name = COALESCE(NULLIF(canonical.first_name, ''), NULLIF(secondary.first_name, ''), ''),
  last_name = COALESCE(NULLIF(canonical.last_name, ''), NULLIF(secondary.last_name, ''), ''),
  avatar_url = COALESCE(NULLIF(canonical.avatar_url, ''), NULLIF(secondary.avatar_url, ''), NULLIF(secondary.yandex_avatar_url, ''), NULLIF(secondary.telegram_avatar_url, ''), ''),
  current_workplace = COALESCE(NULLIF(canonical.current_workplace, ''), NULLIF(secondary.current_workplace, ''), ''),
  status = CASE
    WHEN canonical.status = $3 OR secondary.status = $3 THEN $3
    WHEN canonical.status = $4 OR secondary.status = $4 THEN $4
    WHEN canonical.status = $5 OR secondary.status = $5 THEN $5
    ELSE canonical.status
  END,
  primary_provider = COALESCE(NULLIF(canonical.primary_provider, ''), NULLIF(secondary.primary_provider, ''), ''),
  yandex_id = COALESCE(NULLIF(canonical.yandex_id, ''), NULLIF(secondary.yandex_id, ''), ''),
  yandex_login = COALESCE(NULLIF(canonical.yandex_login, ''), NULLIF(secondary.yandex_login, ''), ''),
  yandex_email = COALESCE(NULLIF(canonical.yandex_email, ''), NULLIF(secondary.yandex_email, ''), ''),
  yandex_avatar_url = COALESCE(NULLIF(canonical.yandex_avatar_url, ''), NULLIF(secondary.yandex_avatar_url, ''), ''),
  telegram_id = COALESCE(canonical.telegram_id, secondary.telegram_id),
  telegram_username = COALESCE(NULLIF(canonical.telegram_username, ''), NULLIF(secondary.telegram_username, ''), ''),
  telegram_avatar_url = COALESCE(NULLIF(canonical.telegram_avatar_url, ''), NULLIF(secondary.telegram_avatar_url, ''), ''),
  last_active_at = GREATEST(canonical.last_active_at, secondary.last_active_at),
  updated_at = NOW()
FROM users secondary
WHERE canonical.id = $1
  AND secondary.id = $2
`, canonicalUserID, secondaryUserID, model.UserStatusActive, model.UserStatusPendingProfile, model.UserStatusGuest); err != nil {
		return fmt.Errorf("merge user profiles: %w", err)
	}

	if _, err := tx.Exec(ctx, `DELETE FROM geo g USING geo keep WHERE g.user_id = $2 AND keep.user_id = $1`, canonicalUserID, secondaryUserID); err != nil {
		return fmt.Errorf("dedupe geo: %w", err)
	}
	if _, err := tx.Exec(ctx, `UPDATE geo SET user_id = $1 WHERE user_id = $2`, canonicalUserID, secondaryUserID); err != nil {
		return fmt.Errorf("move geo: %w", err)
	}
	if _, err := tx.Exec(ctx, `UPDATE sessions SET user_id = $1 WHERE user_id = $2`, canonicalUserID, secondaryUserID); err != nil {
		return fmt.Errorf("move sessions: %w", err)
	}
	if _, err := tx.Exec(ctx, `UPDATE events SET creator_id = $1 WHERE creator_id = $2`, canonicalUserID, secondaryUserID); err != nil {
		return fmt.Errorf("move events: %w", err)
	}
	if _, err := tx.Exec(ctx, `DELETE FROM event_participants ep USING event_participants keep WHERE ep.user_id = $2 AND keep.user_id = $1 AND keep.event_id = ep.event_id`, canonicalUserID, secondaryUserID); err != nil {
		return fmt.Errorf("dedupe event participants: %w", err)
	}
	if _, err := tx.Exec(ctx, `UPDATE event_participants SET user_id = $1 WHERE user_id = $2`, canonicalUserID, secondaryUserID); err != nil {
		return fmt.Errorf("move event participants: %w", err)
	}
	if _, err := tx.Exec(ctx, `UPDATE podcasts SET author_id = $1 WHERE author_id = $2`, canonicalUserID, secondaryUserID); err != nil {
		return fmt.Errorf("move podcasts: %w", err)
	}
	if _, err := tx.Exec(ctx, `UPDATE referrals SET user_id = $1 WHERE user_id = $2`, canonicalUserID, secondaryUserID); err != nil {
		return fmt.Errorf("move referrals: %w", err)
	}
	if _, err := tx.Exec(ctx, `UPDATE code_rooms SET creator_id = $1 WHERE creator_id = $2`, canonicalUserID, secondaryUserID); err != nil {
		return fmt.Errorf("move code room creators: %w", err)
	}
	if _, err := tx.Exec(ctx, `UPDATE code_rooms SET winner_user_id = $1 WHERE winner_user_id = $2`, canonicalUserID, secondaryUserID); err != nil {
		return fmt.Errorf("move code room winners: %w", err)
	}
	if _, err := tx.Exec(ctx, `DELETE FROM code_participants cp USING code_participants keep WHERE cp.user_id = $2 AND keep.user_id = $1 AND keep.room_id = cp.room_id`, canonicalUserID, secondaryUserID); err != nil {
		return fmt.Errorf("dedupe code participants: %w", err)
	}
	if _, err := tx.Exec(ctx, `UPDATE code_participants SET user_id = $1 WHERE user_id = $2`, canonicalUserID, secondaryUserID); err != nil {
		return fmt.Errorf("move code participants: %w", err)
	}
	if _, err := tx.Exec(ctx, `UPDATE code_submissions SET user_id = $1 WHERE user_id = $2`, canonicalUserID, secondaryUserID); err != nil {
		return fmt.Errorf("move code submissions: %w", err)
	}
	if _, err := tx.Exec(ctx, `UPDATE arena_matches SET creator_user_id = $1 WHERE creator_user_id = $2`, canonicalUserID, secondaryUserID); err != nil {
		return fmt.Errorf("move arena match creators: %w", err)
	}
	if _, err := tx.Exec(ctx, `UPDATE arena_matches SET winner_user_id = $1 WHERE winner_user_id = $2`, canonicalUserID, secondaryUserID); err != nil {
		return fmt.Errorf("move arena match winners: %w", err)
	}
	if _, err := tx.Exec(ctx, `DELETE FROM arena_match_players p USING arena_match_players keep WHERE p.user_id = $2 AND keep.user_id = $1 AND keep.match_id = p.match_id`, canonicalUserID, secondaryUserID); err != nil {
		return fmt.Errorf("dedupe arena match players: %w", err)
	}
	if _, err := tx.Exec(ctx, `UPDATE arena_match_players SET user_id = $1 WHERE user_id = $2`, canonicalUserID, secondaryUserID); err != nil {
		return fmt.Errorf("move arena match players: %w", err)
	}
	if _, err := tx.Exec(ctx, `DELETE FROM arena_editor_states s USING arena_editor_states keep WHERE s.user_id = $2 AND keep.user_id = $1 AND keep.match_id = s.match_id`, canonicalUserID, secondaryUserID); err != nil {
		return fmt.Errorf("dedupe arena editor states: %w", err)
	}
	if _, err := tx.Exec(ctx, `UPDATE arena_editor_states SET user_id = $1 WHERE user_id = $2`, canonicalUserID, secondaryUserID); err != nil {
		return fmt.Errorf("move arena editor states: %w", err)
	}
	if _, err := tx.Exec(ctx, `UPDATE arena_submissions SET user_id = $1 WHERE user_id = $2`, canonicalUserID, secondaryUserID); err != nil {
		return fmt.Errorf("move arena submissions: %w", err)
	}
	if _, err := tx.Exec(ctx, `DELETE FROM arena_rating_penalties p USING arena_rating_penalties keep WHERE p.user_id = $2 AND keep.user_id = $1 AND keep.match_id = p.match_id AND keep.reason = p.reason`, canonicalUserID, secondaryUserID); err != nil {
		return fmt.Errorf("dedupe arena rating penalties: %w", err)
	}
	if _, err := tx.Exec(ctx, `UPDATE arena_rating_penalties SET user_id = $1 WHERE user_id = $2`, canonicalUserID, secondaryUserID); err != nil {
		return fmt.Errorf("move arena rating penalties: %w", err)
	}
	if _, err := tx.Exec(ctx, `
INSERT INTO arena_match_queue (user_id, display_name, topic, difficulty, queued_at, updated_at)
SELECT $1, display_name, topic, difficulty, queued_at, NOW()
FROM arena_match_queue
WHERE user_id = $2
ON CONFLICT (user_id) DO NOTHING
`, canonicalUserID, secondaryUserID); err != nil {
		return fmt.Errorf("merge arena queue: %w", err)
	}
	if _, err := tx.Exec(ctx, `DELETE FROM arena_match_queue WHERE user_id = $1`, secondaryUserID); err != nil {
		return fmt.Errorf("delete secondary arena queue: %w", err)
	}
	if _, err := tx.Exec(ctx, `
INSERT INTO arena_player_stats (user_id, display_name, rating, wins, losses, matches, best_runtime_ms, updated_at)
SELECT $1, display_name, rating, wins, losses, matches, best_runtime_ms, NOW()
FROM arena_player_stats
WHERE user_id = $2
ON CONFLICT (user_id) DO UPDATE SET
  display_name = COALESCE(NULLIF(arena_player_stats.display_name, ''), NULLIF(EXCLUDED.display_name, ''), arena_player_stats.display_name),
  wins = arena_player_stats.wins + EXCLUDED.wins,
  losses = arena_player_stats.losses + EXCLUDED.losses,
  matches = arena_player_stats.matches + EXCLUDED.matches,
  best_runtime_ms = CASE
    WHEN arena_player_stats.best_runtime_ms = 0 THEN EXCLUDED.best_runtime_ms
    WHEN EXCLUDED.best_runtime_ms = 0 THEN arena_player_stats.best_runtime_ms
    ELSE LEAST(arena_player_stats.best_runtime_ms, EXCLUDED.best_runtime_ms)
  END,
  updated_at = NOW()
`, canonicalUserID, secondaryUserID); err != nil {
		return fmt.Errorf("merge arena player stats: %w", err)
	}
	if _, err := tx.Exec(ctx, `DELETE FROM arena_player_stats WHERE user_id = $1`, secondaryUserID); err != nil {
		return fmt.Errorf("delete secondary arena stats: %w", err)
	}
	if _, err := tx.Exec(ctx, `
DELETE FROM interview_prep_sessions src
USING interview_prep_sessions keep
WHERE src.user_id = $2
  AND keep.user_id = $1
  AND src.task_id = keep.task_id
  AND src.status = 'active'
  AND keep.status = 'active'
`, canonicalUserID, secondaryUserID); err != nil {
		return fmt.Errorf("dedupe interview prep sessions: %w", err)
	}
	if _, err := tx.Exec(ctx, `UPDATE interview_prep_sessions SET user_id = $1 WHERE user_id = $2`, canonicalUserID, secondaryUserID); err != nil {
		return fmt.Errorf("move interview prep sessions: %w", err)
	}
	if _, err := tx.Exec(ctx, `UPDATE interview_prep_mock_sessions SET user_id = $1 WHERE user_id = $2`, canonicalUserID, secondaryUserID); err != nil {
		return fmt.Errorf("move mock interview sessions: %w", err)
	}
	if _, err := tx.Exec(ctx, `DELETE FROM users WHERE id = $1`, secondaryUserID); err != nil {
		return fmt.Errorf("delete secondary user: %w", err)
	}

	return nil
}

func (r *Repo) BindIdentity(ctx context.Context, userID uuid.UUID, payload model.IdentityAuthPayload) (*model.User, error) {
	tx, err := r.data.DB.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, fmt.Errorf("begin tx: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	if _, err := r.selectUserByIDTx(ctx, tx, userID); err != nil {
		return nil, err
	}

	existingUser, err := r.FindUserByProviderIdentity(ctx, payload.Provider, payload.ProviderUserID)
	if err != nil && !errors.Is(err, profileerrors.ErrUserNotFound) {
		return nil, err
	}

	if existingUser != nil && existingUser.ID != userID {
		if err := r.mergeUsersTx(ctx, tx, userID, existingUser.ID); err != nil {
			return nil, err
		}
	}

	if err := r.bindProviderToUserTx(ctx, tx, userID, payload); err != nil {
		return nil, err
	}

	user, err := r.selectUserByIDTx(ctx, tx, userID)
	if err != nil {
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("commit tx: %w", err)
	}
	return user, nil
}

func (r *Repo) DeleteUser(ctx context.Context, userID uuid.UUID) error {
	tag, err := r.data.DB.Exec(ctx, `DELETE FROM users WHERE id = $1`, userID)
	if err != nil {
		return fmt.Errorf("delete user: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return profileerrors.ErrUserNotFound
	}
	return nil
}

func (r *Repo) UpdateUserTrusted(ctx context.Context, userID uuid.UUID, isTrusted bool) error {
	if r == nil || !r.hasTrustedFlag {
		return nil
	}

	tag, err := r.data.DB.Exec(ctx, `
		UPDATE users
		SET is_trusted = $2,
		    updated_at = NOW()
		WHERE id = $1
	`, userID, isTrusted)
	if err != nil {
		return fmt.Errorf("update user trusted: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return profileerrors.ErrUserNotFound
	}
	return nil
}

func (r *Repo) UpdateUserAdmin(ctx context.Context, userID uuid.UUID, isAdmin bool) error {
	tag, err := r.data.DB.Exec(ctx, `
		UPDATE users
		SET is_admin = $2,
		    updated_at = NOW()
		WHERE id = $1
	`, userID, isAdmin)
	if err != nil {
		return fmt.Errorf("update user admin: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return profileerrors.ErrUserNotFound
	}
	return nil
}
