package interview_live

import (
	"context"
	"errors"

	kratoserrors "github.com/go-kratos/kratos/v2/errors"
	"github.com/google/uuid"

	"api/internal/aireview"
	"api/internal/apihelpers"
	v1 "api/pkg/api/interview_live/v1"
)

func (i *Implementation) Chat(ctx context.Context, req *v1.ChatRequest) (*v1.ChatResponse, error) {
	user, err := apihelpers.RequireUser(ctx)
	if err != nil {
		return nil, err
	}
	if len(req.GetMessages()) == 0 {
		return nil, kratoserrors.BadRequest("BAD_REQUEST", "messages must not be empty")
	}

	messages := make([]aireview.ChatMessage, 0, len(req.GetMessages())+1)
	modelOverride := req.GetModel()
	if mentorID := req.GetMentorId(); mentorID != "" && i.mentors != nil {
		if id, parseErr := uuid.Parse(mentorID); parseErr == nil {
			persona, lookupErr := i.mentors.GetActiveByID(ctx, id)
			if lookupErr == nil && persona != nil {
				if persona.Tier == 1 && i.premiumRepo != nil {
					isPremium, checkErr := i.premiumRepo.IsPremium(ctx, user.ID)
					if checkErr != nil {
						return nil, kratoserrors.InternalServer("INTERNAL", "failed to check premium status")
					}
					if !isPremium {
						return nil, kratoserrors.New(402, "PREMIUM_REQUIRED", "this mentor requires a Boosty premium subscription")
					}
				}
				if prompt := persona.PromptTemplate; prompt != "" {
					messages = append(messages, aireview.ChatMessage{Role: "system", Content: prompt})
				}
				if modelOverride == "" {
					modelOverride = persona.ModelID
				}
			}
		}
	}

	for _, m := range req.GetMessages() {
		content := m.GetContent()
		if len(content) > 4000 {
			content = content[:4000]
		}
		messages = append(messages, aireview.ChatMessage{
			Role:    m.GetRole(),
			Content: content,
		})
	}

	reply, err := i.reviewer.Chat(ctx, aireview.LiveChatRequest{
		ModelOverride: modelOverride,
		Messages:      messages,
	})
	if err != nil {
		if errors.Is(err, aireview.ErrNotConfigured) {
			return nil, kratoserrors.ServiceUnavailable("AI_CHAT_FAILED", err.Error())
		}
		return nil, kratoserrors.New(502, "AI_CHAT_FAILED", err.Error())
	}

	return &v1.ChatResponse{Reply: reply}, nil
}
