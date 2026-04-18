package interviewprep

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
)

// InterviewExperienceRow mirrors interview_experiences (00018).
type InterviewExperienceRow struct {
	ID                uuid.UUID
	UserID            uuid.UUID
	CompanyTag        string
	Role              string
	Level             string
	OverallRating     int32
	LoopStructure     string
	Questions         string
	FeedbackReceived  string
	Outcome           string
	IsAnonymous       bool
	ModerationStatus  string
	PostedAt          time.Time
}

func (r *Repo) InsertInterviewExperience(ctx context.Context, row *InterviewExperienceRow) (*InterviewExperienceRow, error) {
	if row.ID == uuid.Nil {
		row.ID = uuid.New()
	}
	if row.ModerationStatus == "" {
		row.ModerationStatus = "pending"
	}
	_, err := r.data.DB.Exec(ctx, `
        INSERT INTO interview_experiences
            (id, user_id, company_tag, role, level, overall_rating,
             loop_structure, questions, feedback_received, outcome,
             is_anonymous, moderation_status)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
    `, row.ID, row.UserID, row.CompanyTag, row.Role, row.Level, row.OverallRating,
		row.LoopStructure, row.Questions, row.FeedbackReceived, row.Outcome,
		row.IsAnonymous, row.ModerationStatus)
	if err != nil {
		return nil, fmt.Errorf("insert interview experience: %w", err)
	}
	return r.GetInterviewExperience(ctx, row.ID)
}

func (r *Repo) GetInterviewExperience(ctx context.Context, id uuid.UUID) (*InterviewExperienceRow, error) {
	row := &InterviewExperienceRow{ID: id}
	err := r.data.DB.QueryRow(ctx, `
        SELECT user_id, company_tag, role, level, overall_rating,
               loop_structure, questions, feedback_received, outcome,
               is_anonymous, moderation_status, posted_at
        FROM interview_experiences WHERE id = $1
    `, id).Scan(
		&row.UserID, &row.CompanyTag, &row.Role, &row.Level, &row.OverallRating,
		&row.LoopStructure, &row.Questions, &row.FeedbackReceived, &row.Outcome,
		&row.IsAnonymous, &row.ModerationStatus, &row.PostedAt,
	)
	if err != nil {
		return nil, err
	}
	return row, nil
}

// ListApprovedExperiences returns moderation_status='approved' rows
// filtered by company. Rejected / pending rows stay private to the
// author and moderators. (Author's own pending rows are listable via
// a separate "my drafts" call once that UI is built.)
func (r *Repo) ListApprovedExperiences(ctx context.Context, companyTag string, limit, offset int32) ([]*InterviewExperienceRow, int32, error) {
	args := []any{}
	where := "moderation_status = 'approved'"
	idx := 1
	if companyTag != "" {
		where += fmt.Sprintf(" AND company_tag = $%d", idx)
		args = append(args, companyTag)
		idx++
	}
	listArgs := append([]any{}, args...)
	listArgs = append(listArgs, limit, offset)
	rows, err := r.data.DB.Query(ctx, fmt.Sprintf(`
        SELECT id, user_id, company_tag, role, level, overall_rating,
               loop_structure, questions, feedback_received, outcome,
               is_anonymous, moderation_status, posted_at
        FROM interview_experiences WHERE %s
        ORDER BY posted_at DESC LIMIT $%d OFFSET $%d
    `, where, idx, idx+1), listArgs...)
	if err != nil {
		return nil, 0, fmt.Errorf("list experiences: %w", err)
	}
	defer rows.Close()
	out := make([]*InterviewExperienceRow, 0, limit)
	for rows.Next() {
		e := &InterviewExperienceRow{}
		if err := rows.Scan(&e.ID, &e.UserID, &e.CompanyTag, &e.Role, &e.Level, &e.OverallRating,
			&e.LoopStructure, &e.Questions, &e.FeedbackReceived, &e.Outcome,
			&e.IsAnonymous, &e.ModerationStatus, &e.PostedAt); err != nil {
			return nil, 0, err
		}
		out = append(out, e)
	}
	var total int32
	if err := r.data.DB.QueryRow(ctx, fmt.Sprintf(`SELECT COUNT(*) FROM interview_experiences WHERE %s`, where), args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count experiences: %w", err)
	}
	return out, total, nil
}
