package interview_live

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"

	kratoshttp "github.com/go-kratos/kratos/v2/transport/http"

	"api/internal/aireview"
	"api/internal/model"
)

type Handler struct {
	reviewer aireview.Reviewer
}

func New(reviewer aireview.Reviewer) *Handler {
	return &Handler{reviewer: reviewer}
}

type inboundMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type chatRequest struct {
	Messages []inboundMessage `json:"messages"`
	Model    string           `json:"model"`
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

	messages := make([]aireview.ChatMessage, 0, len(req.Messages))
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
		ModelOverride: req.Model,
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
