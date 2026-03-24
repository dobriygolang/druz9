package data

import (
	"context"
	"database/sql"

	"back/internal/biz"

	"github.com/go-kratos/kratos/v2/log"
)

type podcastRepo struct {
	data *Data
	log  *log.Helper
}

// NewPodcastRepo .
func NewPodcastRepo(data *Data, logger log.Logger) biz.PodcastRepo {
	return &podcastRepo{
		data: data,
		log:  log.NewHelper(logger),
	}
}

func (r *podcastRepo) Save(ctx context.Context, p *biz.Podcast) (*biz.Podcast, error) {
	r.log.WithContext(ctx).Infof("Save podcast: %v", p)
	row := r.data.DB.QueryRowContext(
		ctx,
		`INSERT INTO podcasts (title, description, audio_url)
		 VALUES ($1, $2, $3)
		 RETURNING id, title, description, audio_url`,
		p.Title,
		p.Description,
		p.AudioURL,
	)

	podcast, err := scanPodcast(row)
	if err != nil {
		return nil, err
	}

	return podcast, nil
}

func (r *podcastRepo) Update(ctx context.Context, p *biz.Podcast) (*biz.Podcast, error) {
	r.log.WithContext(ctx).Infof("Update podcast: %v", p)
	row := r.data.DB.QueryRowContext(
		ctx,
		`UPDATE podcasts
		 SET title = $2, description = $3, audio_url = $4, updated_at = NOW()
		 WHERE id = $1
		 RETURNING id, title, description, audio_url`,
		p.ID,
		p.Title,
		p.Description,
		p.AudioURL,
	)

	podcast, err := scanPodcast(row)
	if err != nil {
		return nil, err
	}

	return podcast, nil
}

func (r *podcastRepo) FindByID(ctx context.Context, id string) (*biz.Podcast, error) {
	r.log.WithContext(ctx).Infof("FindByID: %s", id)
	row := r.data.DB.QueryRowContext(
		ctx,
		`SELECT id, title, description, audio_url
		 FROM podcasts
		 WHERE id = $1`,
		id,
	)

	podcast, err := scanPodcast(row)
	if err != nil {
		return nil, err
	}

	return podcast, nil
}

func (r *podcastRepo) ListAll(ctx context.Context) ([]*biz.Podcast, error) {
	r.log.WithContext(ctx).Infof("ListAll podcasts")
	rows, err := r.data.DB.QueryContext(
		ctx,
		`SELECT id, title, description, audio_url
		 FROM podcasts
		 ORDER BY created_at DESC`,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	podcasts := make([]*biz.Podcast, 0)
	for rows.Next() {
		podcast, err := scanPodcast(rows)
		if err != nil {
			return nil, err
		}
		podcasts = append(podcasts, podcast)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return podcasts, nil
}

type podcastScanner interface {
	Scan(dest ...any) error
}

func scanPodcast(scanner podcastScanner) (*biz.Podcast, error) {
	podcast := &biz.Podcast{}
	if err := scanner.Scan(&podcast.ID, &podcast.Title, &podcast.Description, &podcast.AudioURL); err != nil {
		if err == sql.ErrNoRows {
			return nil, biz.ErrPodcastNotFound
		}
		return nil, err
	}
	return podcast, nil
}
