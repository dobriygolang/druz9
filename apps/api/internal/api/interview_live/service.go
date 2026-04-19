package interview_live

import (
	"context"

	"github.com/google/uuid"

	"api/internal/aireview"
	interviewlivedata "api/internal/data/interview_live"
	premiumdata "api/internal/data/premium"
	v1 "api/pkg/api/interview_live/v1"
	"google.golang.org/grpc"
)

// MentorResolver fetches an active mentor's persona by ID. Returns
// (nil, nil) when the mentor is missing or inactive.
type MentorResolver interface {
	GetActiveByID(ctx context.Context, id uuid.UUID) (*MentorPersona, error)
}

// MentorPersona is the slice of an ai_mentors row that the chat handler consumes.
type MentorPersona struct {
	ID             uuid.UUID
	Name           string
	Provider       string
	ModelID        string
	PromptTemplate string
	Tier           int32
}

// Implementation of interview_live service.
type Implementation struct {
	v1.UnimplementedInterviewLiveServiceServer
	reviewer    aireview.Reviewer
	mentors     MentorResolver
	sessions    *interviewlivedata.Repo
	premiumRepo *premiumdata.Repo
}

// New returns new instance of Implementation.
func New(reviewer aireview.Reviewer, sessions *interviewlivedata.Repo, premiumRepo *premiumdata.Repo) *Implementation {
	return &Implementation{
		reviewer:    reviewer,
		sessions:    sessions,
		premiumRepo: premiumRepo,
	}
}

func (i *Implementation) WithMentorResolver(r MentorResolver) *Implementation {
	i.mentors = r
	return i
}

// GetDescription returns grpc service description.
func (i *Implementation) GetDescription() grpc.ServiceDesc {
	return v1.InterviewLiveService_ServiceDesc
}
