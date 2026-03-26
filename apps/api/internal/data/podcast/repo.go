package podcast

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"api/internal/model"
	podcastdomain "api/internal/podcast/service"
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

func NewRepo(dataLayer *postgres.Store, logger log.Logger) podcastdomain.Repository {
	return &Repo{
		data: dataLayer,
		log:  log.NewHelper(logger),
	}
}

func (r *Repo) ListPodcasts(ctx context.Context, opts model.ListPodcastsOptions) (*model.ListPodcastsResponse, error) {
	// Apply defaults
	if opts.Limit <= 0 || opts.Limit > model.MaxPodcastsLimit {
		opts.Limit = model.DefaultPodcastsLimit
	}

	// Get total count
	var totalCount int32
	if err := r.data.DB.QueryRow(ctx, `SELECT COUNT(*) FROM podcasts`).Scan(&totalCount); err != nil {
		return nil, fmt.Errorf("count podcasts: %w", err)
	}

	query := `
SELECT id, title, COALESCE(author_id::text, ''), author_name, duration_seconds, listens_count, COALESCE(file_name, ''), COALESCE(content_type, ''), COALESCE(object_key, ''), created_at, updated_at
FROM podcasts
ORDER BY created_at DESC
LIMIT $1 OFFSET $2
`
	rows, err := r.data.DB.Query(ctx, query, opts.Limit, opts.Offset)
	if err != nil {
		return nil, fmt.Errorf("query podcasts: %w", err)
	}
	defer rows.Close()

	podcasts := make([]*model.Podcast, 0)
	for rows.Next() {
		podcast, err := scanPodcast(rows)
		if err != nil {
			return nil, err
		}
		podcasts = append(podcasts, podcast)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate podcasts: %w", err)
	}

	hasNextPage := opts.Offset+opts.Limit < totalCount

	return &model.ListPodcastsResponse{
		Podcasts:    podcasts,
		Limit:       opts.Limit,
		Offset:      opts.Offset,
		TotalCount:  totalCount,
		HasNextPage: hasNextPage,
	}, nil
}

func (r *Repo) GetPodcast(ctx context.Context, podcastID uuid.UUID) (*model.Podcast, error) {
	return scanPodcast(r.data.DB.QueryRow(ctx, `
SELECT id, title, COALESCE(author_id::text, ''), author_name, duration_seconds, listens_count, COALESCE(file_name, ''), COALESCE(content_type, ''), COALESCE(object_key, ''), created_at, updated_at
FROM podcasts
WHERE id = $1`, podcastID))
}

func (r *Repo) CreatePodcast(ctx context.Context, user *model.User, req model.CreatePodcastRequest) (*model.Podcast, error) {
	return scanPodcast(r.data.DB.QueryRow(ctx, `
INSERT INTO podcasts (id, title, author_id, author_name, duration_seconds, listens_count, created_at, updated_at)
VALUES ($1, $2, $3, $4, 0, 0, NOW(), NOW())
RETURNING id, title, COALESCE(author_id::text, ''), author_name, duration_seconds, listens_count, COALESCE(file_name, ''), COALESCE(content_type, ''), COALESCE(object_key, ''), created_at, updated_at`,
		uuid.New(),
		req.Title,
		user.ID,
		displayName(user),
	))
}

func (r *Repo) AttachUpload(ctx context.Context, podcastID uuid.UUID, req model.UploadPodcastRequest, objectKey string) (*model.Podcast, error) {
	return scanPodcast(r.data.DB.QueryRow(ctx, `
UPDATE podcasts
SET file_name = $2,
    content_type = $3,
    object_key = $4,
    duration_seconds = $5,
    updated_at = NOW()
WHERE id = $1
RETURNING id, title, COALESCE(author_id::text, ''), author_name, duration_seconds, listens_count, COALESCE(file_name, ''), COALESCE(content_type, ''), COALESCE(object_key, ''), created_at, updated_at`,
		podcastID,
		req.FileName,
		req.ContentType,
		objectKey,
		req.DurationSeconds,
	))
}

func (r *Repo) DeletePodcast(ctx context.Context, podcastID uuid.UUID) (string, error) {
	var objectKey string
	if err := r.data.DB.QueryRow(ctx, `DELETE FROM podcasts WHERE id = $1 RETURNING COALESCE(object_key, '')`, podcastID).Scan(&objectKey); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return "", kratoserrors.NotFound("PODCAST_NOT_FOUND", "podcast not found")
		}
		return "", fmt.Errorf("delete podcast: %w", err)
	}
	return objectKey, nil
}

func (r *Repo) IncrementListens(ctx context.Context, podcastID uuid.UUID) (*model.Podcast, error) {
	return scanPodcast(r.data.DB.QueryRow(ctx, `
UPDATE podcasts
SET listens_count = listens_count + 1,
    updated_at = NOW()
WHERE id = $1
RETURNING id, title, COALESCE(author_id::text, ''), author_name, duration_seconds, listens_count, COALESCE(file_name, ''), COALESCE(content_type, ''), COALESCE(object_key, ''), created_at, updated_at`,
		podcastID,
	))
}

type podcastScanner interface {
	Scan(dest ...any) error
}

func scanPodcast(scanner podcastScanner) (*model.Podcast, error) {
	var (
		item            model.Podcast
		durationSeconds int32
		listensCount    int64
	)
	if err := scanner.Scan(
		&item.ID,
		&item.Title,
		&item.AuthorID,
		&item.AuthorName,
		&durationSeconds,
		&listensCount,
		&item.FileName,
		&item.ContentType,
		&item.ObjectKey,
		&item.CreatedAt,
		&item.UpdatedAt,
	); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, kratoserrors.NotFound("PODCAST_NOT_FOUND", "podcast not found")
		}
		return nil, fmt.Errorf("scan podcast: %w", err)
	}
	if durationSeconds > 0 {
		item.DurationSeconds = uint32(durationSeconds)
	}
	if listensCount > 0 {
		item.ListensCount = uint64(listensCount)
	}
	item.IsUploaded = item.ObjectKey != ""
	return &item, nil
}

func displayName(user *model.User) string {
	if user == nil {
		return "user"
	}
	if user.FirstName != "" || user.LastName != "" {
		name := strings.TrimSpace(user.FirstName)
		if user.LastName != "" {
			if name != "" {
				name += " "
			}
			name += strings.TrimSpace(user.LastName)
		}
		if name != "" {
			return name
		}
	}
	if user.TelegramUsername != "" {
		return user.TelegramUsername
	}
	return "user"
}
