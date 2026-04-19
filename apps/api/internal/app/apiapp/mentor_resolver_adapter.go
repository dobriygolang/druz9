package apiapp

import (
	"context"
	"fmt"

	"github.com/google/uuid"

	interviewlive "api/internal/api/interview_live"
	aimdata "api/internal/data/ai_mentor"
)

// mentorResolverAdapter bridges data/ai_mentor.Repo to the slim
// interface that interview_live.Handler consumes (ADR-001). Keeping this
// adapter here avoids leaking the data package into the handler.
type mentorResolverAdapter struct {
	repo *aimdata.Repo
}

func (a mentorResolverAdapter) GetActiveByID(ctx context.Context, id uuid.UUID) (*interviewlive.MentorPersona, error) {
	row, err := a.repo.GetActiveByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("get mentor by id: %w", err)
	}
	if row == nil {
		return nil, nil
	}
	return &interviewlive.MentorPersona{
		ID:             row.ID,
		Name:           row.Name,
		Provider:       row.Provider,
		ModelID:        row.ModelID,
		PromptTemplate: row.PromptTemplate,
		Tier:           row.Tier,
	}, nil
}
