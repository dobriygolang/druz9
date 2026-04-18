package profile

import (
	"context"

	"api/internal/model"
	authcallbackv1 "api/pkg/auth_callback/v1"
)

func (i *Implementation) ConfirmTelegramAuth(ctx context.Context, req *authcallbackv1.ConfirmTelegramAuthRequest) (*authcallbackv1.ConfirmTelegramAuthResponse, error) {
	code, err := i.service.ConfirmTelegramAuth(ctx, req.GetBotToken(), req.GetToken(), model.TelegramAuthPayload{
		ID:        req.GetTelegramId(),
		FirstName: req.GetFirstName(),
		LastName:  req.GetLastName(),
		Username:  req.GetUsername(),
		PhotoURL:  req.GetPhotoUrl(),
	})
	if err != nil {
		return nil, err
	}

	return &authcallbackv1.ConfirmTelegramAuthResponse{
		Status: authcallbackv1.OperationStatus_OPERATION_STATUS_OK,
		Code:   code,
	}, nil
}
