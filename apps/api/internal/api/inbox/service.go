// Package inbox (api layer) is the thin gRPC/HTTP transport shim over the
// inbox domain service. Handlers in this package do authentication, proto↔
// domain mapping, and kratos error translation — nothing else.
package inbox

import (
	"context"

	"github.com/google/uuid"
	"google.golang.org/grpc"

	"api/internal/model"
	v1 "api/pkg/api/inbox/v1"
)

// UserResolver looks up a user by ID — used to resolve recipient display
// names when creating direct threads without a full profile service dep.
type UserResolver interface {
	FindUserByID(ctx context.Context, id uuid.UUID) (*model.User, error)
}

// Service is the interface that the transport layer expects from the
// inbox domain service. Only what the handlers call is listed here.
type Service interface {
	ListThreads(ctx context.Context, userID uuid.UUID, limit, offset int32) (*model.ThreadList, error)
	GetThread(ctx context.Context, userID, threadID uuid.UUID) (*model.ThreadWithMessages, error)
	MarkThreadRead(ctx context.Context, userID, threadID uuid.UUID) (int32, error)
	SendMessage(ctx context.Context, userID, threadID uuid.UUID, senderName, body string) (*model.InboxMessage, error)
	GetUnreadCount(ctx context.Context, userID uuid.UUID) (int32, error)
	CreateDirectThread(ctx context.Context, senderID, recipientID uuid.UUID, senderName, recipientName, subject string) (*model.InboxThread, error)
}

// Implementation is the gRPC/HTTP handler for InboxService.
type Implementation struct {
	v1.UnimplementedInboxServiceServer
	service      Service
	userResolver UserResolver
	gifts        GiftsRepo
}

// New constructs the inbox service Implementation.
func New(service Service, userResolver UserResolver) *Implementation {
	return &Implementation{service: service, userResolver: userResolver}
}

// GetDescription returns gRPC service description for registration helpers.
func (i *Implementation) GetDescription() grpc.ServiceDesc {
	return v1.InboxService_ServiceDesc
}
