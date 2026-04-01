package profile

import (
	"context"

	v1 "api/pkg/api/profile/v1"

	"google.golang.org/protobuf/types/known/timestamppb"
)

func (i *Implementation) CreateTelegramAuthChallenge(ctx context.Context, _ *v1.CreateTelegramAuthChallengeRequest) (*v1.CreateTelegramAuthChallengeResponse, error) {
	challenge, err := i.service.CreateTelegramAuthChallenge(ctx)
	if err != nil {
		return nil, err
	}

	return &v1.CreateTelegramAuthChallengeResponse{
		Token:       challenge.Token,
		BotStartUrl: challenge.BotStartURL,
		ExpiresAt:   timestamppb.New(challenge.ExpiresAt),
	}, nil
}
