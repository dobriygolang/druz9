package profile

import (
	"context"

	"google.golang.org/protobuf/types/known/timestamppb"

	v1 "api/pkg/api/profile/v1"
)

func (i *Implementation) StartYandexAuth(ctx context.Context, _ *v1.StartYandexAuthRequest) (*v1.StartYandexAuthResponse, error) {
	start, err := i.service.StartYandexAuth(ctx)
	if err != nil {
		return nil, err
	}

	return &v1.StartYandexAuthResponse{
		State:     start.State,
		AuthUrl:   start.AuthURL,
		ExpiresAt: timestamppb.New(start.ExpiresAt),
	}, nil
}
