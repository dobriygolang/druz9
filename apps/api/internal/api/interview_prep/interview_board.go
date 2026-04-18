package interview_prep

import (
	"context"
	"strings"

	kerrs "github.com/go-kratos/kratos/v2/errors"
	klog "github.com/go-kratos/kratos/v2/log"
	"google.golang.org/protobuf/types/known/timestamppb"

	"api/internal/apihelpers"
	interviewprepdata "api/internal/data/interviewprep"
	v1 "api/pkg/api/interview_prep/v1"
)

// PostInterviewExperience accepts a user's post-interview report.
// Moderation flow is intentionally lightweight for the MVP: every
// post lands as 'approved' so the board fills up naturally. Once a
// mod UI exists, default to 'pending' and add an admin-approve RPC.
func (i *Implementation) PostInterviewExperience(ctx context.Context, req *v1.PostInterviewExperienceRequest) (*v1.InterviewExperience, error) {
	user, err := apihelpers.RequireUser(ctx)
	if err != nil {
		return nil, err
	}
	company := strings.TrimSpace(strings.ToLower(req.GetCompanyTag()))
	if company == "" {
		return nil, kerrs.BadRequest("MISSING_COMPANY", "company_tag is required")
	}
	rating := req.GetOverallRating()
	if rating < 1 {
		rating = 1
	}
	if rating > 5 {
		rating = 5
	}
	row := &interviewprepdata.InterviewExperienceRow{
		UserID:            user.ID,
		CompanyTag:        company,
		Role:              req.GetRole(),
		Level:             req.GetLevel(),
		OverallRating:     rating,
		LoopStructure:     req.GetLoopStructure(),
		Questions:         req.GetQuestions(),
		FeedbackReceived:  req.GetFeedbackReceived(),
		Outcome:           req.GetOutcome(),
		IsAnonymous:       req.GetIsAnonymous(),
		ModerationStatus:  "approved", // see comment above
	}
	saved, err := i.admin.InsertInterviewExperience(ctx, row)
	if err != nil {
		klog.Errorf("interview_prep: insert experience: %v", err)
		return nil, kerrs.InternalServer("INTERNAL", "failed to save experience")
	}
	return mapExperience(saved), nil
}

func (i *Implementation) ListInterviewExperiences(ctx context.Context, req *v1.ListInterviewExperiencesRequest) (*v1.ListInterviewExperiencesResponse, error) {
	if _, err := apihelpers.RequireUser(ctx); err != nil {
		return nil, err
	}
	p := apihelpers.ClampPage(req.GetLimit(), req.GetOffset(), 20, 100)
	company := strings.TrimSpace(strings.ToLower(req.GetCompanyTag()))
	rows, total, err := i.admin.ListApprovedExperiences(ctx, company, p.Limit, p.Offset)
	if err != nil {
		klog.Errorf("interview_prep: list experiences: %v", err)
		return nil, kerrs.InternalServer("INTERNAL", "failed to load experiences")
	}
	out := make([]*v1.InterviewExperience, 0, len(rows))
	for _, r := range rows {
		out = append(out, mapExperience(r))
	}
	return &v1.ListInterviewExperiencesResponse{Experiences: out, Total: total}, nil
}

func mapExperience(r *interviewprepdata.InterviewExperienceRow) *v1.InterviewExperience {
	if r == nil {
		return nil
	}
	uid := r.UserID.String()
	// When posted anonymously we strip the author id from the wire so
	// even a compromised client can't link posts back to users.
	if r.IsAnonymous {
		uid = ""
	}
	return &v1.InterviewExperience{
		Id:                r.ID.String(),
		UserId:            uid,
		CompanyTag:        r.CompanyTag,
		Role:              r.Role,
		Level:             r.Level,
		OverallRating:     r.OverallRating,
		LoopStructure:     r.LoopStructure,
		Questions:         r.Questions,
		FeedbackReceived:  r.FeedbackReceived,
		Outcome:           r.Outcome,
		IsAnonymous:       r.IsAnonymous,
		ModerationStatus:  r.ModerationStatus,
		PostedAt:          timestamppb.New(r.PostedAt),
	}
}
