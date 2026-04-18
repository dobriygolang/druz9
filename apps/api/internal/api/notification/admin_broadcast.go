package notification

import (
	"context"

	"github.com/go-kratos/kratos/v2/errors"
	klog "github.com/go-kratos/kratos/v2/log"

	"api/internal/apihelpers"
	v1 "api/pkg/api/notification/v1"
)

// AdminBroadcast fans out an in-app notification to every user in
// target_user_ids. An empty target list is rejected — broadcast-to-all
// would need a separate cursor-paginated path so a typo doesn't notify
// every registered user at once.
//
// Delivery is fire-and-forget through the notification-service; the
// response `delivered` is "queued for delivery", not "received by
// device".
func (i *SettingsImplementation) AdminBroadcast(ctx context.Context, req *v1.AdminBroadcastRequest) (*v1.AdminBroadcastResponse, error) {
	if _, err := apihelpers.RequireAdmin(ctx); err != nil {
		return nil, err
	}
	if req.GetTitle() == "" || req.GetBody() == "" {
		return nil, errors.BadRequest("INVALID_BROADCAST", "title and body are required")
	}
	if len(req.GetTargetUserIds()) == 0 {
		return nil, errors.BadRequest("EMPTY_AUDIENCE", "target_user_ids is required — broadcast-to-all not supported yet")
	}
	payload := map[string]any{}
	if dl := req.GetDeepLink(); dl != "" {
		payload["deep_link"] = dl
	}
	// Use the batch path so the notification-service can deduplicate
	// quiet-hours checks in a single RPC instead of N round-trips.
	i.sender.SendBatch(ctx, req.GetTargetUserIds(),
		"admin_broadcast", req.GetTitle(), req.GetBody(), payload)
	klog.Infof("notification: admin broadcast title=%q recipients=%d", req.GetTitle(), len(req.GetTargetUserIds()))
	return &v1.AdminBroadcastResponse{Delivered: int32(len(req.GetTargetUserIds()))}, nil
}
