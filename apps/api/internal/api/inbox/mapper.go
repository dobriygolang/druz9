package inbox

import (
	"google.golang.org/protobuf/types/known/timestamppb"

	"api/internal/model"
	v1 "api/pkg/api/inbox/v1"
)

func mapThread(t *model.InboxThread) *v1.InboxThread {
	if t == nil {
		return nil
	}
	externalID := ""
	if t.ExternalID != nil {
		externalID = t.ExternalID.String()
	}
	return &v1.InboxThread{
		Id:            t.ID.String(),
		Kind:          v1.ThreadKind(t.Kind),
		Subject:       t.Subject,
		Avatar:        t.Avatar,
		Preview:       t.Preview,
		UnreadCount:   t.UnreadCount,
		LastMessageAt: timestamppb.New(t.LastMessageAt),
		ExternalId:    externalID,
		Interactive:   t.Interactive,
	}
}

func mapMessage(m *model.InboxMessage) *v1.InboxMessage {
	if m == nil {
		return nil
	}
	senderID := ""
	if m.SenderID != nil {
		senderID = m.SenderID.String()
	}
	return &v1.InboxMessage{
		Id:         m.ID.String(),
		ThreadId:   m.ThreadID.String(),
		SenderKind: v1.SenderKind(m.SenderKind),
		SenderId:   senderID,
		SenderName: m.SenderName,
		Body:       m.Body,
		Read:       m.Read,
		CreatedAt:  timestamppb.New(m.CreatedAt),
	}
}
