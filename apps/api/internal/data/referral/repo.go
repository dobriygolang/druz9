package referral

import (
	"context"
	"errors"
	"fmt"
	"strings"

	referraldomain "api/internal/referral/service"
	"api/internal/model"
	"api/internal/storage/postgres"

	kratoserrors "github.com/go-kratos/kratos/v2/errors"
	"github.com/go-kratos/kratos/v2/log"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

type Repo struct {
	data *postgres.Store
	log  *log.Helper
}

func NewRepo(dataLayer *postgres.Store, logger log.Logger) referraldomain.Repository {
	return &Repo{
		data: dataLayer,
		log:  log.NewHelper(logger),
	}
}

func (r *Repo) ListReferrals(ctx context.Context, currentUser *model.User, opts model.ListReferralsOptions) (*model.ListReferralsResponse, error) {
	// Apply defaults
	if opts.Limit <= 0 || opts.Limit > model.MaxReferralsLimit {
		opts.Limit = model.DefaultReferralsLimit
	}

	// Get total count
	var totalCount int32
	if err := r.data.DB.QueryRow(ctx, `SELECT COUNT(*) FROM referrals`).Scan(&totalCount); err != nil {
		return nil, fmt.Errorf("count referrals: %w", err)
	}

	query := `
SELECT
  r.id,
  r.user_id::text,
  COALESCE(NULLIF(TRIM(CONCAT_WS(' ', u.first_name, u.last_name)), ''), NULLIF(u.telegram_username, ''), 'user'),
  COALESCE(u.telegram_username, ''),
  r.title,
  r.company,
  COALESCE(r.vacancy_url, ''),
  r.description,
  COALESCE(r.experience, ''),
  COALESCE(r.location, ''),
  COALESCE(r.employment_type, ''),
  r.created_at,
  r.updated_at
FROM referrals r
JOIN users u ON u.id = r.user_id
ORDER BY r.created_at DESC
LIMIT $1 OFFSET $2
`
	rows, err := r.data.DB.Query(ctx, query, opts.Limit, opts.Offset)
	if err != nil {
		return nil, fmt.Errorf("query referrals: %w", err)
	}
	defer rows.Close()

	items := make([]*model.Referral, 0)
	for rows.Next() {
		item, err := scanReferral(rows, currentUser)
		if err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate referrals: %w", err)
	}

	hasNextPage := opts.Offset+opts.Limit < totalCount

	return &model.ListReferralsResponse{
		Referrals:   items,
		Limit:       opts.Limit,
		Offset:      opts.Offset,
		TotalCount:  totalCount,
		HasNextPage: hasNextPage,
	}, nil
}

func (r *Repo) CreateReferral(ctx context.Context, user *model.User, req model.CreateReferralRequest) (*model.Referral, error) {
	return scanReferral(r.data.DB.QueryRow(ctx, `
INSERT INTO referrals (id, user_id, title, company, vacancy_url, description, experience, location, employment_type, created_at, updated_at)
VALUES ($1, $2, $3, $4, NULLIF($5, ''), $6, NULLIF($7, ''), NULLIF($8, ''), NULLIF($9, ''), NOW(), NOW())
RETURNING id, user_id::text, $10, $11, title, company, COALESCE(vacancy_url, ''), description, COALESCE(experience, ''), COALESCE(location, ''), COALESCE(employment_type, ''), created_at, updated_at`,
		uuid.New(), user.ID, req.Title, req.Company, req.VacancyURL, req.Description, req.Experience, req.Location, req.EmploymentType,
		referralAuthorName(user), user.TelegramUsername,
	), user)
}

func (r *Repo) UpdateReferral(ctx context.Context, referralID uuid.UUID, user *model.User, req model.UpdateReferralRequest) (*model.Referral, error) {
	if user == nil {
		return nil, kratoserrors.Unauthorized("UNAUTHORIZED", "unauthorized")
	}

	item, err := scanReferral(r.data.DB.QueryRow(ctx, `
WITH updated AS (
  UPDATE referrals
  SET title = $2,
      company = $3,
      vacancy_url = NULLIF($4, ''),
      description = $5,
      experience = NULLIF($6, ''),
      location = NULLIF($7, ''),
      employment_type = NULLIF($8, ''),
      updated_at = NOW()
  WHERE id = $1
    AND ($10 = TRUE OR user_id = $9)
  RETURNING id, user_id, title, company, vacancy_url, description, experience, location, employment_type, created_at, updated_at
)
SELECT
  updated.id,
  updated.user_id::text,
  COALESCE(NULLIF(TRIM(CONCAT_WS(' ', u.first_name, u.last_name)), ''), NULLIF(u.telegram_username, ''), 'user'),
  COALESCE(u.telegram_username, ''),
  updated.title,
  updated.company,
  COALESCE(updated.vacancy_url, ''),
  updated.description,
  COALESCE(updated.experience, ''),
  COALESCE(updated.location, ''),
  COALESCE(updated.employment_type, ''),
  updated.created_at,
  updated.updated_at
FROM updated
JOIN users u ON u.id = updated.user_id
`,
		referralID, req.Title, req.Company, req.VacancyURL, req.Description, req.Experience, req.Location, req.EmploymentType,
		user.ID, user.IsAdmin,
	), user)
	if err != nil {
		if kratoserrors.IsNotFound(err) {
			return nil, r.referralMutationError(ctx, referralID, user)
		}
		return nil, err
	}
	return item, nil
}

func (r *Repo) DeleteReferral(ctx context.Context, referralID uuid.UUID, user *model.User) error {
	if user == nil {
		return kratoserrors.Unauthorized("UNAUTHORIZED", "unauthorized")
	}
	tag, err := r.data.DB.Exec(ctx, `
DELETE FROM referrals
WHERE id = $1
  AND ($3 = TRUE OR user_id = $2)
`, referralID, user.ID, user.IsAdmin)
	if err != nil {
		return fmt.Errorf("delete referral: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return r.referralMutationError(ctx, referralID, user)
	}
	return nil
}

func (r *Repo) referralMutationError(ctx context.Context, referralID uuid.UUID, user *model.User) error {
	var ownerID uuid.UUID
	if err := r.data.DB.QueryRow(ctx, `SELECT user_id FROM referrals WHERE id = $1`, referralID).Scan(&ownerID); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return kratoserrors.NotFound("REFERRAL_NOT_FOUND", "referral not found")
		}
		return fmt.Errorf("load referral owner: %w", err)
	}
	if user != nil && (user.IsAdmin || ownerID == user.ID) {
		return kratoserrors.NotFound("REFERRAL_NOT_FOUND", "referral not found")
	}
	return kratoserrors.Forbidden("FORBIDDEN", "forbidden")
}

type referralScanner interface {
	Scan(dest ...any) error
}

func scanReferral(scanner referralScanner, currentUser *model.User) (*model.Referral, error) {
	var item model.Referral
	if err := scanner.Scan(
		&item.ID,
		&item.UserID,
		&item.AuthorName,
		&item.AuthorTelegramUsername,
		&item.Title,
		&item.Company,
		&item.VacancyURL,
		&item.Description,
		&item.Experience,
		&item.Location,
		&item.EmploymentType,
		&item.CreatedAt,
		&item.UpdatedAt,
	); err != nil {
		if err == pgx.ErrNoRows {
			return nil, kratoserrors.NotFound("REFERRAL_NOT_FOUND", "referral not found")
		}
		return nil, fmt.Errorf("scan referral: %w", err)
	}
	item.AuthorTelegramProfileURL = telegramProfileURL(item.AuthorTelegramUsername)
	item.IsOwner = currentUser != nil && currentUser.ID.String() == item.UserID
	return &item, nil
}

func telegramProfileURL(username string) string {
	username = strings.TrimSpace(username)
	if username == "" {
		return ""
	}
	username = strings.TrimPrefix(username, "@")
	return "https://t.me/" + username
}

func referralAuthorName(user *model.User) string {
	if user == nil {
		return "user"
	}
	name := strings.TrimSpace(strings.TrimSpace(user.FirstName) + " " + strings.TrimSpace(user.LastName))
	if name != "" {
		return name
	}
	if strings.TrimSpace(user.TelegramUsername) != "" {
		return user.TelegramUsername
	}
	return "user"
}
