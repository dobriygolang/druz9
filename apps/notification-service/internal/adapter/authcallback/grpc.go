package authcallback

import (
	"context"
	"fmt"

	v1 "notification-service/pkg/adapter/auth_callback/v1"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
)

type GRPCAdapter struct {
	conn   *grpc.ClientConn
	client v1.AuthCallbackServiceClient
	token  string
}

func NewGRPCAdapter(apiAddr, botToken string) (*GRPCAdapter, error) {
	conn, err := grpc.NewClient(apiAddr, grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		return nil, fmt.Errorf("connect API auth callback: %w", err)
	}
	return &GRPCAdapter{
		conn:   conn,
		client: v1.NewAuthCallbackServiceClient(conn),
		token:  botToken,
	}, nil
}

func (a *GRPCAdapter) Close() error {
	if a.conn != nil {
		return a.conn.Close()
	}
	return nil
}

func (a *GRPCAdapter) ConfirmTelegramAuth(ctx context.Context, challengeToken string, telegramID int64, firstName, lastName, username, photoURL string) (string, error) {
	resp, err := a.client.ConfirmTelegramAuth(ctx, &v1.ConfirmTelegramAuthRequest{
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
	return resp.GetCode(), nil
}
