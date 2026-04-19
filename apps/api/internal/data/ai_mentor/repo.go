package ai_mentor

import (
	"context"
	"fmt"

	"github.com/google/uuid"

	"api/internal/storage/postgres"
)

// Row mirrors the ai_mentors table.
type Row struct {
	ID             uuid.UUID
	Name           string
	Provider       string
	ModelID        string
	Tier           int32
	PromptTemplate string
	IsActive       bool
}

type Repo struct {
	data *postgres.Store
}

func NewRepo(store *postgres.Store) *Repo { return &Repo{data: store} }

func (r *Repo) ListActive(ctx context.Context) ([]*Row, error) {
	rows, err := r.data.DB.Query(ctx, `
        SELECT id, name, provider, model_id, tier, prompt_template, is_active
        FROM ai_mentors
        WHERE is_active = TRUE
        ORDER BY tier ASC, name ASC
    `)
	if err != nil {
		return nil, fmt.Errorf("list active ai_mentors: %w", err)
	}
	defer rows.Close()
	var out []*Row
	for rows.Next() {
		m := &Row{}
		if err := rows.Scan(&m.ID, &m.Name, &m.Provider, &m.ModelID, &m.Tier, &m.PromptTemplate, &m.IsActive); err != nil {
			return nil, fmt.Errorf("scan ai_mentor: %w", err)
		}
		out = append(out, m)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("rows error: %w", err)
	}
	return out, nil
}

func (r *Repo) List(ctx context.Context) ([]*Row, error) {
	rows, err := r.data.DB.Query(ctx, `
        SELECT id, name, provider, model_id, tier, prompt_template, is_active
        FROM ai_mentors
        ORDER BY tier ASC, name ASC
    `)
	if err != nil {
		return nil, fmt.Errorf("list ai_mentors: %w", err)
	}
	defer rows.Close()
	var out []*Row
	for rows.Next() {
		m := &Row{}
		if err := rows.Scan(&m.ID, &m.Name, &m.Provider, &m.ModelID, &m.Tier, &m.PromptTemplate, &m.IsActive); err != nil {
			return nil, fmt.Errorf("scan ai_mentor: %w", err)
		}
		out = append(out, m)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("rows error: %w", err)
	}
	return out, nil
}

func (r *Repo) Create(ctx context.Context, m *Row) (*Row, error) {
	m.ID = uuid.New()
	_, err := r.data.DB.Exec(ctx, `
        INSERT INTO ai_mentors (id, name, provider, model_id, tier, prompt_template, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, m.ID, m.Name, m.Provider, m.ModelID, m.Tier, m.PromptTemplate, m.IsActive)
	if err != nil {
		return nil, fmt.Errorf("create ai_mentor: %w", err)
	}
	return m, nil
}

func (r *Repo) Update(ctx context.Context, m *Row) (*Row, error) {
	_, err := r.data.DB.Exec(ctx, `
        UPDATE ai_mentors
        SET name = $2, provider = $3, model_id = $4, tier = $5,
            prompt_template = $6, is_active = $7, updated_at = NOW()
        WHERE id = $1
    `, m.ID, m.Name, m.Provider, m.ModelID, m.Tier, m.PromptTemplate, m.IsActive)
	if err != nil {
		return nil, fmt.Errorf("update ai_mentor: %w", err)
	}
	return m, nil
}

func (r *Repo) Delete(ctx context.Context, id uuid.UUID) error {
	_, err := r.data.DB.Exec(ctx, `DELETE FROM ai_mentors WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("delete ai_mentor: %w", err)
	}
	return nil
}
