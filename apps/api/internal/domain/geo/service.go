package geo

import (
	"context"
	"sync"
	"time"

	"api/internal/cache"
	"api/internal/model"
	"api/internal/util"
)

// Config represents geo domain service configuration.
type Config struct {
	Resolver      Resolver
	Storage       Storage
	AvatarCache   *cache.TTLCache[string]
	ActivityCache *cache.TTLCache[time.Time]
}

// Resolver is a data-layer interface for geo queries.
//
//go:generate mockery --case underscore --name Resolver --with-expecter --output mocks
type Resolver interface {
	Resolve(ctx context.Context, query string, limit int) ([]*model.GeoCandidate, error)
	ListCommunityPoints(
		ctx context.Context,
		currentUserID string,
	) ([]*model.CommunityMapPoint, error)
}

// Storage handles object storage operations.
//
//go:generate mockery --case underscore --name Storage --output mocks
type Storage interface {
	PresignGetObject(ctx context.Context, key string, opts model.PresignOptions) (string, error)
}

// Service implements geo domain logic.
type Service struct {
	resolver       Resolver
	storage        Storage
	avatarCache    *cache.TTLCache[string]
	activityCache  *cache.TTLCache[time.Time]
	communityCache *cache.TTLCache[[]*model.CommunityMapPoint]
	communityMu    sync.RWMutex
}

// NewService creates new geo domain service.
func NewService(c Config) *Service {
	return &Service{
		resolver:       c.Resolver,
		storage:        c.Storage,
		avatarCache:    c.AvatarCache,
		activityCache:  c.ActivityCache,
		communityCache: cache.NewTTLCache[[]*model.CommunityMapPoint](5, 1*time.Minute),
	}
}

// NewGeoService is an alias for NewService for backward compatibility.
var NewGeoService = NewService

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

// EnrichCommunityMapWithAvatarURLs generates presigned URLs for all point avatars.
// Optimized to use batch cache lookup and parallel S3 requests.
func (s *Service) EnrichCommunityMapWithAvatarURLs(ctx context.Context, response *model.CommunityMapResponse) error {
	if response == nil {
		return nil
	}

	// Collect S3 object keys in a single pass
	s3Keys := make([]string, 0, len(response.Points))

	for _, point := range response.Points {
		if point == nil {
			continue
		}

		if point.AvatarURL == "" {
			continue
		}

		if util.IsFullURL(point.AvatarURL) {
			continue
		}

		s3Keys = append(s3Keys, point.AvatarURL)
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

	// Apply URLs to points in a single pass
	for _, point := range response.Points {
		if point == nil || point.AvatarURL == "" || util.IsFullURL(point.AvatarURL) {
			continue
		}
		if url, ok := cachedURLs[point.AvatarURL]; ok {
			point.AvatarURL = url
		}
	}

	return nil
}
