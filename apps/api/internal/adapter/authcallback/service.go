package authcallback

import (
	"context"

	"api/internal/model"
	v1 "api/pkg/adapter/auth_callback/v1"

	kratosgrpc "github.com/go-kratos/kratos/v2/transport/grpc"
)

type Service interface {
	ConfirmTelegramAuth(context.Context, string, string, model.TelegramAuthPayload) (string, error)
}

type Server struct {
	v1.UnimplementedAuthCallbackServiceServer
	service Service
}

func New(service Service) *Server {
	return &Server{service: service}
}

func RegisterGRPC(grpcServer *kratosgrpc.Server, service Service) {
	v1.RegisterAuthCallbackServiceServer(grpcServer, New(service))
}

func (s *Server) ConfirmTelegramAuth(ctx context.Context, req *v1.ConfirmTelegramAuthRequest) (*v1.ConfirmTelegramAuthResponse, error) {
	code, err := s.service.ConfirmTelegramAuth(ctx, req.GetBotToken(), req.GetToken(), model.TelegramAuthPayload{
		ID:        req.GetTelegramId(),
		FirstName: req.GetFirstName(),
		LastName:  req.GetLastName(),
		Username:  req.GetUsername(),
		PhotoURL:  req.GetPhotoUrl(),
	})
	if err != nil {
		return nil, err
	}

	return &v1.ConfirmTelegramAuthResponse{
		Status: v1.OperationStatus_OPERATION_STATUS_OK,
		Code:   code,
	}, nil
}
