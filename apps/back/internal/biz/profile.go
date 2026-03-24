package biz

import (
	"context"
	"time"

	"github.com/go-kratos/kratos/v2/errors"
	"github.com/go-kratos/kratos/v2/log"
)

var (
	// ErrProfileNotFound is profile not found.
	ErrProfileNotFound = errors.NotFound("profile_not_found", "profile not found")
	// ErrInvalidTelegramCode is invalid telegram code.
	ErrInvalidTelegramCode = errors.Forbidden("invalid_telegram_code", "invalid telegram code")
)

// Profile is a Profile model.
type Profile struct {
	ID         string
	TelegramID string
	Latitude   float64
	Longitude  float64
	PhotoURL   string
	CreatedAt  time.Time
	UpdatedAt  time.Time
}

// ProfileRepo is a Profile repo.
type ProfileRepo interface {
	Save(context.Context, *Profile) (*Profile, error)
	Update(context.Context, *Profile) (*Profile, error)
	FindByID(context.Context, string) (*Profile, error)
	FindByTelegramID(context.Context, string) (*Profile, error)
	ListAll(context.Context) ([]*Profile, error)
}

// ProfileUsecase is a profile use case.
type ProfileUsecase struct {
	repo ProfileRepo
	log  *log.Helper
}

// NewProfileUsecase new a profile usecase.
func NewProfileUsecase(repo ProfileRepo, logger log.Logger) *ProfileUsecase {
	return &ProfileUsecase{
		repo: repo,
		log:  log.NewHelper(logger),
	}
}

// CreateProfile creates a profile.
func (uc *ProfileUsecase) CreateProfile(ctx context.Context, p *Profile) (*Profile, error) {
	uc.log.WithContext(ctx).Infof("CreateProfile: %v", p)
	return uc.repo.Save(ctx, p)
}

// GetProfile gets a profile by ID.
func (uc *ProfileUsecase) GetProfile(ctx context.Context, id string) (*Profile, error) {
	return uc.repo.FindByID(ctx, id)
}

// UpdateLocation updates user location.
func (uc *ProfileUsecase) UpdateLocation(ctx context.Context, id string, lat, lon float64) (*Profile, error) {
	p, err := uc.repo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	p.Latitude = lat
	p.Longitude = lon
	p.UpdatedAt = time.Now()
	return uc.repo.Update(ctx, p)
}

// LinkTelegram links telegram account to profile.
func (uc *ProfileUsecase) LinkTelegram(ctx context.Context, id, telegramID, _ string) (*Profile, error) {
	// TODO: Verify telegram code with Telegram bot
	p, err := uc.repo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	p.TelegramID = telegramID
	p.UpdatedAt = time.Now()
	return uc.repo.Update(ctx, p)
}
