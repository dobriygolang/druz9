package telegrambot

import (
	"context"
	"net/http"
	"strings"
	"time"

	notif "api/internal/clients/notification"
	profiledomain "api/internal/domain/profile"

	klog "github.com/go-kratos/kratos/v2/log"
)

const telegramAPIBase = "https://api.telegram.org"

type Service struct {
	client  *http.Client
	token   string
	profile *profiledomain.Service
	notif   notif.Sender
}

func New(token string, profile *profiledomain.Service, n notif.Sender) *Service {
	return &Service{
		client:  &http.Client{Timeout: 70 * time.Second},
		token:   strings.TrimSpace(token),
		profile: profile,
		notif:   n,
	}
}

func (s *Service) Enabled() bool {
	return s != nil && s.token != "" && s.profile != nil
}

func (s *Service) Run(ctx context.Context) error {
	if !s.Enabled() {
		return nil
	}
	if err := s.deleteWebhook(ctx); err != nil {
		klog.Errorf("telegram bot deleteWebhook error: %v", err)
	}

	var offset int64
	for {
		select {
		case <-ctx.Done():
			return nil
		default:
		}

		updates, err := s.getUpdates(ctx, offset)
		if err != nil {
			if ctx.Err() != nil {
				return nil
			}
			klog.Errorf("telegram bot getUpdates error: %v", err)
			select {
			case <-ctx.Done():
				return nil
			case <-time.After(3 * time.Second):
				continue
			}
		}

		for _, update := range updates {
			offset = update.UpdateID + 1
			s.handleUpdate(ctx, update)
		}
	}
}
