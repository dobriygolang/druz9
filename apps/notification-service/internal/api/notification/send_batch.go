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

func (i *Implementation) SendBatch(ctx context.Context, req *v1.SendBatchRequest) (*v1.SendBatchResponse, error) {
	kind, ok := notificationKind(req.GetKind())
	if !ok {
		return nil, status.Error(codes.InvalidArgument, "invalid kind")
	}

	userIDs := make([]uuid.UUID, 0, len(req.GetUserIds()))
	for _, raw := range req.GetUserIds() {
		id, err := uuid.Parse(raw)
		if err != nil {
			return nil, status.Errorf(codes.InvalidArgument, "invalid user_id %q: %v", raw, err)
		}
		userIDs = append(userIDs, id)
	}

	var payload json.RawMessage
	var err error
	if req.GetPayload() != nil {
		payload, err = protojson.Marshal(req.GetPayload())
		if err != nil {
			return nil, status.Errorf(codes.InvalidArgument, "invalid payload: %v", err)
		}
	}
	if payload == nil {
		payload = []byte("{}")
	}

	count, err := i.service.SendBatch(ctx, userIDs, kind, req.GetTitle(), req.GetBody(), payload)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "send batch: %v", err)
	}

	return &v1.SendBatchResponse{Enqueued: int32(count)}, nil
}
