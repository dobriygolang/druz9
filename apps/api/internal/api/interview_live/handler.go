package interview_live

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"

	kratoshttp "github.com/go-kratos/kratos/v2/transport/http"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"api/internal/aireview"
	"api/internal/model"
	premiumdata "api/internal/data/premium"
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
	reviewer    aireview.Reviewer
	mentors     MentorResolver
	db          *pgxpool.Pool
	premiumRepo *premiumdata.Repo
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

// WithDB wires a database pool so SaveSession can persist completed
// sessions. Optional — when nil, SaveSession returns 200 without storing.
func (h *Handler) WithDB(db *pgxpool.Pool) *Handler {
	h.db = db
	return h
}

// WithPremiumRepo wires the premium repo for tier=1 mentor enforcement.
func (h *Handler) WithPremiumRepo(r *premiumdata.Repo) *Handler {
	h.premiumRepo = r
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

	u, ok := model.UserFromContext(stdCtx)
	if !ok {
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
				// Tier=1 mentors require an active Boosty premium subscription.
				if persona.Tier == 1 && h.premiumRepo != nil {
					isPremium, checkErr := h.premiumRepo.IsPremium(stdCtx, u.ID)
					if checkErr != nil || !isPremium {
						writeErr(ctx.Response(), http.StatusPaymentRequired, "PREMIUM_REQUIRED",
							"this mentor requires a Boosty premium subscription")
						return nil
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

type saveSessionRequest struct {
	Focus      string `json:"focus"`
	FrontID    string `json:"frontId"`
	Transcript []struct {
		Role    string `json:"role"`
		Content string `json:"content"`
	} `json:"transcript"`
	Code       string `json:"code"`
	Evaluation string `json:"evaluation"`
	DurationS  int    `json:"durationS"`
}

// SaveSession persists a completed live interview session. The endpoint
// is fire-and-forget from the client: it always returns 200 even if
// storage fails (the user experience shouldn't break on a save error).
func (h *Handler) SaveSession(ctx kratoshttp.Context) error {
	stdCtx := ctx.Request().Context()
	user, ok := model.UserFromContext(stdCtx)
	if !ok {
		writeErr(ctx.Response(), http.StatusUnauthorized, "UNAUTHORIZED", "authentication required")
		return nil
	}

	var req saveSessionRequest
	if err := json.NewDecoder(ctx.Request().Body).Decode(&req); err != nil {
		writeErr(ctx.Response(), http.StatusBadRequest, "BAD_REQUEST", "invalid request body")
		//nolint:nilerr
		return nil
	}

	sessionID := uuid.New()
	ctx.Response().Header().Set("Content-Type", "application/json")

	if h.db == nil {
		ctx.Response().WriteHeader(http.StatusOK)
		_ = json.NewEncoder(ctx.Response()).Encode(map[string]string{"id": sessionID.String()})
		return nil
	}

	transcriptJSON, _ := json.Marshal(req.Transcript)

	var frontID *uuid.UUID
	if req.FrontID != "" {
		if id, err := uuid.Parse(req.FrontID); err == nil {
			frontID = &id
		}
	}

	focus := req.Focus
	if focus == "" {
		focus = "default"
	}

	if _, err := h.db.Exec(stdCtx, `
        INSERT INTO interview_live_sessions
            (id, user_id, focus, front_id, transcript, code, evaluation, duration_s)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, sessionID, user.ID, focus, frontID, transcriptJSON, req.Code, req.Evaluation, req.DurationS); err != nil {
		// Non-fatal — log and still return 200 so the client isn't blocked.
		fmt.Printf("interview_live: save session user=%s: %v\n", user.ID, err)
	}

	ctx.Response().WriteHeader(http.StatusOK)
	_ = json.NewEncoder(ctx.Response()).Encode(map[string]string{"id": sessionID.String()})
	return nil
}
