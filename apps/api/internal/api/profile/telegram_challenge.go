package profile

import (
	"context"
	"fmt"

	"google.golang.org/protobuf/types/known/timestamppb"

	v1 "api/pkg/api/profile/v1"
)

func (i *Implementation) CreateTelegramAuthChallenge(ctx context.Context, _ *v1.CreateTelegramAuthChallengeRequest) (*v1.CreateTelegramAuthChallengeResponse, error) {
	challenge, err := i.service.CreateTelegramAuthChallenge(ctx)
	if err != nil {
		return nil, fmt.Errorf("create telegram auth challenge: %w", err)
	}

	return &v1.CreateTelegramAuthChallengeResponse{
		Token:       challenge.Token,
		BotStartUrl: challenge.BotStartURL,
		ExpiresAt:   timestamppb.New(challenge.ExpiresAt),
	}, nil
}
