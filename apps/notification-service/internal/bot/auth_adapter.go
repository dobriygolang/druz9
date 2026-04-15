package bot

import (
	"context"
	"fmt"

	authpb "notification-service/pkg/auth_callback/v1"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
)

// GRPCAuthAdapter implements AuthConfirmer by calling back to the API's
// ProfileService.ConfirmTelegramAuth via gRPC.
type GRPCAuthAdapter struct {
	conn   *grpc.ClientConn
	client authpb.ProfileServiceClient
	token  string // bot token to pass to API for validation
}

func NewGRPCAuthAdapter(apiAddr, botToken string) (*GRPCAuthAdapter, error) {
	conn, err := grpc.NewClient(apiAddr, grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		return nil, fmt.Errorf("connect API for auth callback: %w", err)
	}
	return &GRPCAuthAdapter{
		conn:   conn,
		client: authpb.NewProfileServiceClient(conn),
		token:  botToken,
	}, nil
}

func (a *GRPCAuthAdapter) Close() error {
	if a.conn != nil {
		return a.conn.Close()
	}
	return nil
}

func (a *GRPCAuthAdapter) ConfirmTelegramAuth(ctx context.Context, challengeToken string, telegramID int64, firstName, lastName, username, photoURL string) (string, error) {
	resp, err := a.client.ConfirmTelegramAuth(ctx, &authpb.ConfirmTelegramAuthRequest{
		Token:      challengeToken,
		BotToken:   a.token,
		TelegramId: telegramID,
		FirstName:  firstName,
		LastName:   lastName,
		Username:   username,
		PhotoUrl:   photoURL,
	})
	if err != nil {
		return "", err
	}
	return resp.Code, nil
}
