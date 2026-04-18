package social

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"api/internal/model"
	"api/internal/storage/postgres"

	"github.com/go-kratos/kratos/v2/log"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"

	socialdomain "api/internal/domain/social"
)

type Repo struct {
	data *postgres.Store
	log  *log.Helper
}

func NewRepo(store *postgres.Store, logger log.Logger) *Repo {
	return &Repo{data: store, log: log.NewHelper(logger)}
}

// Canonical orientation so friendships_pkey stays unique regardless of
// which side calls the API.
func canon(a, b uuid.UUID) (uuid.UUID, uuid.UUID) {
	if a.String() < b.String() {
		return a, b
	}
	return b, a
}

// ListFriends joins friendships with users to produce Friend rows. Presence
// status is derived from the users.activity_status column (same enum used
// by the profile service).
func (r *Repo) ListFriends(ctx context.Context, userID uuid.UUID, limit, offset int32) ([]*model.Friend, int32, int32, error) {
	rows, err := r.data.DB.Query(ctx, `
        SELECT u.id, COALESCE(u.username, '') AS username,
               TRIM(CONCAT_WS(' ', u.first_name, u.last_name)) AS display_name,
               COALESCE(u.avatar_url, '') AS avatar_url,
               COALESCE(u.activity_status, 0) AS activity_status,
               u.last_active_at,
               CASE WHEN f.user_a = $1 THEN f.a_favorite ELSE f.b_favorite END AS is_favorite,
               f.created_at AS friends_since
        FROM friendships f
        JOIN users u ON u.id = CASE WHEN f.user_a = $1 THEN f.user_b ELSE f.user_a END
        WHERE $1 IN (f.user_a, f.user_b)
        ORDER BY is_favorite DESC, u.last_active_at DESC NULLS LAST
        LIMIT $2 OFFSET $3
    `, userID, limit, offset)
	if err != nil {
		return nil, 0, 0, fmt.Errorf("list friends: %w", err)
	}
	defer rows.Close()

	friends := make([]*model.Friend, 0, limit)
	for rows.Next() {
		var f model.Friend
		var activity int16
		var lastSeen *time.Time
		if err := rows.Scan(
			&f.UserID, &f.Username, &f.DisplayName, &f.AvatarURL, &activity, &lastSeen, &f.IsFavorite, &f.FriendsSince,
		); err != nil {
			return nil, 0, 0, fmt.Errorf("scan friend: %w", err)
		}
		f.Presence = mapPresence(activity, lastSeen)
		if lastSeen != nil {
			f.LastSeenAt = *lastSeen
		}
		// TODO(social): `LastActivity` string ("in duel", "training") would
		// join against the arena/training state. Leaving empty for now.
		friends = append(friends, &f)
	}

	var total, online int32
	if err := r.data.DB.QueryRow(ctx, `
        SELECT COUNT(*),
               COUNT(*) FILTER (WHERE u.activity_status = 1)
        FROM friendships f
        JOIN users u ON u.id = CASE WHEN f.user_a = $1 THEN f.user_b ELSE f.user_a END
        WHERE $1 IN (f.user_a, f.user_b)
    `, userID).Scan(&total, &online); err != nil {
		return nil, 0, 0, fmt.Errorf("count friends: %w", err)
	}
	return friends, total, online, nil
}

func (r *Repo) AreFriends(ctx context.Context, a, b uuid.UUID) (bool, error) {
	ua, ub := canon(a, b)
	var exists bool
	err := r.data.DB.QueryRow(ctx, `
        SELECT EXISTS(SELECT 1 FROM friendships WHERE user_a = $1 AND user_b = $2)
    `, ua, ub).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("are friends: %w", err)
	}
	return exists, nil
}

func (r *Repo) RemoveFriendship(ctx context.Context, a, b uuid.UUID) error {
	ua, ub := canon(a, b)
	_, err := r.data.DB.Exec(ctx, `DELETE FROM friendships WHERE user_a = $1 AND user_b = $2`, ua, ub)
	if err != nil {
		return fmt.Errorf("remove friendship: %w", err)
	}
	return nil
}

func (r *Repo) GetPendingRequestsByUser(ctx context.Context, userID uuid.UUID) (*model.FriendRequestBuckets, error) {
	rows, err := r.data.DB.Query(ctx, `
        SELECT fr.id, fr.from_user_id, COALESCE(u.username, '') AS from_username,
               fr.to_user_id, fr.message, fr.status, fr.created_at
        FROM friend_requests fr
        JOIN users u ON u.id = fr.from_user_id
        WHERE fr.status = 1 AND (fr.from_user_id = $1 OR fr.to_user_id = $1)
        ORDER BY fr.created_at DESC
    `, userID)
	if err != nil {
		return nil, fmt.Errorf("list pending requests: %w", err)
	}
	defer rows.Close()

	out := &model.FriendRequestBuckets{Incoming: []*model.FriendRequest{}, Outgoing: []*model.FriendRequest{}}
	for rows.Next() {
		req, err := scanRequest(rows)
		if err != nil {
			return nil, err
		}
		if req.ToUserID == userID {
			out.Incoming = append(out.Incoming, req)
		} else {
			out.Outgoing = append(out.Outgoing, req)
		}
	}
	return out, rows.Err()
}

func (r *Repo) GetRequestByID(ctx context.Context, id uuid.UUID) (*model.FriendRequest, error) {
	row := r.data.DB.QueryRow(ctx, `
        SELECT fr.id, fr.from_user_id, COALESCE(u.username, ''),
               fr.to_user_id, fr.message, fr.status, fr.created_at
        FROM friend_requests fr
        JOIN users u ON u.id = fr.from_user_id
        WHERE fr.id = $1
    `, id)
	req, err := scanRequest(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("get request: %w", err)
	}
	return req, nil
}

func (r *Repo) InsertRequest(ctx context.Context, req *model.FriendRequest) error {
	_, err := r.data.DB.Exec(ctx, `
        INSERT INTO friend_requests (id, from_user_id, to_user_id, message, status, created_at)
        VALUES ($1, $2, $3, $4, $5, $6)
    `, req.ID, req.FromUserID, req.ToUserID, req.Message, int16(req.Status), req.CreatedAt)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" && strings.Contains(pgErr.ConstraintName, "pending_pair") {
			return socialdomain.ErrRequestPending
		}
		return fmt.Errorf("insert request: %w", err)
	}
	return nil
}

func (r *Repo) UpdateRequestStatus(ctx context.Context, id uuid.UUID, status model.FriendRequestStatus, now time.Time) error {
	_, err := r.data.DB.Exec(ctx, `
        UPDATE friend_requests SET status = $2, resolved_at = $3 WHERE id = $1
    `, id, int16(status), now)
	if err != nil {
		return fmt.Errorf("update request status: %w", err)
	}
	return nil
}

func (r *Repo) InsertFriendship(ctx context.Context, a, b uuid.UUID) (time.Time, error) {
	ua, ub := canon(a, b)
	var createdAt time.Time
	err := r.data.DB.QueryRow(ctx, `
        INSERT INTO friendships (user_a, user_b) VALUES ($1, $2)
        ON CONFLICT (user_a, user_b) DO UPDATE SET created_at = friendships.created_at
        RETURNING created_at
    `, ua, ub).Scan(&createdAt)
	if err != nil {
		return time.Time{}, fmt.Errorf("insert friendship: %w", err)
	}
	return createdAt, nil
}

func (r *Repo) GetFriendByID(ctx context.Context, viewerID, friendID uuid.UUID) (*model.Friend, error) {
	row := r.data.DB.QueryRow(ctx, `
        SELECT u.id, COALESCE(u.username, ''),
               TRIM(CONCAT_WS(' ', u.first_name, u.last_name)),
               COALESCE(u.avatar_url, ''),
               COALESCE(u.activity_status, 0),
               u.last_active_at,
               CASE WHEN f.user_a = $1 THEN f.a_favorite ELSE f.b_favorite END,
               f.created_at
        FROM users u
        JOIN friendships f ON
             ($1 = f.user_a AND f.user_b = u.id) OR ($1 = f.user_b AND f.user_a = u.id)
        WHERE u.id = $2
    `, viewerID, friendID)

	var f model.Friend
	var activity int16
	var lastSeen *time.Time
	err := row.Scan(&f.UserID, &f.Username, &f.DisplayName, &f.AvatarURL, &activity, &lastSeen, &f.IsFavorite, &f.FriendsSince)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("get friend by id: %w", err)
	}
	f.Presence = mapPresence(activity, lastSeen)
	if lastSeen != nil {
		f.LastSeenAt = *lastSeen
	}
	return &f, nil
}

// mapPresence translates users.activity_status + last_active_at into the
// client-facing PresenceStatus. The fallback is OFFLINE so missing rows
// render correctly.
func mapPresence(status int16, lastSeen *time.Time) model.PresenceStatus {
	switch status {
	case 1:
		return model.PresenceStatusOnline
	case 2:
		return model.PresenceStatusAway
	case 3:
		return model.PresenceStatusOffline
	}
	if lastSeen == nil {
		return model.PresenceStatusOffline
	}
	if time.Since(*lastSeen) < 5*time.Minute {
		return model.PresenceStatusOnline
	}
	if time.Since(*lastSeen) < 30*time.Minute {
		return model.PresenceStatusAway
	}
	return model.PresenceStatusOffline
}

type scanner interface{ Scan(dest ...any) error }

func scanRequest(s scanner) (*model.FriendRequest, error) {
	var req model.FriendRequest
	var status int16
	err := s.Scan(&req.ID, &req.FromUserID, &req.FromUsername, &req.ToUserID, &req.Message, &status, &req.CreatedAt)
	if err != nil {
		return nil, err
	}
	req.Status = model.FriendRequestStatus(status)
	return &req, nil
}

// UserLookupAdapter wraps profile repo so domain needs only a narrow iface.
type UserLookupAdapter struct {
	lookup func(ctx context.Context, username string) (uuid.UUID, string, error)
}

func NewUserLookupAdapter(lookup func(ctx context.Context, username string) (uuid.UUID, string, error)) *UserLookupAdapter {
	return &UserLookupAdapter{lookup: lookup}
}

func (a *UserLookupAdapter) FindUserIDByUsername(ctx context.Context, username string) (uuid.UUID, string, error) {
	return a.lookup(ctx, username)
}
