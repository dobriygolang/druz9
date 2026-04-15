package service

import (
	"context"
	"encoding/json"

	"notification-service/internal/data"

	"github.com/google/uuid"
	klog "github.com/go-kratos/kratos/v2/log"
)

// Send enqueues a single notification for delivery.
func (s *Service) Send(ctx context.Context, userID uuid.UUID, kind, title, body string, payload json.RawMessage, scheduledAt *string) (uuid.UUID, error) {
	n := &data.Notification{
		ID:      uuid.New(),
		UserID:  userID,
		Kind:    kind,
		Channel: "telegram",
		Title:   title,
		Body:    body,
		Payload: payload,
	}

	if err := s.repo.InsertNotification(ctx, n); err != nil {
		return uuid.Nil, err
	}

	klog.Infof("notification enqueued: id=%s user=%s kind=%s", n.ID, userID, kind)
	return n.ID, nil
}

// SendBatch enqueues notifications for multiple users (e.g. circle fan-out).
func (s *Service) SendBatch(ctx context.Context, userIDs []uuid.UUID, kind, title, body string, payload json.RawMessage) (int, error) {
	if len(userIDs) == 0 {
		return 0, nil
	}

	notifications := make([]*data.Notification, 0, len(userIDs))
	for _, uid := range userIDs {
		notifications = append(notifications, &data.Notification{
			ID:      uuid.New(),
			UserID:  uid,
			Kind:    kind,
			Channel: "telegram",
			Title:   title,
			Body:    body,
			Payload: payload,
		})
	}

	count, err := s.repo.InsertBatch(ctx, notifications)
	if err != nil {
		return count, err
	}

	klog.Infof("notification batch enqueued: count=%d kind=%s", count, kind)
	return count, nil
}
