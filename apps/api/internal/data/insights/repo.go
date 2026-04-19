// Package insights persists ADR-002 personalized recommendations.
package insights

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/go-kratos/kratos/v2/log"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"api/internal/storage/postgres"
)

type Item struct {
	Title       string `json:"title"`
	Description string `json:"description"`
	ActionURL   string `json:"action_url,omitempty"`
}

type Insight struct {
	UserID       uuid.UUID
	Summary      string
	TopStrengths []Item
	TopGaps      []Item
	NextSteps    []Item
	GeneratedAt  time.Time
	Source       string // 'deterministic' | 'llm:<model_id>'
}

var ErrNotFound = errors.New("insight not found")

type Repo struct {
	data *postgres.Store
	log  *log.Helper
}

func NewRepo(store *postgres.Store, logger log.Logger) *Repo {
	return &Repo{data: store, log: log.NewHelper(logger)}
}

func (r *Repo) Get(ctx context.Context, userID uuid.UUID) (*Insight, error) {
	row := r.data.DB.QueryRow(ctx, `
        SELECT user_id, summary, top_strengths, top_gaps, next_steps, generated_at, source
        FROM user_insights WHERE user_id = $1
    `, userID)
	ins := &Insight{}
	var strengthsJSON, gapsJSON, nextJSON []byte
	if err := row.Scan(&ins.UserID, &ins.Summary, &strengthsJSON, &gapsJSON, &nextJSON, &ins.GeneratedAt, &ins.Source); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("get insight: %w", err)
	}
	if err := json.Unmarshal(strengthsJSON, &ins.TopStrengths); err != nil {
		return nil, fmt.Errorf("decode top_strengths: %w", err)
	}
	if err := json.Unmarshal(gapsJSON, &ins.TopGaps); err != nil {
		return nil, fmt.Errorf("decode top_gaps: %w", err)
	}
	if err := json.Unmarshal(nextJSON, &ins.NextSteps); err != nil {
		return nil, fmt.Errorf("decode next_steps: %w", err)
	}
	return ins, nil
}

func (r *Repo) Upsert(ctx context.Context, ins *Insight) error {
	if ins == nil || ins.UserID == uuid.Nil {
		return fmt.Errorf("upsert insight: user_id required")
	}
	strengths, err := json.Marshal(ins.TopStrengths)
	if err != nil {
		return fmt.Errorf("encode top_strengths: %w", err)
	}
	gaps, err := json.Marshal(ins.TopGaps)
	if err != nil {
		return fmt.Errorf("encode top_gaps: %w", err)
	}
	next, err := json.Marshal(ins.NextSteps)
	if err != nil {
		return fmt.Errorf("encode next_steps: %w", err)
	}
	source := ins.Source
	if source == "" {
		source = "deterministic"
	}
	_, err = r.data.DB.Exec(ctx, `
        INSERT INTO user_insights (user_id, summary, top_strengths, top_gaps, next_steps, generated_at, source)
        VALUES ($1, $2, $3, $4, $5, NOW(), $6)
        ON CONFLICT (user_id) DO UPDATE
            SET summary = EXCLUDED.summary,
                top_strengths = EXCLUDED.top_strengths,
                top_gaps = EXCLUDED.top_gaps,
                next_steps = EXCLUDED.next_steps,
                generated_at = NOW(),
                source = EXCLUDED.source
    `, ins.UserID, ins.Summary, strengths, gaps, next, source)
	if err != nil {
		return fmt.Errorf("upsert insight: %w", err)
	}
	return nil
}
