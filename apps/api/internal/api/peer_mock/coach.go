package peer_mock

import (
	"context"
	"errors"
	"fmt"
	"strings"

	kerrs "github.com/go-kratos/kratos/v2/errors"
	klog "github.com/go-kratos/kratos/v2/log"
	"github.com/jackc/pgx/v5"
	"google.golang.org/protobuf/types/known/timestamppb"

	"api/internal/apihelpers"
	pmdata "api/internal/data/peer_mock"
	"api/internal/model"
	v1 "api/pkg/api/peer_mock/v1"
)

// Filler words the heuristic looks for in the interviewer's notes. Hits
// are a rough proxy for the candidate's verbal habits — the number is
// surfaced in the UI so the candidate can set a target for next time.
// The real Whisper-based generator will replace this with actual
// speech-to-text counts.
var fillerPatterns = []string{
	"um", "uh", "like", "basically", "actually", "you know", "so,", "sort of",
	"kind of", "literally", "right?", "ну ", "типа", "короче", "в общем",
}

// recommendedFocusForType suggests 3 next-step topics based on the
// slot type. Kept deliberately small; admins can expand it later via
// the runtime config service.
func recommendedFocusForType(t model.SlotType) []string {
	switch t {
	case model.SlotTypeAlgo:
		return []string{"two-pointer patterns", "sliding window drills", "binary-search boundaries"}
	case model.SlotTypeSystemDesign:
		return []string{"cache invalidation strategies", "consistent hashing basics", "rate-limit algorithms"}
	case model.SlotTypeBehavioral:
		return []string{"STAR framework drill", "conflict-resolution story bank", "leadership vignettes"}
	case model.SlotTypeFull:
		return []string{"mixed-topic warmup", "system-design 30-min drill", "behavioral storytelling"}
	default:
		return []string{"arrays & hashing", "graph traversal warm-up", "behavioral STAR drill"}
	}
}

// buildCoachReport runs the heuristic generator over the review notes
// and packs the result into a storable row. When real AI lands,
// replace this function body with a call to the provider and keep the
// return shape — callers are unaffected.
func buildCoachReport(bookingID string, b *model.MockBooking, slotType model.SlotType, rating int16, notes string) *pmdata.CoachReportRow {
	lower := strings.ToLower(notes)
	fillerHits := 0
	for _, f := range fillerPatterns {
		fillerHits += strings.Count(lower, f)
	}
	// Split notes into sentences so we can pick out positive vs negative
	// cues. Crude but better than nothing for the MVP.
	var positives, negatives []string
	for _, seg := range splitIntoSentences(notes) {
		s := strings.TrimSpace(seg)
		if s == "" {
			continue
		}
		ls := strings.ToLower(s)
		if containsAny(ls, []string{"good", "great", "strong", "solid", "clean", "хорош", "отлично", "сильн"}) {
			positives = append(positives, s)
		} else if containsAny(ls, []string{"struggle", "weak", "missed", "slow", "confus", "unclear", "не знал", "затруд", "медленно"}) {
			negatives = append(negatives, s)
		}
	}
	if len(positives) == 0 && rating >= 4 {
		positives = append(positives, "Maintained a steady problem-solving tempo through the session.")
	}
	if len(negatives) == 0 && rating <= 2 {
		negatives = append(negatives, "Key concepts needed multiple prompts — revisit before the next mock.")
	}
	score := int32(rating*20 - int16(fillerHits)*2) // 5★ = 100 baseline; each filler hits -2
	if score < 0 {
		score = 0
	}
	if score > 100 {
		score = 100
	}
	return &pmdata.CoachReportRow{
		BookingID:        b.ID,
		Strengths:        strings.Join(positives, " "),
		AreasToRevisit:   strings.Join(negatives, " "),
		RecommendedFocus: recommendedFocusForType(slotType),
		FillerWordHits:   int32(fillerHits),
		OverallScore:     score,
	}
}

func splitIntoSentences(s string) []string {
	// Replace common sentence terminators with a single delimiter so
	// strings.Split works across both English and cyrillic punctuation.
	replacer := strings.NewReplacer(".", "\x00", "!", "\x00", "?", "\x00", "\n", "\x00")
	return strings.Split(replacer.Replace(s), "\x00")
}

func containsAny(s string, needles []string) bool {
	for _, n := range needles {
		if strings.Contains(s, n) {
			return true
		}
	}
	return false
}

// GetCoachReport lazily generates (and caches) the coach report for the
// given booking. Only the two participants may read the report.
func (i *Implementation) GetCoachReport(ctx context.Context, req *v1.GetCoachReportRequest) (*v1.GetCoachReportResponse, error) {
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
	if user.ID != booking.InterviewerID && user.ID != booking.IntervieweeID {
		return nil, kerrs.Forbidden("NOT_PARTICIPANT", "you're not part of this booking")
	}
	// Return cached report if present.
	if existing, err := i.repo.GetCoachReport(ctx, bookingID); err == nil {
		return &v1.GetCoachReportResponse{Report: mapCoachReport(existing)}, nil
	} else if !errors.Is(err, pgx.ErrNoRows) {
		klog.Errorf("peer_mock: load coach report: %v", err)
		// Continue to generation path — a cache miss shouldn't break the feature.
	}
	// Generate from the interviewer's review.
	rating, notes, err := i.repo.GetReviewForBooking(ctx, bookingID, booking.InterviewerID)
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		klog.Errorf("peer_mock: load review: %v", err)
		return nil, kerrs.InternalServer("INTERNAL", "failed to load review")
	}
	if rating == 0 {
		return nil, kerrs.Conflict("REVIEW_PENDING", fmt.Sprintf("review not submitted yet for %s", bookingID))
	}
	slot, err := i.repo.GetSlot(ctx, booking.SlotID)
	var slotType model.SlotType
	if err == nil && slot != nil {
		slotType = slot.Type
	}
	row := buildCoachReport(bookingID.String(), booking, slotType, rating, notes)
	if err := i.repo.UpsertCoachReport(ctx, row); err != nil {
		klog.Errorf("peer_mock: upsert coach report: %v", err)
		return nil, kerrs.InternalServer("INTERNAL", "failed to save coach report")
	}
	return &v1.GetCoachReportResponse{Report: mapCoachReport(row)}, nil
}

func mapCoachReport(r *pmdata.CoachReportRow) *v1.CoachReport {
	return &v1.CoachReport{
		BookingId:        r.BookingID.String(),
		Strengths:        r.Strengths,
		AreasToRevisit:   r.AreasToRevisit,
		RecommendedFocus: r.RecommendedFocus,
		FillerWordHits:   r.FillerWordHits,
		OverallScore:     r.OverallScore,
		GeneratedAt:      timestamppb.New(r.GeneratedAt),
	}
}
