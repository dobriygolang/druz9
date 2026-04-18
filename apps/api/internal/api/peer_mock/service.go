// Package peer_mock exposes the peer-to-peer mock interview RPCs.
// Domain rules (cancellation windows, penalty deltas, banning) are
// encoded here since there's no separate domain package — this feature
// is light enough that the handler + repo stays thin and clear.
package peer_mock

import (
	"context"
	"errors"
	"time"

	"api/internal/apihelpers"
	pmdata "api/internal/data/peer_mock"
	"api/internal/model"
	v1 "api/pkg/api/peer_mock/v1"

	kerrs "github.com/go-kratos/kratos/v2/errors"
	klog "github.com/go-kratos/kratos/v2/log"
	"github.com/google/uuid"
	"google.golang.org/grpc"
	"google.golang.org/protobuf/types/known/timestamppb"
)

// Penalty policy — matches Round 5 plan "Peer Mock Interview System".
const (
	cancellationWindow = 2 * time.Hour // booker cancel <2h → penalty
	noShowGrace        = 10 * time.Minute

	scoreDeltaLateCancel  = -10
	scoreDeltaNoShow      = -25
	scoreDeltaOfferCancel = -5

	banAfterPenalties = 3
	banWindow         = 30 * 24 * time.Hour
	banDuration       = 14 * 24 * time.Hour
)

type Implementation struct {
	v1.UnimplementedPeerMockServiceServer
	repo *pmdata.Repo
}

func New(repo *pmdata.Repo) *Implementation { return &Implementation{repo: repo} }

func (i *Implementation) GetDescription() grpc.ServiceDesc {
	return v1.PeerMockService_ServiceDesc
}

// ── Slots ─────────────────────────────────────────────────────────────

func (i *Implementation) CreateSlot(ctx context.Context, req *v1.CreateSlotRequest) (*v1.CreateSlotResponse, error) {
	user, err := apihelpers.RequireUser(ctx)
	if err != nil {
		return nil, err
	}
	if err := i.ensureNotBanned(ctx, user.ID); err != nil {
		return nil, err
	}
	if req.StartsAt == nil || req.EndsAt == nil {
		return nil, kerrs.BadRequest("INVALID_SLOT", "starts_at and ends_at are required")
	}
	starts := req.StartsAt.AsTime()
	ends := req.EndsAt.AsTime()
	if ends.Before(starts) {
		return nil, kerrs.BadRequest("INVALID_SLOT", "ends_at must be after starts_at")
	}
	if starts.Before(time.Now().Add(30 * time.Minute)) {
		return nil, kerrs.BadRequest("INVALID_SLOT", "slot must start at least 30 minutes from now")
	}

	slot := &model.MockSlot{
		InterviewerID: user.ID,
		StartsAt:      starts,
		EndsAt:        ends,
		Type:          model.SlotType(req.GetType()),
		Level:         model.SlotLevel(req.GetLevel()),
		PriceGold:     req.GetPriceGold(),
		Note:          req.GetNote(),
	}
	if err := i.repo.CreateSlot(ctx, slot); err != nil {
		if errors.Is(err, pmdata.ErrSlotWindowTooLong) {
			return nil, kerrs.BadRequest("INVALID_SLOT", "slot cannot exceed 3 hours")
		}
		klog.Errorf("peer_mock: create slot: %v", err)
		return nil, kerrs.InternalServer("INTERNAL", "failed to create slot")
	}
	loaded, err := i.repo.GetSlot(ctx, slot.ID)
	if err != nil {
		return nil, kerrs.InternalServer("INTERNAL", "failed to load slot")
	}
	return &v1.CreateSlotResponse{Slot: mapSlot(loaded)}, nil
}

func (i *Implementation) ListOpenSlots(ctx context.Context, req *v1.ListOpenSlotsRequest) (*v1.ListOpenSlotsResponse, error) {
	slots, err := i.repo.ListOpenSlots(ctx,
		model.SlotType(req.GetType()), model.SlotLevel(req.GetLevel()),
		req.GetLimit(), req.GetOffset())
	if err != nil {
		klog.Errorf("peer_mock: list open slots: %v", err)
		return nil, kerrs.InternalServer("INTERNAL", "failed to list slots")
	}
	out := make([]*v1.Slot, 0, len(slots))
	for _, s := range slots {
		out = append(out, mapSlot(s))
	}
	return &v1.ListOpenSlotsResponse{Slots: out}, nil
}

func (i *Implementation) ListMySlots(ctx context.Context, req *v1.ListMySlotsRequest) (*v1.ListMySlotsResponse, error) {
	user, err := apihelpers.RequireUser(ctx)
	if err != nil {
		return nil, err
	}
	slots, err := i.repo.ListSlotsByInterviewer(ctx, user.ID, req.GetLimit(), req.GetOffset())
	if err != nil {
		klog.Errorf("peer_mock: list my slots: %v", err)
		return nil, kerrs.InternalServer("INTERNAL", "failed to list slots")
	}
	out := make([]*v1.Slot, 0, len(slots))
	for _, s := range slots {
		out = append(out, mapSlot(s))
	}
	return &v1.ListMySlotsResponse{Slots: out}, nil
}

func (i *Implementation) CancelSlot(ctx context.Context, req *v1.CancelSlotRequest) (*v1.CancelSlotResponse, error) {
	user, err := apihelpers.RequireUser(ctx)
	if err != nil {
		return nil, err
	}
	slotID, err := apihelpers.ParseUUID(req.GetSlotId(), "INVALID_SLOT_ID", "slot_id")
	if err != nil {
		return nil, err
	}
	slot, err := i.repo.CancelSlot(ctx, slotID, user.ID)
	if err != nil {
		if errors.Is(err, pmdata.ErrSlotNotOpen) {
			return nil, kerrs.Conflict("SLOT_NOT_OPEN", "slot is not open for cancellation")
		}
		klog.Errorf("peer_mock: cancel slot: %v", err)
		return nil, kerrs.InternalServer("INTERNAL", "failed to cancel slot")
	}
	return &v1.CancelSlotResponse{Slot: mapSlot(slot)}, nil
}

// ── Bookings ──────────────────────────────────────────────────────────

func (i *Implementation) BookSlot(ctx context.Context, req *v1.BookSlotRequest) (*v1.BookSlotResponse, error) {
	user, err := apihelpers.RequireUser(ctx)
	if err != nil {
		return nil, err
	}
	if err := i.ensureNotBanned(ctx, user.ID); err != nil {
		return nil, err
	}
	slotID, err := apihelpers.ParseUUID(req.GetSlotId(), "INVALID_SLOT_ID", "slot_id")
	if err != nil {
		return nil, err
	}
	booking, err := i.repo.BookSlot(ctx, slotID, user.ID)
	if err != nil {
		switch {
		case errors.Is(err, pmdata.ErrSlotNotFound):
			return nil, kerrs.NotFound("SLOT_NOT_FOUND", "slot not found")
		case errors.Is(err, pmdata.ErrSlotNotOpen):
			return nil, kerrs.Conflict("SLOT_NOT_OPEN", "slot already taken")
		case errors.Is(err, pmdata.ErrSlotPast):
			return nil, kerrs.Conflict("SLOT_PAST", "slot is in the past")
		case errors.Is(err, pmdata.ErrCannotSelfBook):
			return nil, kerrs.BadRequest("SELF_BOOK", "cannot book your own slot")
		}
		klog.Errorf("peer_mock: book slot: %v", err)
		return nil, kerrs.InternalServer("INTERNAL", "failed to book slot")
	}
	return &v1.BookSlotResponse{Booking: mapBooking(booking)}, nil
}

func (i *Implementation) ListMyBookings(ctx context.Context, req *v1.ListMyBookingsRequest) (*v1.ListMyBookingsResponse, error) {
	user, err := apihelpers.RequireUser(ctx)
	if err != nil {
		return nil, err
	}
	asOfferer, err := i.repo.ListBookings(ctx, user.ID, true, req.GetLimit(), req.GetOffset())
	if err != nil {
		klog.Errorf("peer_mock: list bookings (offerer): %v", err)
		return nil, kerrs.InternalServer("INTERNAL", "failed to list bookings")
	}
	asBooker, err := i.repo.ListBookings(ctx, user.ID, false, req.GetLimit(), req.GetOffset())
	if err != nil {
		klog.Errorf("peer_mock: list bookings (booker): %v", err)
		return nil, kerrs.InternalServer("INTERNAL", "failed to list bookings")
	}
	resp := &v1.ListMyBookingsResponse{}
	for _, b := range asOfferer {
		resp.AsInterviewer = append(resp.AsInterviewer, mapBooking(b))
	}
	for _, b := range asBooker {
		resp.AsInterviewee = append(resp.AsInterviewee, mapBooking(b))
	}
	return resp, nil
}

func (i *Implementation) CancelBooking(ctx context.Context, req *v1.CancelBookingRequest) (*v1.CancelBookingResponse, error) {
	user, err := apihelpers.RequireUser(ctx)
	if err != nil {
		return nil, err
	}
	bookingID, err := apihelpers.ParseUUID(req.GetBookingId(), "INVALID_BOOKING_ID", "booking_id")
	if err != nil {
		return nil, err
	}
	booking, isBooker, err := i.repo.CancelBooking(ctx, bookingID, user.ID)
	if err != nil {
		if errors.Is(err, pmdata.ErrBookingNotFound) {
			return nil, kerrs.NotFound("BOOKING_NOT_FOUND", "booking not found")
		}
		klog.Errorf("peer_mock: cancel booking: %v", err)
		return nil, kerrs.InternalServer("INTERNAL", "failed to cancel booking")
	}

	// Apply penalty: booker late-cancel (<2h) → -10, offerer cancel any time → -5.
	var scoreDelta int32
	if isBooker {
		if time.Until(booking.StartsAt) < cancellationWindow {
			scoreDelta = scoreDeltaLateCancel
		}
	} else {
		scoreDelta = scoreDeltaOfferCancel
	}

	if scoreDelta < 0 {
		ban := time.Duration(0)
		if nextPenaltyCount, _ := i.recentPenaltyCount(ctx, user.ID); nextPenaltyCount+1 >= banAfterPenalties {
			ban = banDuration
		}
		if err := i.repo.ApplyPenalty(ctx, user.ID, scoreDelta, ban); err != nil {
			klog.Errorf("peer_mock: apply penalty: %v", err)
		}
	}

	return &v1.CancelBookingResponse{
		Booking:          mapBooking(booking),
		XpDelta:          scoreDelta * 10, // rough XP tie-in — 100xp per 10 reliability points lost
		ReliabilityDelta: float64(scoreDelta),
	}, nil
}

// ── Reviews ───────────────────────────────────────────────────────────

func (i *Implementation) SubmitReview(ctx context.Context, req *v1.SubmitReviewRequest) (*v1.SubmitReviewResponse, error) {
	user, err := apihelpers.RequireUser(ctx)
	if err != nil {
		return nil, err
	}
	bookingID, err := apihelpers.ParseUUID(req.GetBookingId(), "INVALID_BOOKING_ID", "booking_id")
	if err != nil {
		return nil, err
	}
	booking, err := i.repo.GetBooking(ctx, bookingID, user.ID)
	if err != nil {
		return nil, kerrs.NotFound("BOOKING_NOT_FOUND", "booking not found")
	}
	var targetID uuid.UUID
	switch user.ID {
	case booking.InterviewerID:
		targetID = booking.IntervieweeID
	case booking.IntervieweeID:
		targetID = booking.InterviewerID
	default:
		return nil, kerrs.Forbidden("NOT_PARTICIPANT", "you're not part of this booking")
	}
	rating := int16(req.GetRating())
	if rating < 1 || rating > 5 {
		return nil, kerrs.BadRequest("INVALID_RATING", "rating must be 1..5")
	}
	if err := i.repo.SubmitReview(ctx, booking.ID, user.ID, targetID, rating, req.GetNotes()); err != nil {
		klog.Errorf("peer_mock: submit review: %v", err)
		return nil, kerrs.InternalServer("INTERNAL", "failed to submit review")
	}
	// Good review nudges target reliability up by +2 (cap at 100).
	if rating >= 4 {
		if err := i.repo.ApplyPenalty(ctx, targetID, 2, 0); err != nil {
			klog.Errorf("peer_mock: reward review: %v", err)
		}
	}
	loaded, _ := i.repo.GetBooking(ctx, booking.ID, user.ID)
	return &v1.SubmitReviewResponse{Booking: mapBooking(loaded)}, nil
}

// ── Reliability ───────────────────────────────────────────────────────

func (i *Implementation) GetMyReliability(ctx context.Context, _ *v1.GetMyReliabilityRequest) (*v1.GetMyReliabilityResponse, error) {
	user, err := apihelpers.RequireUser(ctx)
	if err != nil {
		return nil, err
	}
	rel, err := i.repo.GetReliability(ctx, user.ID)
	if err != nil {
		klog.Errorf("peer_mock: reliability: %v", err)
		return nil, kerrs.InternalServer("INTERNAL", "failed to load reliability")
	}
	resp := &v1.GetMyReliabilityResponse{
		Score:        rel.Score,
		PenaltyCount: rel.PenaltyCount,
		Tier:         model.ReliabilityTier(rel.Score),
	}
	if rel.LastPenaltyAt != nil {
		resp.LastPenaltyAt = timestamppb.New(*rel.LastPenaltyAt)
	}
	if rel.BanUntil != nil {
		resp.BanUntil = timestamppb.New(*rel.BanUntil)
	}
	return resp, nil
}

// ── helpers ───────────────────────────────────────────────────────────

func (i *Implementation) ensureNotBanned(ctx context.Context, userID uuid.UUID) error {
	rel, err := i.repo.GetReliability(ctx, userID)
	if err != nil {
		return nil // don't block on read error
	}
	if rel.BanUntil != nil && rel.BanUntil.After(time.Now()) {
		return kerrs.Forbidden("PEER_MOCK_BANNED", "peer mocks are temporarily locked for your account")
	}
	return nil
}

func (i *Implementation) recentPenaltyCount(ctx context.Context, userID uuid.UUID) (int, error) {
	rel, err := i.repo.GetReliability(ctx, userID)
	if err != nil || rel.LastPenaltyAt == nil {
		return 0, nil
	}
	// Very rough: use total penalty_count if last penalty is within banWindow.
	if time.Since(*rel.LastPenaltyAt) > banWindow {
		return 0, nil
	}
	return int(rel.PenaltyCount), nil
}

func mapSlot(s *model.MockSlot) *v1.Slot {
	if s == nil {
		return nil
	}
	return &v1.Slot{
		Id:                     s.ID.String(),
		InterviewerId:          s.InterviewerID.String(),
		InterviewerName:        s.InterviewerName,
		InterviewerReliability: s.InterviewerReliability,
		StartsAt:               timestamppb.New(s.StartsAt),
		EndsAt:                 timestamppb.New(s.EndsAt),
		Type:                   v1.SlotType(s.Type),
		Level:                  v1.SlotLevel(s.Level),
		PriceGold:              s.PriceGold,
		Status:                 v1.SlotStatus(s.Status),
		Note:                   s.Note,
	}
}

func mapBooking(b *model.MockBooking) *v1.Booking {
	if b == nil {
		return nil
	}
	out := &v1.Booking{
		Id:               b.ID.String(),
		SlotId:           b.SlotID.String(),
		InterviewerId:    b.InterviewerID.String(),
		InterviewerName:  b.InterviewerName,
		IntervieweeId:    b.IntervieweeID.String(),
		IntervieweeName:  b.IntervieweeName,
		StartsAt:         timestamppb.New(b.StartsAt),
		EndsAt:           timestamppb.New(b.EndsAt),
		Status:           v1.BookingStatus(b.Status),
		PriceGold:        b.PriceGold,
		ReviewedByMe:     b.ReviewedByMe,
	}
	if b.RoomID != uuid.Nil {
		out.RoomId = b.RoomID.String()
	}
	return out
}
