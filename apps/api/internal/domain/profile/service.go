package profile

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"fmt"
	"net/url"
	"sync"
	"time"

	"api/internal/model"

	"github.com/google/uuid"
)

// Config represents profile domain service configuration.
type Config struct {
	Repository     Repository
	SessionStorage SessionStorage
	Settings       Settings
}

// Settings holds profile service settings.
type Settings struct {
	BotToken            string
	BotUsername         string
	DevBypass           bool
	DevUserID           string
	CookieName          string
	SessionTTL          time.Duration
	SessionRefreshAfter time.Duration
	TelegramAuthMaxAge  time.Duration
}

// Service implements profile domain logic.
type Service struct {
	repo     Repository
	sessions SessionStorage
	settings Settings
	auth     *telegramAuthChallenges
}

type telegramAuthChallenges struct {
	mu      sync.Mutex
	byToken map[string]*telegramAuthChallengeState
}

type telegramAuthChallengeState struct {
	payload   model.TelegramAuthPayload
	expiresAt time.Time
	confirmed bool
}

// Repository is a data-layer interface for profile queries.
//
//go:generate mockery --case underscore --name Repository --with-expecter --output mocks
type Repository interface {
	UpsertTelegramUser(ctx context.Context, payload model.TelegramAuthPayload) (*model.User, error)
	FindUserByID(ctx context.Context, userID uuid.UUID) (*model.User, error)
	UpdateProfile(ctx context.Context, userID uuid.UUID, name string) (*model.User, error)
	CompleteRegistration(ctx context.Context, userID uuid.UUID, req model.CompleteRegistrationRequest) (*model.User, error)
	UpdateLocation(ctx context.Context, userID uuid.UUID, req model.CompleteRegistrationRequest) (*model.User, error)
}

// SessionStorage handles session management.
//
//go:generate mockery --case underscore --name SessionStorage --with-expecter --output mocks
type SessionStorage interface {
	CreateSession(ctx context.Context, session *model.Session) error
	ReplaceSession(ctx context.Context, hash string, session *model.Session) error
	DeleteSessionByHash(ctx context.Context, hash string) error
	FindSessionByHash(ctx context.Context, hash string) (*model.AuthState, error)
	TouchSession(ctx context.Context, userID uuid.UUID, sessionID uuid.UUID, expiresAt time.Time, lastActive time.Time) error
}

// NewProfileService creates new profile domain service.
func NewProfileService(c Config) *Service {
	return &Service{
		repo:     c.Repository,
		sessions: c.SessionStorage,
		settings: c.Settings,
		auth: &telegramAuthChallenges{
			byToken: make(map[string]*telegramAuthChallengeState),
		},
	}
}

// NewService is an alias for NewProfileService for backward compatibility.
var NewService = NewProfileService

// CookieName returns the cookie name for sessions.
func (s *Service) CookieName() string {
	return s.settings.CookieName
}

// DevBypass returns whether dev bypass is enabled.
func (s *Service) DevBypass() bool {
	return s.settings.DevBypass
}

// DevUserID returns the dev user ID for bypass mode.
func (s *Service) DevUserID() string {
	return s.settings.DevUserID
}

// BotToken returns the Telegram bot token.
func (s *Service) BotToken() string {
	return s.settings.BotToken
}

// TelegramAuthMaxAge returns max age for Telegram auth.
func (s *Service) TelegramAuthMaxAge() time.Duration {
	return s.settings.TelegramAuthMaxAge
}

// SessionTTL returns session time-to-live duration.
func (s *Service) SessionTTL() time.Duration {
	return s.settings.SessionTTL
}

// Now returns current time in UTC.
func (s *Service) Now() time.Time {
	return time.Now().UTC()
}

func generateSessionToken() (string, string, error) {
	tokenBytes := make([]byte, 32)
	if _, err := rand.Read(tokenBytes); err != nil {
		return "", "", err
	}

	rawToken := base64.RawURLEncoding.EncodeToString(tokenBytes)
	return rawToken, hashToken(rawToken), nil
}

func hashToken(rawToken string) string {
	sum := sha256.Sum256([]byte(rawToken))
	return hex.EncodeToString(sum[:])
}

// BotUsername returns the Telegram bot username.
func (s *Service) BotUsername() string {
	return s.settings.BotUsername
}

func (s *Service) buildBotStartURL(token string) string {
	if s.settings.BotUsername == "" {
		return ""
	}
	return fmt.Sprintf("https://t.me/%s?start=%s", url.PathEscape(s.settings.BotUsername), url.QueryEscape(token))
}
