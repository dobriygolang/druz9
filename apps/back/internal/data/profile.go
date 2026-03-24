package data

import (
	"context"
	"database/sql"

	"back/internal/biz"

	"github.com/go-kratos/kratos/v2/log"
)

type profileRepo struct {
	data *Data
	log  *log.Helper
}

// NewProfileRepo .
func NewProfileRepo(data *Data, logger log.Logger) biz.ProfileRepo {
	return &profileRepo{
		data: data,
		log:  log.NewHelper(logger),
	}
}

func (r *profileRepo) Save(ctx context.Context, p *biz.Profile) (*biz.Profile, error) {
	r.log.WithContext(ctx).Infof("Save profile: %v", p)
	row := r.data.DB.QueryRowContext(
		ctx,
		`INSERT INTO profiles (telegram_id, latitude, longitude, photo_url)
		 VALUES ($1, $2, $3, $4)
		 RETURNING id, telegram_id, latitude, longitude, photo_url, created_at, updated_at`,
		p.TelegramID,
		p.Latitude,
		p.Longitude,
		p.PhotoURL,
	)

	profile, err := scanProfile(row)
	if err != nil {
		return nil, err
	}

	return profile, nil
}

func (r *profileRepo) Update(ctx context.Context, p *biz.Profile) (*biz.Profile, error) {
	r.log.WithContext(ctx).Infof("Update profile: %v", p)
	row := r.data.DB.QueryRowContext(
		ctx,
		`UPDATE profiles
		 SET telegram_id = $2, latitude = $3, longitude = $4, photo_url = $5, updated_at = NOW()
		 WHERE id = $1
		 RETURNING id, telegram_id, latitude, longitude, photo_url, created_at, updated_at`,
		p.ID,
		p.TelegramID,
		p.Latitude,
		p.Longitude,
		p.PhotoURL,
	)

	profile, err := scanProfile(row)
	if err != nil {
		return nil, err
	}

	return profile, nil
}

func (r *profileRepo) FindByID(ctx context.Context, id string) (*biz.Profile, error) {
	r.log.WithContext(ctx).Infof("FindByID: %s", id)
	row := r.data.DB.QueryRowContext(
		ctx,
		`SELECT id, telegram_id, latitude, longitude, photo_url, created_at, updated_at
		 FROM profiles
		 WHERE id = $1`,
		id,
	)

	profile, err := scanProfile(row)
	if err != nil {
		return nil, err
	}

	return profile, nil
}

func (r *profileRepo) FindByTelegramID(ctx context.Context, telegramID string) (*biz.Profile, error) {
	r.log.WithContext(ctx).Infof("FindByTelegramID: %s", telegramID)
	row := r.data.DB.QueryRowContext(
		ctx,
		`SELECT id, telegram_id, latitude, longitude, photo_url, created_at, updated_at
		 FROM profiles
		 WHERE telegram_id = $1`,
		telegramID,
	)

	profile, err := scanProfile(row)
	if err != nil {
		return nil, err
	}

	return profile, nil
}

func (r *profileRepo) ListAll(ctx context.Context) ([]*biz.Profile, error) {
	r.log.WithContext(ctx).Infof("ListAll profiles")
	rows, err := r.data.DB.QueryContext(
		ctx,
		`SELECT id, telegram_id, latitude, longitude, photo_url, created_at, updated_at
		 FROM profiles
		 ORDER BY created_at DESC`,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	profiles := make([]*biz.Profile, 0)
	for rows.Next() {
		profile, err := scanProfile(rows)
		if err != nil {
			return nil, err
		}
		profiles = append(profiles, profile)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return profiles, nil
}

type profileScanner interface {
	Scan(dest ...any) error
}

func scanProfile(scanner profileScanner) (*biz.Profile, error) {
	profile := &biz.Profile{}
	if err := scanner.Scan(
		&profile.ID,
		&profile.TelegramID,
		&profile.Latitude,
		&profile.Longitude,
		&profile.PhotoURL,
		&profile.CreatedAt,
		&profile.UpdatedAt,
	); err != nil {
		if err == sql.ErrNoRows {
			return nil, biz.ErrProfileNotFound
		}
		return nil, err
	}
	return profile, nil
}
