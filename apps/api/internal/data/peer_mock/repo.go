// Package peer_mock owns the SQL for peer-to-peer mock interviews —
// slot offers, bookings, reviews, reliability. See
// scripts/migrations/00012_peer_mock.sql for the schema.
package peer_mock

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"api/internal/model"
	"api/internal/storage/postgres"
)

type Repo struct {
	data *postgres.Store
}

func NewRepo(store *postgres.Store) *Repo { return &Repo{data: store} }

var (
	ErrSlotNotFound      = errors.New("peer_mock: slot not found")
	ErrSlotNotOpen       = errors.New("peer_mock: slot is not open")
	ErrSlotPast          = errors.New("peer_mock: slot is in the past")
	ErrBookingNotFound   = errors.New("peer_mock: booking not found")
	ErrAlreadyReviewed   = errors.New("peer_mock: review already submitted")
	ErrCannotSelfBook    = errors.New("peer_mock: cannot book your own slot")
	ErrBanned            = errors.New("peer_mock: user is banned from peer mocks")
	ErrSlotWindowTooLong = errors.New("peer_mock: slot window too long (max 3h)")
)

// ── Slots ─────────────────────────────────────────────────────────────

func (r *Repo) CreateSlot(ctx context.Context, slot *model.MockSlot) error {
	if slot.ID == uuid.Nil {
		slot.ID = uuid.New()
	}
	if slot.EndsAt.Sub(slot.StartsAt) > 3*time.Hour {
		return ErrSlotWindowTooLong
	}
	_, err := r.data.DB.Exec(ctx, `
        INSERT INTO mock_slots (id, interviewer_id, starts_at, ends_at, type, level, price_gold, status, note)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, slot.ID, slot.InterviewerID, slot.StartsAt, slot.EndsAt,
		int16(slot.Type), int16(slot.Level), slot.PriceGold,
		int16(model.SlotStatusOpen), slot.Note)
	if err != nil {
		return fmt.Errorf("create slot: %w", err)
	}
	slot.Status = model.SlotStatusOpen
	return nil
}

func (r *Repo) GetSlot(ctx context.Context, id uuid.UUID) (*model.MockSlot, error) {
	var s model.MockSlot
	var typ, lvl, status int16
	err := r.data.DB.QueryRow(ctx, `
        SELECT s.id, s.interviewer_id, s.starts_at, s.ends_at,
               s.type, s.level, s.price_gold, s.status, s.note, s.created_at,
               COALESCE(TRIM(CONCAT_WS(' ', u.first_name, u.last_name)), u.username, ''),
               COALESCE(ur.score, 100)
        FROM mock_slots s
        JOIN users u ON u.id = s.interviewer_id
        LEFT JOIN user_reliability ur ON ur.user_id = s.interviewer_id
        WHERE s.id = $1
    `, id).Scan(&s.ID, &s.InterviewerID, &s.StartsAt, &s.EndsAt,
		&typ, &lvl, &s.PriceGold, &status, &s.Note, &s.CreatedAt,
		&s.InterviewerName, &s.InterviewerReliability)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrSlotNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("get slot: %w", err)
	}
	s.Type = model.SlotType(typ)
	s.Level = model.SlotLevel(lvl)
	s.Status = model.SlotStatus(status)
	return &s, nil
}

func (r *Repo) ListOpenSlots(ctx context.Context, typeFilter model.SlotType, levelFilter model.SlotLevel, limit, offset int32) ([]*model.MockSlot, error) {
	if limit <= 0 || limit > 200 {
		limit = 50
	}
	if offset < 0 {
		offset = 0
	}
	rows, err := r.data.DB.Query(ctx, `
        SELECT s.id, s.interviewer_id, s.starts_at, s.ends_at,
               s.type, s.level, s.price_gold, s.status, s.note, s.created_at,
               COALESCE(TRIM(CONCAT_WS(' ', u.first_name, u.last_name)), u.username, ''),
               COALESCE(ur.score, 100)
        FROM mock_slots s
        JOIN users u ON u.id = s.interviewer_id
        LEFT JOIN user_reliability ur ON ur.user_id = s.interviewer_id
        WHERE s.status = $1
          AND s.starts_at > NOW()
          AND ($2 = 0 OR s.type = $2)
          AND ($3 = 0 OR s.level = $3)
        ORDER BY s.starts_at ASC
        LIMIT $4 OFFSET $5
    `, int16(model.SlotStatusOpen), int16(typeFilter), int16(levelFilter), limit, offset)
	if err != nil {
		return nil, fmt.Errorf("list open slots: %w", err)
	}
	defer rows.Close()
	return scanSlots(rows)
}

func (r *Repo) ListSlotsByInterviewer(ctx context.Context, interviewerID uuid.UUID, limit, offset int32) ([]*model.MockSlot, error) {
	if limit <= 0 || limit > 200 {
		limit = 50
	}
	if offset < 0 {
		offset = 0
	}
	rows, err := r.data.DB.Query(ctx, `
        SELECT s.id, s.interviewer_id, s.starts_at, s.ends_at,
               s.type, s.level, s.price_gold, s.status, s.note, s.created_at,
               COALESCE(TRIM(CONCAT_WS(' ', u.first_name, u.last_name)), u.username, ''),
               COALESCE(ur.score, 100)
        FROM mock_slots s
        JOIN users u ON u.id = s.interviewer_id
        LEFT JOIN user_reliability ur ON ur.user_id = s.interviewer_id
        WHERE s.interviewer_id = $1
        ORDER BY s.starts_at DESC
        LIMIT $2 OFFSET $3
    `, interviewerID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("list my slots: %w", err)
	}
	defer rows.Close()
	return scanSlots(rows)
}

func (r *Repo) CancelSlot(ctx context.Context, slotID, actorID uuid.UUID) (*model.MockSlot, error) {
	res, err := r.data.DB.Exec(ctx, `
        UPDATE mock_slots
        SET status = $3
        WHERE id = $1 AND interviewer_id = $2 AND status = $4
    `, slotID, actorID, int16(model.SlotStatusCancelled), int16(model.SlotStatusOpen))
	if err != nil {
		return nil, fmt.Errorf("cancel slot: %w", err)
	}
	if res.RowsAffected() == 0 {
		return nil, ErrSlotNotOpen
	}
	return r.GetSlot(ctx, slotID)
}

// ── Bookings ──────────────────────────────────────────────────────────

func (r *Repo) BookSlot(ctx context.Context, slotID, intervieweeID uuid.UUID) (*model.MockBooking, error) {
	tx, err := r.data.DB.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("begin tx: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	var interviewerID uuid.UUID
	var startsAt, endsAt time.Time
	var priceGold int32
	var status int16
	err = tx.QueryRow(ctx, `
        SELECT interviewer_id, starts_at, ends_at, price_gold, status
        FROM mock_slots WHERE id = $1 FOR UPDATE
    `, slotID).Scan(&interviewerID, &startsAt, &endsAt, &priceGold, &status)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrSlotNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("load slot: %w", err)
	}
	if status != int16(model.SlotStatusOpen) {
		return nil, ErrSlotNotOpen
	}
	if startsAt.Before(time.Now()) {
		return nil, ErrSlotPast
	}
	if interviewerID == intervieweeID {
		return nil, ErrCannotSelfBook
	}

	bookingID := uuid.New()
	_, err = tx.Exec(ctx, `
        INSERT INTO mock_bookings (id, slot_id, interviewee_id, status, price_gold)
        VALUES ($1, $2, $3, $4, $5)
    `, bookingID, slotID, intervieweeID, int16(model.BookingStatusScheduled), priceGold)
	if err != nil {
		return nil, fmt.Errorf("insert booking: %w", err)
	}
	_, err = tx.Exec(ctx, `UPDATE mock_slots SET status = $1 WHERE id = $2`,
		int16(model.SlotStatusBooked), slotID)
	if err != nil {
		return nil, fmt.Errorf("mark slot booked: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("commit: %w", err)
	}

	return r.GetBooking(ctx, bookingID, intervieweeID)
}

func (r *Repo) GetBooking(ctx context.Context, bookingID, viewerID uuid.UUID) (*model.MockBooking, error) {
	var b model.MockBooking
	var status int16
	var roomID *uuid.UUID
	err := r.data.DB.QueryRow(ctx, `
        SELECT b.id, b.slot_id, s.interviewer_id,
               COALESCE(TRIM(CONCAT_WS(' ', ui.first_name, ui.last_name)), ui.username, ''),
               b.interviewee_id,
               COALESCE(TRIM(CONCAT_WS(' ', ue.first_name, ue.last_name)), ue.username, ''),
               s.starts_at, s.ends_at, b.status, b.room_id, b.price_gold,
               EXISTS(SELECT 1 FROM mock_reviews r WHERE r.booking_id = b.id AND r.reviewer_id = $2)
        FROM mock_bookings b
        JOIN mock_slots s ON s.id = b.slot_id
        JOIN users ui ON ui.id = s.interviewer_id
        JOIN users ue ON ue.id = b.interviewee_id
        WHERE b.id = $1
    `, bookingID, viewerID).Scan(
		&b.ID, &b.SlotID, &b.InterviewerID, &b.InterviewerName,
		&b.IntervieweeID, &b.IntervieweeName,
		&b.StartsAt, &b.EndsAt, &status, &roomID, &b.PriceGold,
		&b.ReviewedByMe,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrBookingNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("get booking: %w", err)
	}
	b.Status = model.BookingStatus(status)
	if roomID != nil {
		b.RoomID = *roomID
	}
	return &b, nil
}

func (r *Repo) ListBookings(ctx context.Context, userID uuid.UUID, asInterviewer bool, limit, offset int32) ([]*model.MockBooking, error) {
	if limit <= 0 || limit > 200 {
		limit = 50
	}
	if offset < 0 {
		offset = 0
	}
	var where string
	if asInterviewer {
		where = "s.interviewer_id = $1"
	} else {
		where = "b.interviewee_id = $1"
	}
	rows, err := r.data.DB.Query(ctx, `
        SELECT b.id, b.slot_id, s.interviewer_id,
               COALESCE(TRIM(CONCAT_WS(' ', ui.first_name, ui.last_name)), ui.username, ''),
               b.interviewee_id,
               COALESCE(TRIM(CONCAT_WS(' ', ue.first_name, ue.last_name)), ue.username, ''),
               s.starts_at, s.ends_at, b.status, b.room_id, b.price_gold,
               EXISTS(SELECT 1 FROM mock_reviews r WHERE r.booking_id = b.id AND r.reviewer_id = $1)
        FROM mock_bookings b
        JOIN mock_slots s ON s.id = b.slot_id
        JOIN users ui ON ui.id = s.interviewer_id
        JOIN users ue ON ue.id = b.interviewee_id
        WHERE `+where+`
        ORDER BY s.starts_at DESC
        LIMIT $2 OFFSET $3
    `, userID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("list bookings: %w", err)
	}
	defer rows.Close()
	out := make([]*model.MockBooking, 0, limit)
	for rows.Next() {
		var b model.MockBooking
		var status int16
		var roomID *uuid.UUID
		if err := rows.Scan(&b.ID, &b.SlotID, &b.InterviewerID, &b.InterviewerName,
			&b.IntervieweeID, &b.IntervieweeName,
			&b.StartsAt, &b.EndsAt, &status, &roomID, &b.PriceGold,
			&b.ReviewedByMe); err != nil {
			return nil, fmt.Errorf("scan booking: %w", err)
		}
		b.Status = model.BookingStatus(status)
		if roomID != nil {
			b.RoomID = *roomID
		}
		out = append(out, &b)
	}
	return out, rows.Err()
}

func (r *Repo) CancelBooking(ctx context.Context, bookingID, actorID uuid.UUID) (*model.MockBooking, bool /*isBooker*/, error) {
	tx, err := r.data.DB.Begin(ctx)
	if err != nil {
		return nil, false, fmt.Errorf("begin tx: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	var slotID, intervieweeID, interviewerID uuid.UUID
	var status int16
	err = tx.QueryRow(ctx, `
        SELECT b.id, b.slot_id, b.interviewee_id, s.interviewer_id, b.status
        FROM mock_bookings b
        JOIN mock_slots s ON s.id = b.slot_id
        WHERE b.id = $1 FOR UPDATE
    `, bookingID).Scan(&bookingID, &slotID, &intervieweeID, &interviewerID, &status)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, false, ErrBookingNotFound
	}
	if err != nil {
		return nil, false, fmt.Errorf("load booking: %w", err)
	}
	isBooker := actorID == intervieweeID
	isOfferer := actorID == interviewerID
	if !isBooker && !isOfferer {
		return nil, false, ErrBookingNotFound
	}
	if status != int16(model.BookingStatusScheduled) {
		return nil, isBooker, ErrBookingNotFound
	}
	var nextStatus model.BookingStatus
	if isBooker {
		nextStatus = model.BookingStatusCancelledByBooker
	} else {
		nextStatus = model.BookingStatusCancelledByOfferer
	}
	_, err = tx.Exec(ctx, `
        UPDATE mock_bookings SET status = $2, cancelled_at = NOW() WHERE id = $1
    `, bookingID, int16(nextStatus))
	if err != nil {
		return nil, isBooker, fmt.Errorf("update booking: %w", err)
	}
	_, err = tx.Exec(ctx, `
        UPDATE mock_slots SET status = $2 WHERE id = $1
    `, slotID, int16(model.SlotStatusCancelled))
	if err != nil {
		return nil, isBooker, fmt.Errorf("cancel slot: %w", err)
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, isBooker, fmt.Errorf("commit: %w", err)
	}
	b, err := r.GetBooking(ctx, bookingID, actorID)
	return b, isBooker, err
}

// ── Reviews ───────────────────────────────────────────────────────────

func (r *Repo) SubmitReview(ctx context.Context, bookingID, reviewerID, targetID uuid.UUID, rating int16, notes string) error {
	if rating < 1 || rating > 5 {
		return errors.New("peer_mock: rating out of range")
	}
	_, err := r.data.DB.Exec(ctx, `
        INSERT INTO mock_reviews (booking_id, reviewer_id, target_id, rating, notes)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (booking_id, reviewer_id) DO NOTHING
    `, bookingID, reviewerID, targetID, rating, notes)
	if err != nil {
		return fmt.Errorf("submit review: %w", err)
	}
	return nil
}

// GetReviewForBooking returns the interviewer → interviewee review rating
// and notes (if present). Used by the coach-report generator as its only
// input until the Whisper/Claude pipeline lands.
func (r *Repo) GetReviewForBooking(ctx context.Context, bookingID, interviewerID uuid.UUID) (rating int16, notes string, err error) {
	err = r.data.DB.QueryRow(ctx, `
        SELECT rating, notes FROM mock_reviews
        WHERE booking_id = $1 AND reviewer_id = $2
        LIMIT 1
    `, bookingID, interviewerID).Scan(&rating, &notes)
	if err != nil {
		// Caller handles pgx.ErrNoRows as "no review yet".
		return 0, "", err
	}
	return rating, notes, nil
}

// ── Coach reports (killer feature #3) ─────────────────────────────────

type CoachReportRow struct {
	BookingID        uuid.UUID
	Strengths        string
	AreasToRevisit   string
	RecommendedFocus []string
	FillerWordHits   int32
	OverallScore     int32
	GeneratedAt      time.Time
}

func (r *Repo) GetCoachReport(ctx context.Context, bookingID uuid.UUID) (*CoachReportRow, error) {
	var row CoachReportRow
	row.BookingID = bookingID
	err := r.data.DB.QueryRow(ctx, `
        SELECT strengths, areas_to_revisit, recommended_focus, filler_word_hits, overall_score, generated_at
        FROM mock_coach_reports WHERE booking_id = $1
    `, bookingID).Scan(&row.Strengths, &row.AreasToRevisit, &row.RecommendedFocus,
		&row.FillerWordHits, &row.OverallScore, &row.GeneratedAt)
	if err != nil {
		return nil, err
	}
	return &row, nil
}

func (r *Repo) UpsertCoachReport(ctx context.Context, row *CoachReportRow) error {
	_, err := r.data.DB.Exec(ctx, `
        INSERT INTO mock_coach_reports
            (booking_id, strengths, areas_to_revisit, recommended_focus, filler_word_hits, overall_score)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (booking_id) DO UPDATE SET
            strengths         = EXCLUDED.strengths,
            areas_to_revisit  = EXCLUDED.areas_to_revisit,
            recommended_focus = EXCLUDED.recommended_focus,
            filler_word_hits  = EXCLUDED.filler_word_hits,
            overall_score     = EXCLUDED.overall_score,
            generated_at      = NOW()
    `, row.BookingID, row.Strengths, row.AreasToRevisit, row.RecommendedFocus,
		row.FillerWordHits, row.OverallScore)
	if err != nil {
		return fmt.Errorf("upsert coach report: %w", err)
	}
	return nil
}

// ── Reliability ───────────────────────────────────────────────────────

func (r *Repo) GetReliability(ctx context.Context, userID uuid.UUID) (*model.UserReliability, error) {
	if _, err := r.data.DB.Exec(ctx, `
        INSERT INTO user_reliability (user_id) VALUES ($1)
        ON CONFLICT (user_id) DO NOTHING
    `, userID); err != nil {
		return nil, fmt.Errorf("ensure reliability: %w", err)
	}
	var rel model.UserReliability
	rel.UserID = userID
	var lastPenalty, banUntil *time.Time
	err := r.data.DB.QueryRow(ctx, `
        SELECT score, penalty_count, last_penalty_at, ban_until
        FROM user_reliability WHERE user_id = $1
    `, userID).Scan(&rel.Score, &rel.PenaltyCount, &lastPenalty, &banUntil)
	if err != nil {
		return nil, fmt.Errorf("get reliability: %w", err)
	}
	rel.LastPenaltyAt = lastPenalty
	rel.BanUntil = banUntil
	return &rel, nil
}

func (r *Repo) ApplyPenalty(ctx context.Context, userID uuid.UUID, scoreDelta int32, ban time.Duration) error {
	tx, err := r.data.DB.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	if _, err := tx.Exec(ctx, `
        INSERT INTO user_reliability (user_id) VALUES ($1)
        ON CONFLICT (user_id) DO NOTHING
    `, userID); err != nil {
		return fmt.Errorf("ensure reliability: %w", err)
	}
	query := `
        UPDATE user_reliability
        SET score           = GREATEST(0, LEAST(100, score + $2)),
            penalty_count   = penalty_count + (CASE WHEN $2 < 0 THEN 1 ELSE 0 END),
            last_penalty_at = CASE WHEN $2 < 0 THEN NOW() ELSE last_penalty_at END,
            ban_until       = CASE WHEN $3 > 0 THEN NOW() + ($3 || ' seconds')::interval ELSE ban_until END,
            updated_at      = NOW()
        WHERE user_id = $1
    `
	if _, err := tx.Exec(ctx, query, userID, scoreDelta, int64(ban.Seconds())); err != nil {
		return fmt.Errorf("apply penalty: %w", err)
	}
	return tx.Commit(ctx)
}

// ── helpers ───────────────────────────────────────────────────────────

func scanSlots(rows pgx.Rows) ([]*model.MockSlot, error) {
	out := make([]*model.MockSlot, 0, 16)
	for rows.Next() {
		var s model.MockSlot
		var typ, lvl, status int16
		if err := rows.Scan(&s.ID, &s.InterviewerID, &s.StartsAt, &s.EndsAt,
			&typ, &lvl, &s.PriceGold, &status, &s.Note, &s.CreatedAt,
			&s.InterviewerName, &s.InterviewerReliability); err != nil {
			return nil, fmt.Errorf("scan slot: %w", err)
		}
		s.Type = model.SlotType(typ)
		s.Level = model.SlotLevel(lvl)
		s.Status = model.SlotStatus(status)
		out = append(out, &s)
	}
	return out, rows.Err()
}
