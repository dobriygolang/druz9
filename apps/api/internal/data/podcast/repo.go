package podcast

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	kratoserrors "github.com/go-kratos/kratos/v2/errors"
	"github.com/go-kratos/kratos/v2/log"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"api/internal/model"
	"api/internal/storage/postgres"
)

type Repo struct {
	data *postgres.Store
	log  *log.Helper
}

func NewRepo(dataLayer *postgres.Store, logger log.Logger) *Repo {
	return &Repo{
		data: dataLayer,
		log:  log.NewHelper(logger),
	}
}

const podcastColumns = `id, title, COALESCE(author_id::text, ''), author_name, duration_seconds, listens_count, COALESCE(file_name, ''), COALESCE(content_type, 0), COALESCE(object_key, ''), created_at, updated_at`

func (r *Repo) ListPodcasts(ctx context.Context, opts model.ListPodcastsOptions) (*model.ListPodcastsResponse, error) {
	// Apply defaults
	if opts.Limit <= 0 || opts.Limit > model.MaxPodcastsLimit {
		opts.Limit = model.DefaultPodcastsLimit
	}

	// Get total count
	var totalCount int32
	if err := r.data.DB.QueryRow(ctx, `SELECT COUNT(*) FROM podcasts WHERE object_key IS NOT NULL AND object_key <> ''`).Scan(&totalCount); err != nil {
		return nil, fmt.Errorf("count podcasts: %w", err)
	}

	query := fmt.Sprintf(`
SELECT %s
FROM podcasts
WHERE object_key IS NOT NULL AND object_key <> ''
ORDER BY created_at DESC
LIMIT $1 OFFSET $2
`, podcastColumns)
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

func (r *Repo) CleanupStaleDrafts(ctx context.Context, olderThan time.Duration) (int64, error) {
	if olderThan <= 0 {
		return 0, nil
	}
	tag, err := r.data.DB.Exec(ctx, `
DELETE FROM podcasts
WHERE COALESCE(object_key, '') = ''
  AND created_at < NOW() - $1::interval
`, olderThan.String())
	if err != nil {
		return 0, fmt.Errorf("cleanup stale podcast drafts: %w", err)
	}
	return tag.RowsAffected(), nil
}

func (r *Repo) GetPodcast(ctx context.Context, podcastID uuid.UUID) (*model.Podcast, error) {
	return scanPodcast(r.data.DB.QueryRow(ctx, fmt.Sprintf(`
SELECT %s
FROM podcasts
WHERE id = $1`, podcastColumns), podcastID))
}

func (r *Repo) CreatePodcast(ctx context.Context, user *model.User, req model.CreatePodcastRequest) (*model.Podcast, error) {
	return scanPodcast(r.data.DB.QueryRow(ctx, "\nINSERT INTO podcasts (id, title, author_id, author_name, duration_seconds, listens_count, created_at, updated_at)\nVALUES ($1, $2, $3, $4, 0, 0, NOW(), NOW())\nRETURNING "+podcastColumns,
		uuid.New(),
		req.Title,
		user.ID,
		displayName(user),
	))
}

func (r *Repo) AttachUpload(ctx context.Context, podcastID uuid.UUID, req model.UploadPodcastRequest, objectKey string) (*model.Podcast, error) {
	return scanPodcast(r.data.DB.QueryRow(ctx, "\nUPDATE podcasts\nSET file_name = $2,\n    content_type = $3,\n    object_key = $4,\n    duration_seconds = $5,\n    updated_at = NOW()\nWHERE id = $1\n\tRETURNING "+podcastColumns,
		podcastID,
		req.FileName,
		model.PodcastContentTypeFromString(req.ContentType),
		objectKey,
		req.DurationSeconds,
	))
}

func (r *Repo) DeletePodcast(ctx context.Context, podcastID uuid.UUID, actor *model.User) (string, error) {
	if actor == nil {
		return "", kratoserrors.Unauthorized("UNAUTHORIZED", "unauthorized")
	}
	var objectKey string
	if err := r.data.DB.QueryRow(ctx, `
DELETE FROM podcasts
WHERE id = $1
  AND ($2 = TRUE OR author_id = $3)
RETURNING COALESCE(object_key, '')
`, podcastID, actor.IsAdmin, actor.ID).Scan(&objectKey); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return "", kratoserrors.Forbidden("FORBIDDEN", "podcast can be deleted only by author or admin")
		}
		return "", fmt.Errorf("delete podcast: %w", err)
	}
	return objectKey, nil
}

func (r *Repo) IncrementListens(ctx context.Context, podcastID uuid.UUID) (*model.Podcast, error) {
	return scanPodcast(r.data.DB.QueryRow(ctx, "\nUPDATE podcasts\nSET listens_count = listens_count + 1,\n    updated_at = NOW()\nWHERE id = $1\nRETURNING "+podcastColumns,
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
		contentType     int32
	)
	if err := scanner.Scan(
		&item.ID,
		&item.Title,
		&item.AuthorID,
		&item.AuthorName,
		&durationSeconds,
		&listensCount,
		&item.FileName,
		&contentType,
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
	item.ContentType = model.PodcastContentType(contentType)
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
	if user.Username != "" {
		return user.Username
	}
	return "user"
}
