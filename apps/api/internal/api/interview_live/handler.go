package interview_live

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"

	kratoshttp "github.com/go-kratos/kratos/v2/transport/http"
	"github.com/google/uuid"

	"api/internal/aireview"
	"api/internal/model"
)

// MentorResolver fetches an active mentor's persona by ID. Returns
// (nil, nil) when the mentor is missing or inactive — the handler then
// falls back to the bootstrap reviewer.
type MentorResolver interface {
	GetActiveByID(ctx context.Context, id uuid.UUID) (*MentorPersona, error)
}

// MentorPersona is the slice of an ai_mentors row that the chat handler
// consumes. Defined here so we don't import data/ai_mentor into the
// handler package.
type MentorPersona struct {
	ID             uuid.UUID
	Name           string
	Provider       string
	ModelID        string
	PromptTemplate string
	Tier           int32
}

type Handler struct {
	reviewer aireview.Reviewer
	mentors  MentorResolver
}

func New(reviewer aireview.Reviewer) *Handler {
	return &Handler{reviewer: reviewer}
}

// WithMentorResolver wires per-mentor persona lookup. Optional — when
// nil, the handler ignores `mentor_id` and uses the bootstrap reviewer.
func (h *Handler) WithMentorResolver(r MentorResolver) *Handler {
	h.mentors = r
	return h
}

type inboundMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type chatRequest struct {
	Messages []inboundMessage `json:"messages"`
	Model    string           `json:"model"`
	// MentorID — when set, the server applies that mentor's prompt template
	// as the system message (prepended) and overrides the model. Frontend
	// passes the value picked in /interview's mentor selector.
	MentorID string `json:"mentor_id"`
}

type chatResponse struct {
	Reply string `json:"reply"`
}

func (h *Handler) Chat(ctx kratoshttp.Context) error {
	stdCtx := ctx.Request().Context()

	if _, ok := model.UserFromContext(stdCtx); !ok {
		writeErr(ctx.Response(), http.StatusUnauthorized, "UNAUTHORIZED", "authentication required")
		return nil
	}

	var req chatRequest
	if err := json.NewDecoder(ctx.Request().Body).Decode(&req); err != nil {
		writeErr(ctx.Response(), http.StatusBadRequest, "BAD_REQUEST", "invalid request body")
		//nolint:nilerr // The HTTP error response has already been written.
		return nil
	}
	if len(req.Messages) == 0 {
		writeErr(ctx.Response(), http.StatusBadRequest, "BAD_REQUEST", "messages must not be empty")
		return nil
	}

	messages := make([]aireview.ChatMessage, 0, len(req.Messages)+1)

	// Apply mentor persona (ADR-001). Failures are non-fatal — we fall back
	// to the bootstrap reviewer so a stale/deleted mentor_id never bricks
	// an in-progress chat.
	modelOverride := req.Model
	if req.MentorID != "" && h.mentors != nil {
		if id, err := uuid.Parse(req.MentorID); err == nil {
			if persona, lookupErr := h.mentors.GetActiveByID(stdCtx, id); lookupErr == nil && persona != nil {
				if prompt := persona.PromptTemplate; prompt != "" {
					messages = append(messages, aireview.ChatMessage{Role: "system", Content: prompt})
				}
				if modelOverride == "" {
					modelOverride = persona.ModelID
				}
			}
		}
	}

	for _, m := range req.Messages {
		content := m.Content
		if len(content) > 4000 {
			content = content[:4000]
		}
		messages = append(messages, aireview.ChatMessage{
			Role:    m.Role,
			Content: content,
		})
	}

	reply, err := h.reviewer.Chat(stdCtx, aireview.LiveChatRequest{
		ModelOverride: modelOverride,
		Messages:      messages,
	})
	if err != nil {
		status := http.StatusBadGateway
		if errors.Is(err, aireview.ErrNotConfigured) {
			status = http.StatusServiceUnavailable
		}
		writeErr(ctx.Response(), status, "AI_CHAT_FAILED", err.Error())
		return nil
	}

	ctx.Response().Header().Set("Content-Type", "application/json")
	ctx.Response().WriteHeader(http.StatusOK)
	if err := json.NewEncoder(ctx.Response()).Encode(chatResponse{Reply: reply}); err != nil {
		return fmt.Errorf("encode live chat response: %w", err)
	}
	return nil
}

func writeErr(w http.ResponseWriter, status int, code, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(map[string]string{"code": code, "message": message}); err != nil {
		return
	}
}
