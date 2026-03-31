package event

import (
	"context"
	"sync"
	"time"

	"api/internal/cache"
	"api/internal/model"
	"api/internal/util"

	"github.com/google/uuid"
)

// Config represents event domain service configuration.
type Config struct {
	Repository  Repository
	Storage     Storage
	AvatarCache *cache.TTLCache[string]
}

// Storage handles object storage operations.
//
//go:generate mockery --case underscore --name Storage --output mocks
type Storage interface {
	PresignGetObject(ctx context.Context, key string, opts model.PresignOptions) (string, error)
}

// Service implements event domain logic.
type Service struct {
	repo        Repository
	storage     Storage
	avatarCache *cache.TTLCache[string]
}

// Repository is a data-layer interface for event queries.
//
//go:generate mockery --case underscore --name Repository --with-expecter --output mocks
type Repository interface {
	ListEvents(ctx context.Context, currentUserID uuid.UUID, opts model.ListEventsOptions) (*model.ListEventsResponse, error)
	CreateEvent(ctx context.Context, creatorID uuid.UUID, req model.CreateEventRequest) (*model.Event, error)
	JoinEvent(ctx context.Context, eventID uuid.UUID, userID uuid.UUID) (*model.Event, error)
	LeaveEvent(ctx context.Context, eventID uuid.UUID, userID uuid.UUID) error
	UpdateEvent(ctx context.Context, eventID uuid.UUID, actor *model.User, req model.UpdateEventRequest) (*model.Event, error)
	DeleteEvent(ctx context.Context, eventID uuid.UUID, actor *model.User) error
}

// NewEventService creates new event domain service.
func NewEventService(c Config) *Service {
	return &Service{
		repo:        c.Repository,
		storage:     c.Storage,
		avatarCache: c.AvatarCache,
	}
}

// NewService is an alias for NewEventService for backward compatibility.
var NewService = NewEventService

// GetAvatarURL generates a presigned GET URL for an avatar with caching.
func (s *Service) GetAvatarURL(ctx context.Context, objectKey string) (string, error) {
	if objectKey == "" {
		return "", nil
	}

	// Check cache first
	if s.avatarCache != nil {
		if url, ok := s.avatarCache.Get(objectKey); ok {
			return url, nil
		}
	}

	// Generate new URL if storage is available
	var url string
	var err error
	if s.storage != nil {
		url, err = s.storage.PresignGetObject(ctx, objectKey, model.PresignOptions{Expiry: 24 * time.Hour})
		if err != nil {
			return "", err
		}
	}

	// Update cache
	if s.avatarCache != nil {
		s.avatarCache.Set(objectKey, url, 1*time.Hour)
	}

	return url, nil
}

// EnrichEventsWithAvatarURLs generates presigned URLs for all participant avatars in events.
// Optimized to use batch cache lookup and parallel S3 requests.
func (s *Service) EnrichEventsWithAvatarURLs(ctx context.Context, resp *model.ListEventsResponse) error {
	if resp == nil {
		return nil
	}

	// Collect S3 object keys in a single pass
	s3Keys := make([]string, 0, 32)

	for _, event := range resp.Events {
		if event == nil {
			continue
		}
		for _, participant := range event.Participants {
			if participant == nil {
				continue
			}

			if participant.AvatarURL == "" {
				if participant.TelegramAvatarURL != "" {
					participant.AvatarURL = participant.TelegramAvatarURL
				}
				continue
			}

			if util.IsFullURL(participant.AvatarURL) {
				continue
			}

			s3Keys = append(s3Keys, participant.AvatarURL)
		}
	}

	// Deduplicate keys before cache lookup
	s3Keys = util.UniqueStrings(s3Keys)
	if len(s3Keys) == 0 {
		return nil
	}

	// Batch cache lookup
	cachedURLs := make(map[string]string)
	if s.avatarCache != nil {
		cachedURLs = s.avatarCache.GetMultiple(s3Keys)
	}

	// Identify keys that need S3 fetch
	keysToFetch := s3Keys[:0]
	for _, key := range s3Keys {
		if _, ok := cachedURLs[key]; !ok {
			keysToFetch = append(keysToFetch, key)
		}
	}

	// Parallel S3 requests for missing keys (limited concurrency)
	if len(keysToFetch) > 0 && s.storage != nil {
		type result struct {
			key string
			url string
			err error
		}

		sem := make(chan struct{}, 10)
		var wg sync.WaitGroup
		results := make(chan result, len(keysToFetch))

		for _, key := range keysToFetch {
			wg.Add(1)
			go func(k string) {
				defer wg.Done()

				sem <- struct{}{}
				defer func() { <-sem }()

				url, err := s.storage.PresignGetObject(ctx, k, model.PresignOptions{Expiry: 24 * time.Hour})
				results <- result{key: k, url: url, err: err}
			}(key)
		}

		go func() {
			wg.Wait()
			close(results)
		}()

		for r := range results {
			if r.err == nil && r.url != "" {
				cachedURLs[r.key] = r.url
			}
		}

		if s.avatarCache != nil && len(cachedURLs) > 0 {
			s.avatarCache.SetMultiple(cachedURLs, 1*time.Hour)
		}
	} else if s.avatarCache != nil && len(cachedURLs) > 0 {
		s.avatarCache.SetMultiple(cachedURLs, 1*time.Hour)
	}

	// Apply URLs to participants in a single pass
	for _, event := range resp.Events {
		if event == nil {
			continue
		}
		for _, participant := range event.Participants {
			if participant == nil || participant.AvatarURL == "" || util.IsFullURL(participant.AvatarURL) {
				continue
			}
			if url, ok := cachedURLs[participant.AvatarURL]; ok {
				participant.AvatarURL = url
			}
		}
	}

	return nil
}
