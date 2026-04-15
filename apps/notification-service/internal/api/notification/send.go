package notification

import (
	"context"
	"encoding/json"

	v1 "notification-service/pkg/notification/v1"

	"github.com/google/uuid"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/encoding/protojson"
)

func (i *Implementation) Send(ctx context.Context, req *v1.SendRequest) (*v1.SendResponse, error) {
	userID, err := uuid.Parse(req.GetUserId())
	if err != nil {
		return nil, status.Errorf(codes.InvalidArgument, "invalid user_id: %v", err)
	}
	kind, ok := notificationKind(req.GetKind())
	if !ok {
		return nil, status.Error(codes.InvalidArgument, "invalid kind")
	}

	var payload json.RawMessage
	if req.GetPayload() != nil {
		payload, err = protojson.Marshal(req.GetPayload())
		if err != nil {
			return nil, status.Errorf(codes.InvalidArgument, "invalid payload: %v", err)
		}
	}
	if payload == nil {
		payload = []byte("{}")
	}

	id, err := i.service.Send(ctx, userID, kind, req.GetTitle(), req.GetBody(), payload, nil)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "send: %v", err)
	}

	return &v1.SendResponse{NotificationId: id.String()}, nil
}
