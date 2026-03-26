package room

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"api/internal/model"
	roomdomain "api/internal/room/service"
	"api/internal/storage/postgres"

	kratoserrors "github.com/go-kratos/kratos/v2/errors"
	"github.com/go-kratos/kratos/v2/log"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

type Repo struct {
	data *postgres.Store
	log  *log.Helper
}

func NewRepo(dataLayer *postgres.Store, logger log.Logger) roomdomain.Repository {
	return &Repo{
		data: dataLayer,
		log:  log.NewHelper(logger),
	}
}

func (r *Repo) ListRooms(ctx context.Context, currentUser *model.User, opts model.ListRoomsOptions) (*model.ListRoomsResponse, error) {
	// Apply defaults
	if opts.Limit <= 0 || opts.Limit > model.MaxRoomsLimit {
		opts.Limit = model.DefaultRoomsLimit
	}

	currentUserID := nullableUUID(currentUser)
	isAdmin := currentUser != nil && currentUser.IsAdmin

	// Get total count
	var totalCount int32
	countQuery := `
SELECT COUNT(*)
FROM rooms r
WHERE (r.is_private = FALSE OR r.creator_id = $1 OR $2 = TRUE
       OR EXISTS (SELECT 1 FROM room_members rm WHERE rm.room_id = r.id AND rm.user_id = $1))
`
	countArgs := []any{currentUserID, isAdmin}
	if opts.Kind != "" {
		countQuery += " AND r.kind = $3"
		countArgs = append(countArgs, opts.Kind)
	}
	if err := r.data.DB.QueryRow(ctx, countQuery, countArgs...).Scan(&totalCount); err != nil {
		return nil, fmt.Errorf("count rooms: %w", err)
	}

	// Build paginated query
	conditions := []string{}
	args := []any{currentUserID, isAdmin}
	argNum := 3

	if opts.Kind != "" {
		conditions = append(conditions, fmt.Sprintf("r.kind = $%d", argNum))
		args = append(args, opts.Kind)
		argNum++
	}

	whereClause := "(r.is_private = FALSE OR r.creator_id = $1 OR $2 = TRUE OR EXISTS (SELECT 1 FROM room_members rm WHERE rm.room_id = r.id AND rm.user_id = $1))"
	if len(conditions) > 0 {
		whereClause += " AND " + strings.Join(conditions, " AND ")
	}

	query := fmt.Sprintf(`
WITH room_member_counts AS (
  SELECT room_id, COUNT(*)::int AS member_count
  FROM room_members
  GROUP BY room_id
)
SELECT
  r.id,
  r.title,
  r.kind,
  COALESCE(r.description, ''),
  r.is_private,
  r.creator_id::text,
  COALESCE(NULLIF(TRIM(CONCAT_WS(' ', u.first_name, u.last_name)), ''), NULLIF(u.telegram_username, ''), 'user'),
  COALESCE(rmc.member_count, 0),
  (own_rm.user_id IS NOT NULL),
  (r.creator_id = $1),
  r.created_at,
  r.updated_at,
  COALESCE(ms.media_url, ''),
  COALESCE(ms.paused, true),
  COALESCE(ms.current_time_seconds, 0),
  COALESCE(ms.updated_by::text, ''),
  COALESCE(NULLIF(TRIM(CONCAT_WS(' ', mu.first_name, mu.last_name)), ''), NULLIF(mu.telegram_username, ''), ''),
  ms.updated_at
FROM rooms r
JOIN users u ON u.id = r.creator_id
LEFT JOIN room_member_counts rmc ON rmc.room_id = r.id
LEFT JOIN room_members own_rm ON own_rm.room_id = r.id AND own_rm.user_id = $1
LEFT JOIN room_media_state ms ON ms.room_id = r.id
LEFT JOIN users mu ON mu.id = ms.updated_by
WHERE %s
ORDER BY r.created_at DESC
LIMIT $%d OFFSET $%d
`, whereClause, argNum, argNum+1)

	args = append(args, opts.Limit, opts.Offset)

	rows, err := r.data.DB.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("query rooms: %w", err)
	}
	defer rows.Close()

	items := make([]*model.Room, 0)
	for rows.Next() {
		room, err := scanRoomRow(rows)
		if err != nil {
			return nil, err
		}
		items = append(items, room)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate rooms: %w", err)
	}

	hasNextPage := opts.Offset+opts.Limit < totalCount

	return &model.ListRoomsResponse{
		Rooms:       items,
		Limit:       opts.Limit,
		Offset:      opts.Offset,
		TotalCount:  totalCount,
		HasNextPage: hasNextPage,
	}, nil
}

func (r *Repo) GetRoom(ctx context.Context, roomID uuid.UUID, currentUser *model.User) (*model.Room, error) {
	currentUserID := nullableUUID(currentUser)
	rows, err := r.data.DB.Query(ctx, `
WITH room_member_counts AS (
  SELECT room_id, COUNT(*)::int AS member_count
  FROM room_members
  WHERE room_id = $1
  GROUP BY room_id
)
SELECT
  r.id,
  r.title,
  r.kind,
  COALESCE(r.description, ''),
  r.is_private,
  r.creator_id::text,
  COALESCE(NULLIF(TRIM(CONCAT_WS(' ', u.first_name, u.last_name)), ''), NULLIF(u.telegram_username, ''), 'user'),
  (SELECT COUNT(*)::int FROM room_members rm WHERE rm.room_id = r.id),
  EXISTS (SELECT 1 FROM room_members rm WHERE rm.room_id = r.id AND rm.user_id = $2),
  (r.creator_id = $2),
  r.created_at,
  r.updated_at,
  COALESCE(ms.media_url, ''),
  COALESCE(ms.paused, true),
  COALESCE(ms.current_time_seconds, 0),
  COALESCE(ms.updated_by::text, ''),
  COALESCE(NULLIF(TRIM(CONCAT_WS(' ', mu.first_name, mu.last_name)), ''), NULLIF(mu.telegram_username, ''), ''),
  ms.updated_at,
  p.id::text,
  COALESCE(NULLIF(TRIM(CONCAT_WS(' ', p.first_name, p.last_name)), ''), NULLIF(p.telegram_username, ''), 'user'),
  COALESCE(p.avatar_url, ''),
  COALESCE(p.telegram_username, ''),
  COALESCE(p.first_name, ''),
  COALESCE(p.last_name, ''),
  rm.joined_at
FROM rooms r
JOIN users u ON u.id = r.creator_id
LEFT JOIN room_member_counts rmc ON rmc.room_id = r.id
LEFT JOIN room_members own_rm ON own_rm.room_id = r.id AND own_rm.user_id = $2
LEFT JOIN room_media_state ms ON ms.room_id = r.id
LEFT JOIN users mu ON mu.id = ms.updated_by
LEFT JOIN room_members rm ON rm.room_id = r.id
LEFT JOIN users p ON p.id = rm.user_id
WHERE r.id = $1
ORDER BY rm.joined_at ASC
`, roomID, currentUserID)
	if err != nil {
		return nil, fmt.Errorf("query room: %w", err)
	}
	defer rows.Close()

	room, err := scanRoomWithParticipants(rows, currentUser)
	if err != nil {
		return nil, err
	}
	return room, nil
}

func (r *Repo) CreateRoom(ctx context.Context, user *model.User, req model.CreateRoomRequest) (*model.Room, error) {
	tx, err := r.data.DB.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, fmt.Errorf("begin tx: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	roomID := uuid.New()
	if _, err := tx.Exec(ctx, `
INSERT INTO rooms (id, title, kind, description, is_private, creator_id, created_at, updated_at)
VALUES ($1, $2, $3, NULLIF($4, ''), $5, $6, NOW(), NOW())
`, roomID, req.Title, req.Kind, req.Description, req.IsPrivate, user.ID); err != nil {
		return nil, fmt.Errorf("insert room: %w", err)
	}

	if _, err := tx.Exec(ctx, `
INSERT INTO room_members (room_id, user_id, joined_at)
VALUES ($1, $2, NOW())
ON CONFLICT (room_id, user_id) DO NOTHING
`, roomID, user.ID); err != nil {
		return nil, fmt.Errorf("insert room creator membership: %w", err)
	}

	if req.Kind == model.RoomKindWatchParty || req.MediaURL != "" {
		if _, err := tx.Exec(ctx, `
INSERT INTO room_media_state (room_id, media_url, paused, current_time_seconds, updated_by, updated_at)
VALUES ($1, NULLIF($2, ''), TRUE, 0, $3, NOW())
ON CONFLICT (room_id) DO UPDATE SET
  media_url = EXCLUDED.media_url,
  paused = EXCLUDED.paused,
  current_time_seconds = EXCLUDED.current_time_seconds,
  updated_by = EXCLUDED.updated_by,
  updated_at = NOW()
`, roomID, req.MediaURL, user.ID); err != nil {
			return nil, fmt.Errorf("upsert room media state: %w", err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("commit tx: %w", err)
	}
	return r.GetRoom(ctx, roomID, user)
}

func (r *Repo) UpdateRoom(ctx context.Context, roomID uuid.UUID, user *model.User, req model.UpdateRoomRequest) (*model.Room, error) {
	tx, err := r.data.DB.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, fmt.Errorf("begin tx: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	if err := lockRoomManager(ctx, tx, roomID, user); err != nil {
		return nil, err
	}

	if _, err := tx.Exec(ctx, `
UPDATE rooms
SET title = $2,
    description = NULLIF($3, ''),
    is_private = $4,
    updated_at = NOW()
WHERE id = $1
`, roomID, req.Title, req.Description, req.IsPrivate); err != nil {
		return nil, fmt.Errorf("update room: %w", err)
	}

	if _, err := tx.Exec(ctx, `
INSERT INTO room_media_state (room_id, media_url, paused, current_time_seconds, updated_by, updated_at)
VALUES ($1, NULLIF($2, ''), TRUE, 0, $3, NOW())
ON CONFLICT (room_id) DO UPDATE SET
  media_url = EXCLUDED.media_url,
  updated_by = EXCLUDED.updated_by,
  updated_at = NOW()
`, roomID, req.MediaURL, user.ID); err != nil {
		return nil, fmt.Errorf("upsert room media state on update: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("commit tx: %w", err)
	}
	return r.GetRoom(ctx, roomID, user)
}

func (r *Repo) DeleteRoom(ctx context.Context, roomID uuid.UUID, user *model.User) error {
	if err := r.ensureRoomManager(ctx, roomID, user); err != nil {
		return err
	}
	tag, err := r.data.DB.Exec(ctx, `DELETE FROM rooms WHERE id = $1`, roomID)
	if err != nil {
		return fmt.Errorf("delete room: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return kratoserrors.NotFound("ROOM_NOT_FOUND", "room not found")
	}
	return nil
}

func (r *Repo) EnsureRoomMembership(ctx context.Context, roomID uuid.UUID, user *model.User) (*model.Room, error) {
	if user == nil {
		return r.GetRoom(ctx, roomID, nil)
	}

	var (
		roomExists bool
		allowed    bool
	)
	if err := r.data.DB.QueryRow(ctx, `
WITH target_room AS (
  SELECT
    r.id,
    r.is_private,
    r.creator_id,
    EXISTS (
      SELECT 1
      FROM room_members rm
      WHERE rm.room_id = r.id AND rm.user_id = $2
    ) AS is_member
  FROM rooms r
  WHERE r.id = $1
),
permission AS (
  SELECT id
  FROM target_room
  WHERE is_private = FALSE OR creator_id = $2 OR $3 = TRUE OR is_member
),
inserted AS (
  INSERT INTO room_members (room_id, user_id, joined_at)
  SELECT id, $2, NOW()
  FROM permission
  ON CONFLICT (room_id, user_id) DO NOTHING
  RETURNING room_id
)
SELECT
  EXISTS (SELECT 1 FROM target_room),
  EXISTS (SELECT 1 FROM permission)
`, roomID, user.ID, user.IsAdmin).Scan(&roomExists, &allowed); err != nil {
		return nil, fmt.Errorf("ensure room membership: %w", err)
	}
	if !roomExists {
		return nil, kratoserrors.NotFound("ROOM_NOT_FOUND", "room not found")
	}
	if !allowed {
		return nil, kratoserrors.Forbidden("FORBIDDEN", "forbidden")
	}
	return r.GetRoom(ctx, roomID, user)
}

func (r *Repo) GetRoomMediaState(ctx context.Context, roomID uuid.UUID, user *model.User) (*model.RoomMediaState, error) {
	roomExists, allowed, state, err := r.loadRoomMediaState(ctx, roomID, user)
	if err != nil {
		return nil, err
	}
	if !roomExists {
		return nil, kratoserrors.NotFound("ROOM_NOT_FOUND", "room not found")
	}
	if !allowed {
		return nil, kratoserrors.Forbidden("FORBIDDEN", "forbidden")
	}
	return state, nil
}

func (r *Repo) UpsertRoomMediaState(ctx context.Context, roomID uuid.UUID, user *model.User, req model.UpsertRoomMediaStateRequest) (*model.RoomMediaState, error) {
	if user == nil {
		return nil, kratoserrors.Unauthorized("UNAUTHORIZED", "unauthorized")
	}
	var (
		roomExists bool
		allowed    bool
		item       model.RoomMediaState
	)
	if err := r.data.DB.QueryRow(ctx, `
WITH target_room AS (
  SELECT
    r.id,
    r.is_private,
    r.creator_id,
    EXISTS (
      SELECT 1
      FROM room_members rm
      WHERE rm.room_id = r.id AND rm.user_id = $2
    ) AS is_member
  FROM rooms r
  WHERE r.id = $1
),
permission AS (
  SELECT id
  FROM target_room
  WHERE is_private = FALSE OR creator_id = $2 OR $3 = TRUE OR is_member
),
inserted_member AS (
  INSERT INTO room_members (room_id, user_id, joined_at)
  SELECT id, $2, NOW()
  FROM permission
  ON CONFLICT (room_id, user_id) DO NOTHING
),
upserted AS (
  INSERT INTO room_media_state (room_id, media_url, paused, current_time_seconds, updated_by, updated_at)
  SELECT id, NULLIF($4, ''), $5, $6, $2, NOW()
  FROM permission
  ON CONFLICT (room_id) DO UPDATE SET
    media_url = EXCLUDED.media_url,
    paused = EXCLUDED.paused,
    current_time_seconds = EXCLUDED.current_time_seconds,
    updated_by = EXCLUDED.updated_by,
    updated_at = NOW()
  RETURNING room_id, media_url, paused, current_time_seconds, updated_by, updated_at
)
SELECT
  EXISTS (SELECT 1 FROM target_room),
  EXISTS (SELECT 1 FROM permission),
  COALESCE(upserted.room_id::text, ''),
  COALESCE(upserted.media_url, ''),
  COALESCE(upserted.paused, true),
  COALESCE(upserted.current_time_seconds, 0),
  COALESCE(upserted.updated_by::text, ''),
  COALESCE(NULLIF(TRIM(CONCAT_WS(' ', u.first_name, u.last_name)), ''), NULLIF(u.telegram_username, ''), ''),
  upserted.updated_at
FROM (SELECT 1) AS stub
LEFT JOIN upserted ON TRUE
LEFT JOIN users u ON u.id = upserted.updated_by
`, roomID, user.ID, user.IsAdmin, req.MediaURL, req.Paused, req.CurrentTimeSeconds).Scan(
		&roomExists,
		&allowed,
		&item.RoomID,
		&item.MediaURL,
		&item.Paused,
		&item.CurrentTimeSeconds,
		&item.UpdatedBy,
		&item.UpdatedByName,
		&item.UpdatedAt,
	); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			if !roomExists {
				return nil, kratoserrors.NotFound("ROOM_NOT_FOUND", "room not found")
			}
			if !allowed {
				return nil, kratoserrors.Forbidden("FORBIDDEN", "forbidden")
			}
			return &model.RoomMediaState{}, nil
		}
		return nil, fmt.Errorf("upsert room media state: %w", err)
	}
	return &item, nil
}

func (r *Repo) ensureRoomManager(ctx context.Context, roomID uuid.UUID, user *model.User) error {
	if user == nil {
		return kratoserrors.Unauthorized("UNAUTHORIZED", "unauthorized")
	}
	if user.IsAdmin {
		return nil
	}
	var creatorID uuid.UUID
	if err := r.data.DB.QueryRow(ctx, `SELECT creator_id FROM rooms WHERE id = $1`, roomID).Scan(&creatorID); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return kratoserrors.NotFound("ROOM_NOT_FOUND", "room not found")
		}
		return fmt.Errorf("load room creator: %w", err)
	}
	if creatorID != user.ID {
		return kratoserrors.Forbidden("FORBIDDEN", "forbidden")
	}
	return nil
}

func lockRoomManager(ctx context.Context, tx pgx.Tx, roomID uuid.UUID, user *model.User) error {
	if user == nil {
		return kratoserrors.Unauthorized("UNAUTHORIZED", "unauthorized")
	}

	var creatorID uuid.UUID
	if err := tx.QueryRow(ctx, `SELECT creator_id FROM rooms WHERE id = $1 FOR UPDATE`, roomID).Scan(&creatorID); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return kratoserrors.NotFound("ROOM_NOT_FOUND", "room not found")
		}
		return fmt.Errorf("lock room creator: %w", err)
	}
	if user.IsAdmin {
		return nil
	}
	if creatorID != user.ID {
		return kratoserrors.Forbidden("FORBIDDEN", "forbidden")
	}
	return nil
}

type roomScanner interface {
	Scan(dest ...any) error
}

func (r *Repo) loadRoomMediaState(ctx context.Context, roomID uuid.UUID, user *model.User) (bool, bool, *model.RoomMediaState, error) {
	var (
		roomExists bool
		allowed    bool
		item       model.RoomMediaState
	)
	userID := nullableUUID(user)
	isAdmin := user != nil && user.IsAdmin

	if err := r.data.DB.QueryRow(ctx, `
WITH target_room AS (
  SELECT
    r.id,
    r.is_private,
    r.creator_id,
    EXISTS (
      SELECT 1
      FROM room_members rm
      WHERE rm.room_id = r.id AND rm.user_id = $2
    ) AS is_member
  FROM rooms r
  WHERE r.id = $1
)
SELECT
  EXISTS (SELECT 1 FROM target_room),
  EXISTS (
    SELECT 1
    FROM target_room
    WHERE is_private = FALSE OR creator_id = $2 OR $3 = TRUE OR is_member
  ),
  COALESCE(ms.room_id::text, ''),
  COALESCE(ms.media_url, ''),
  COALESCE(ms.paused, true),
  COALESCE(ms.current_time_seconds, 0),
  COALESCE(ms.updated_by::text, ''),
  COALESCE(NULLIF(TRIM(CONCAT_WS(' ', u.first_name, u.last_name)), ''), NULLIF(u.telegram_username, ''), ''),
  ms.updated_at
FROM target_room tr
LEFT JOIN room_media_state ms ON ms.room_id = tr.id
LEFT JOIN users u ON u.id = ms.updated_by
`, roomID, userID, isAdmin).Scan(
		&roomExists,
		&allowed,
		&item.RoomID,
		&item.MediaURL,
		&item.Paused,
		&item.CurrentTimeSeconds,
		&item.UpdatedBy,
		&item.UpdatedByName,
		&item.UpdatedAt,
	); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return false, false, nil, nil
		}
		return false, false, nil, fmt.Errorf("load room media state: %w", err)
	}
	if item.RoomID == "" {
		return roomExists, allowed, &model.RoomMediaState{}, nil
	}
	return roomExists, allowed, &item, nil
}

func scanRoomRow(scanner roomScanner) (*model.Room, error) {
	var (
		item             model.Room
		memberCount      int32
		mediaURL         string
		mediaPaused      bool
		currentTime      int32
		updatedBy        string
		updatedByName    string
		mediaUpdatedTime *time.Time
	)
	if err := scanner.Scan(
		&item.ID,
		&item.Title,
		&item.Kind,
		&item.Description,
		&item.IsPrivate,
		&item.CreatorID,
		&item.CreatorName,
		&memberCount,
		&item.IsJoined,
		&item.IsOwner,
		&item.CreatedAt,
		&item.UpdatedAt,
		&mediaURL,
		&mediaPaused,
		&currentTime,
		&updatedBy,
		&updatedByName,
		&mediaUpdatedTime,
	); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, kratoserrors.NotFound("ROOM_NOT_FOUND", "room not found")
		}
		return nil, fmt.Errorf("scan room: %w", err)
	}
	item.MemberCount = memberCount
	if mediaURL != "" || updatedBy != "" || mediaUpdatedTime != nil {
		updatedAt := item.UpdatedAt
		if mediaUpdatedTime != nil {
			updatedAt = *mediaUpdatedTime
		}
		item.MediaState = &model.RoomMediaState{
			RoomID:             item.ID.String(),
			MediaURL:           mediaURL,
			Paused:             mediaPaused,
			CurrentTimeSeconds: currentTime,
			UpdatedBy:          updatedBy,
			UpdatedByName:      updatedByName,
			UpdatedAt:          updatedAt,
		}
	}
	return &item, nil
}

func scanRoomWithParticipants(rows pgx.Rows, currentUser *model.User) (*model.Room, error) {
	defer rows.Close()

	var room *model.Room
	for rows.Next() {
		var (
			item             model.Room
			memberCount      int32
			mediaURL         string
			mediaPaused      bool
			currentTime      int32
			updatedBy        string
			updatedByName    string
			mediaUpdatedTime *time.Time
			participantID    *string
			participantTitle *string
			avatarURL        *string
			username         *string
			firstName        *string
			lastName         *string
			joinedAt         *time.Time
		)
		if err := rows.Scan(
			&item.ID,
			&item.Title,
			&item.Kind,
			&item.Description,
			&item.IsPrivate,
			&item.CreatorID,
			&item.CreatorName,
			&memberCount,
			&item.IsJoined,
			&item.IsOwner,
			&item.CreatedAt,
			&item.UpdatedAt,
			&mediaURL,
			&mediaPaused,
			&currentTime,
			&updatedBy,
			&updatedByName,
			&mediaUpdatedTime,
			&participantID,
			&participantTitle,
			&avatarURL,
			&username,
			&firstName,
			&lastName,
			&joinedAt,
		); err != nil {
			return nil, fmt.Errorf("scan room with participants: %w", err)
		}

		if room == nil {
			item.MemberCount = memberCount
			if mediaURL != "" || updatedBy != "" || mediaUpdatedTime != nil {
				updatedAt := item.UpdatedAt
				if mediaUpdatedTime != nil {
					updatedAt = *mediaUpdatedTime
				}
				item.MediaState = &model.RoomMediaState{
					RoomID:             item.ID.String(),
					MediaURL:           mediaURL,
					Paused:             mediaPaused,
					CurrentTimeSeconds: currentTime,
					UpdatedBy:          updatedBy,
					UpdatedByName:      updatedByName,
					UpdatedAt:          updatedAt,
				}
			}
			item.Participants = make([]*model.RoomParticipant, 0)
			room = &item
		}

		if participantID == nil || *participantID == "" || joinedAt == nil {
			continue
		}
		room.Participants = append(room.Participants, &model.RoomParticipant{
			UserID:           *participantID,
			Title:            valueOrEmpty(participantTitle),
			AvatarURL:        valueOrEmpty(avatarURL),
			TelegramUsername: valueOrEmpty(username),
			FirstName:        valueOrEmpty(firstName),
			LastName:         valueOrEmpty(lastName),
			IsCurrentUser:    currentUser != nil && *participantID == currentUser.ID.String(),
			JoinedAt:         *joinedAt,
		})
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate room with participants: %w", err)
	}
	if room == nil {
		return nil, kratoserrors.NotFound("ROOM_NOT_FOUND", "room not found")
	}
	if err := ensureRoomVisible(room, currentUser); err != nil {
		return nil, err
	}
	return room, nil
}

func nullableUUID(user *model.User) any {
	if user == nil {
		return nil
	}
	return user.ID
}

func ensureRoomVisible(room *model.Room, user *model.User) error {
	if room == nil {
		return kratoserrors.NotFound("ROOM_NOT_FOUND", "room not found")
	}
	if !room.IsPrivate {
		return nil
	}
	if user == nil {
		return kratoserrors.Forbidden("FORBIDDEN", "forbidden")
	}
	if user.IsAdmin || room.IsOwner || room.IsJoined {
		return nil
	}
	return kratoserrors.Forbidden("FORBIDDEN", "forbidden")
}

func valueOrEmpty(value *string) string {
	if value == nil {
		return ""
	}
	return *value
}
