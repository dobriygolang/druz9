package interview_live

import (
	"context"
	"fmt"

	"github.com/google/uuid"

	"api/internal/apihelpers"
	interviewlivedata "api/internal/data/interview_live"
	v1 "api/pkg/api/interview_live/v1"
)

func (i *Implementation) SaveSession(ctx context.Context, req *v1.SaveSessionRequest) (*v1.SaveSessionResponse, error) {
	user, err := apihelpers.RequireUser(ctx)
	if err != nil {
		return nil, err
	}

	sessionID := uuid.New()
	if i.sessions == nil {
		return &v1.SaveSessionResponse{Id: sessionID.String()}, nil
	}

	var frontID *uuid.UUID
	if req.GetFrontId() != "" {
		if id, parseErr := uuid.Parse(req.GetFrontId()); parseErr == nil {
			frontID = &id
		}
	}

	focus := req.GetFocus()
	if focus == "" {
		focus = "default"
	}

	transcript := make([]interviewlivedata.TranscriptMessage, 0, len(req.GetTranscript()))
	for _, m := range req.GetTranscript() {
		transcript = append(transcript, interviewlivedata.TranscriptMessage{
			Role:    m.GetRole(),
			Content: m.GetContent(),
		})
	}

	if err := i.sessions.SaveSession(ctx, interviewlivedata.SessionRow{
		ID:         sessionID,
		UserID:     user.ID,
		Focus:      focus,
		FrontID:    frontID,
		Transcript: transcript,
		Code:       req.GetCode(),
		Evaluation: req.GetEvaluation(),
		DurationS:  req.GetDurationS(),
	}); err != nil {
		fmt.Printf("interview_live: save session user=%s: %v\n", user.ID, err)
	}

	return &v1.SaveSessionResponse{Id: sessionID.String()}, nil
}
