package service

import (
	"context"

	"back/internal/biz"
	v1 "back/pkg/api/profile/v1"

	"google.golang.org/protobuf/types/known/timestamppb"
)

// ProfileService is a profile service.
type ProfileService struct {
	v1.UnimplementedProfileServiceServer

	uc *biz.ProfileUsecase
}

// NewProfileService new a profile service.
func NewProfileService(uc *biz.ProfileUsecase) *ProfileService {
	return &ProfileService{uc: uc}
}

// GetProfile implements profile.ProfileServiceServer.
func (s *ProfileService) GetProfile(ctx context.Context, in *v1.GetProfileRequest) (*v1.Profile, error) {
	p, err := s.uc.GetProfile(ctx, in.Id)
	if err != nil {
		return nil, err
	}
	return &v1.Profile{
		Id:         p.ID,
		TelegramId: p.TelegramID,
		Latitude:   p.Latitude,
		Longitude:  p.Longitude,
		PhotoUrl:   p.PhotoURL,
		CreatedAt:  timestamppb.New(p.CreatedAt),
		UpdatedAt:  timestamppb.New(p.UpdatedAt),
	}, nil
}

// CreateProfile implements profile.ProfileServiceServer.
func (s *ProfileService) CreateProfile(ctx context.Context, in *v1.CreateProfileRequest) (*v1.Profile, error) {
	p, err := s.uc.CreateProfile(ctx, &biz.Profile{
		TelegramID: in.TelegramId,
		Latitude:   in.Latitude,
		Longitude:  in.Longitude,
		PhotoURL:   in.PhotoUrl,
	})
	if err != nil {
		return nil, err
	}
	return &v1.Profile{
		Id:         p.ID,
		TelegramId: p.TelegramID,
		Latitude:   p.Latitude,
		Longitude:  p.Longitude,
		PhotoUrl:   p.PhotoURL,
		CreatedAt:  timestamppb.New(p.CreatedAt),
		UpdatedAt:  timestamppb.New(p.UpdatedAt),
	}, nil
}

// UpdateLocation implements profile.ProfileServiceServer.
func (s *ProfileService) UpdateLocation(ctx context.Context, in *v1.UpdateLocationRequest) (*v1.Profile, error) {
	p, err := s.uc.UpdateLocation(ctx, in.Id, in.Latitude, in.Longitude)
	if err != nil {
		return nil, err
	}
	return &v1.Profile{
		Id:         p.ID,
		TelegramId: p.TelegramID,
		Latitude:   p.Latitude,
		Longitude:  p.Longitude,
		PhotoUrl:   p.PhotoURL,
		CreatedAt:  timestamppb.New(p.CreatedAt),
		UpdatedAt:  timestamppb.New(p.UpdatedAt),
	}, nil
}

// LinkTelegram implements profile.ProfileServiceServer.
func (s *ProfileService) LinkTelegram(ctx context.Context, in *v1.LinkTelegramRequest) (*v1.Profile, error) {
	p, err := s.uc.LinkTelegram(ctx, in.Id, in.TelegramId, in.VerificationCode)
	if err != nil {
		return nil, err
	}
	return &v1.Profile{
		Id:         p.ID,
		TelegramId: p.TelegramID,
		Latitude:   p.Latitude,
		Longitude:  p.Longitude,
		PhotoUrl:   p.PhotoURL,
		CreatedAt:  timestamppb.New(p.CreatedAt),
		UpdatedAt:  timestamppb.New(p.UpdatedAt),
	}, nil
}
