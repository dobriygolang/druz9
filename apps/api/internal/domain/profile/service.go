package profile

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"fmt"
	"net/http"
	"net/url"
	"sync"
	"time"

	"github.com/google/uuid"

	"api/internal/cache"
	"api/internal/model"
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
	YandexClientID      string
	YandexClientSecret  string
	YandexRedirectURL   string
	DevBypass           bool
	DevUserID           string
	CookieName          string
	SessionTTL          time.Duration
	SessionRefreshAfter time.Duration
	TelegramAuthMaxAge  time.Duration
}

// Service implements profile domain logic.
type Service struct {
	repo          Repository
	sessions      SessionStorage
	settings      Settings
	auth          *telegramAuthChallenges
	yandexAuth    *yandexAuthStates
	httpClient    *http.Client
	activityCache *cache.TTLCache[time.Time]
	profileCache  *cache.TTLCache[*model.User]
	sessionCache  *cache.TTLCache[*model.Session]
}

type telegramAuthChallenges struct {
	mu      sync.Mutex
	byToken map[string]*telegramAuthChallengeState
	byCode  map[string]*telegramAuthChallengeState
}

type telegramAuthChallengeState struct {
	payload   model.TelegramAuthPayload
	expiresAt time.Time
	confirmed bool
	loginCode string
}

type yandexAuthStates struct {
	mu      sync.Mutex
	byState map[string]time.Time
}

// Repository is a data-layer interface for profile queries.
//
//go:generate mockery --case underscore --name Repository --with-expecter --output mocks
type Repository interface {
	UpsertUserByIdentity(ctx context.Context, payload model.IdentityAuthPayload) (*model.User, error)
	FindUserByProviderIdentity(ctx context.Context, provider model.AuthProvider, providerUserID string) (*model.User, error)
	FindUserByID(ctx context.Context, userID uuid.UUID) (*model.User, error)
	UpdateProfile(ctx context.Context, userID uuid.UUID, currentWorkplace string) (*model.User, error)
	CompleteRegistration(ctx context.Context, userID uuid.UUID, req model.CompleteRegistrationRequest) (*model.User, error)
	UpdateLocation(ctx context.Context, userID uuid.UUID, req model.CompleteRegistrationRequest) (*model.User, error)
	BindIdentity(ctx context.Context, userID uuid.UUID, payload model.IdentityAuthPayload) (*model.User, error)
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
			byCode:  make(map[string]*telegramAuthChallengeState),
		},
		yandexAuth: &yandexAuthStates{
			byState: make(map[string]time.Time),
		},
		httpClient:    &http.Client{Timeout: 10 * time.Second},
		activityCache: cache.NewTTLCache[time.Time](10000, 15*time.Minute),
		profileCache:  cache.NewTTLCache[*model.User](1000, 5*time.Minute),
		sessionCache:  cache.NewTTLCache[*model.Session](5000, 30*time.Minute),
	}
}

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
	if token == "" {
		return "https://t.me/" + url.PathEscape(s.settings.BotUsername)
	}
	return fmt.Sprintf("https://t.me/%s?start=%s", url.PathEscape(s.settings.BotUsername), url.QueryEscape(token))
}

// SetUserActivity updates user activity timestamp in cache.
func (s *Service) SetUserActivity(userID uuid.UUID, at time.Time) {
	s.activityCache.Set(userID.String(), at)
}

// GetUserActivity returns user activity timestamp from cache.
func (s *Service) GetUserActivity(userID uuid.UUID) (time.Time, bool) {
	return s.activityCache.Get(userID.String())
}

// ActivityCache returns the activity cache for sharing with other services.
func (s *Service) ActivityCache() *cache.TTLCache[time.Time] {
	return s.activityCache
}

// InvalidateProfileCache removes user profile from cache.
func (s *Service) InvalidateProfileCache(userID uuid.UUID) {
	s.profileCache.Delete(userID.String())
}

// CacheProfile caches user profile.
func (s *Service) CacheProfile(userID uuid.UUID, user *model.User) {
	s.profileCache.Set(userID.String(), user)
}

// GetCachedProfile returns cached user profile.
func (s *Service) GetCachedProfile(userID uuid.UUID) (*model.User, bool) {
	return s.profileCache.Get(userID.String())
}

// CacheSession caches user session.
func (s *Service) CacheSession(sessionID uuid.UUID, session *model.Session) {
	s.sessionCache.Set(sessionID.String(), session)
}

// GetCachedSession returns cached user session.
func (s *Service) GetCachedSession(sessionID uuid.UUID) (*model.Session, bool) {
	return s.sessionCache.Get(sessionID.String())
}

// InvalidateSession removes session from cache.
func (s *Service) InvalidateSession(sessionID uuid.UUID) {
	s.sessionCache.Delete(sessionID.String())
}
