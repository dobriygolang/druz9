package livekit

import (
	"context"
	"fmt"
	"strings"
	"time"

	"api/internal/config"
	"api/internal/model"

	kratoserrors "github.com/go-kratos/kratos/v2/errors"
	livekitauth "github.com/livekit/protocol/auth"
)

type Service struct {
	url       string
	publicURL string
	apiKey    string
	apiSecret string
}

func New(cfg *config.LiveKit) *Service {
	if cfg == nil {
		return &Service{}
	}
	return &Service{
		url:       strings.TrimSpace(cfg.URL),
		publicURL: strings.TrimSpace(cfg.PublicURL),
		apiKey:    cfg.APIKey,
		apiSecret: cfg.APISecret,
	}
}

func (s *Service) IssueRoomToken(_ context.Context, room *model.Room, user *model.User) (*model.RoomJoinCredentials, error) {
	if room == nil || user == nil {
		return nil, kratoserrors.BadRequest("INVALID_ROOM_JOIN", "room and user are required")
	}
	if s.url == "" || s.apiKey == "" || s.apiSecret == "" {
		return nil, kratoserrors.New(412, "LIVEKIT_NOT_CONFIGURED", "livekit is not configured")
	}

	name := roomParticipantName(user)
	grant := &livekitauth.VideoGrant{
		RoomJoin: true,
		Room:     livekitRoomName(room),
	}
	grant.SetCanPublish(true)
	grant.SetCanSubscribe(true)
	grant.SetCanPublishData(true)

	token, err := livekitauth.NewAccessToken(s.apiKey, s.apiSecret).
		SetIdentity(user.ID.String()).
		SetName(name).
		SetMetadata(fmt.Sprintf(`{"roomId":"%s","userId":"%s","roomKind":"%s"}`, room.ID.String(), user.ID.String(), room.Kind)).
		SetValidFor(6 * time.Hour).
		SetVideoGrant(grant).
		ToJWT()
	if err != nil {
		return nil, kratoserrors.InternalServer("LIVEKIT_TOKEN_FAILED", "failed to issue livekit token")
	}

	return &model.RoomJoinCredentials{
		AccessToken: token,
		Provider:    "livekit",
		ServerURL:   s.serverURL(),
	}, nil
}

func (s *Service) serverURL() string {
	if s.publicURL != "" {
		return s.publicURL
	}
	return s.url
}

func livekitRoomName(room *model.Room) string {
	return room.ID.String()
}

func roomParticipantName(user *model.User) string {
	if user == nil {
		return "user"
	}
	if user.FirstName != "" || user.LastName != "" {
		return strings.TrimSpace(fmt.Sprintf("%s %s", user.FirstName, user.LastName))
	}
	if user.TelegramUsername != "" {
		return user.TelegramUsername
	}
	return user.ID.String()
}
