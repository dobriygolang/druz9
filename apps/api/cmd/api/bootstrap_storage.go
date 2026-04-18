package main

import (
	"context"
	"fmt"

	"github.com/google/uuid"

	"api/internal/clients/geocoder"
	"api/internal/closer"
	arenadata "api/internal/data/arena"
	challengedata "api/internal/data/challenge"
	guilddata "api/internal/data/guild"
	codeeditordata "api/internal/data/code_editor"
	duelreplaydata "api/internal/data/duel_replay"
	eventdata "api/internal/data/event"
	friendchallengedata "api/internal/data/friend_challenge"
	geodata "api/internal/data/geo"
	inboxdata "api/internal/data/inbox"
	interviewprepdata "api/internal/data/interviewprep"
	missiondata "api/internal/data/mission"
	podcastdata "api/internal/data/podcast"
	profiledata "api/internal/data/profile"
	referraldata "api/internal/data/referral"
	seasonpassdata "api/internal/data/season_pass"
	shopdata "api/internal/data/shop"
	socialdata "api/internal/data/social"
	solutionreviewdata "api/internal/data/solution_review"
	streakdata "api/internal/data/streak"
	walletdata "api/internal/data/wallet"
	geodomain "api/internal/domain/geo"
	referraldomainservice "api/internal/domain/referral"
	"api/internal/model"
	"api/internal/storage/postgres"
	s3storage "api/internal/storage/s3"
)

type storageContext struct {
	store              *postgres.Store
	storageClient      *s3storage.Service
	geoResolver        geodomain.Resolver
	profileRepo        *profiledata.Repo
	eventRepo          *eventdata.Repo
	guildRepo         *guilddata.Repo
	podcastRepo        *podcastdata.Repo
	referralRepo       referraldomainservice.Repository
	codeEditorRepo     *codeeditordata.Repo
	arenaRepo          *arenadata.Repo
	interviewRepo      *interviewprepdata.Repo
	solutionReviewRepo *solutionreviewdata.Repo
	missionRepo        *missiondata.Repo
	challengeRepo      *challengedata.Repo
	inboxRepo          *inboxdata.Repo
	friendChallengeRepo *friendchallengedata.Repo
	friendChallengeUsers *friendchallengedata.UserLookupAdapter
	duelReplayRepo     *duelreplaydata.Repo
	seasonPassRepo     *seasonpassdata.Repo
	streakRepo         *streakdata.Repo
	streakStats        *streakdata.StatsAdapter
	shopRepo           *shopdata.Repo
	socialRepo         *socialdata.Repo
	socialUsers        *socialdata.UserLookupAdapter
	walletRepo         *walletdata.Repo
}

func initializeStorage(bootstrap *bootstrapContext) (*storageContext, error) {
	poolCfg := postgres.DefaultPoolConfig()
	if bootstrap.cfg.Data.Pool != nil {
		if bootstrap.cfg.Data.Pool.MinConns > 0 {
			poolCfg.MinConns = bootstrap.cfg.Data.Pool.MinConns
		}
		if bootstrap.cfg.Data.Pool.MaxConns > 0 {
			poolCfg.MaxConns = bootstrap.cfg.Data.Pool.MaxConns
		}
		if bootstrap.cfg.Data.Pool.MaxConnLifetime > 0 {
			poolCfg.MaxConnLifetime = bootstrap.cfg.Data.Pool.MaxConnLifetime
		}
		if bootstrap.cfg.Data.Pool.MaxConnIdleTime > 0 {
			poolCfg.MaxConnIdleTime = bootstrap.cfg.Data.Pool.MaxConnIdleTime
		}
		if bootstrap.cfg.Data.Pool.HealthCheckPeriod > 0 {
			poolCfg.HealthCheckPeriod = bootstrap.cfg.Data.Pool.HealthCheckPeriod
		}
	}

	store, cleanup, err := postgres.New(bootstrap.cfg.Data, poolCfg)
	if err != nil {
		return nil, err
	}
	closer.AddSync(func() error {
		cleanup()
		return nil
	})

	storageClient, err := s3storage.New(bootstrap.cfg.External.S3)
	if err != nil {
		return nil, err
	}
	if err := storageClient.EnsureBucket(context.Background()); err != nil {
		return nil, err
	}

	return &storageContext{
		store:              store,
		storageClient:      storageClient,
		geoResolver:        newGeoResolver(geocoder.New(bootstrap.cfg, bootstrap.kratosLogger), geodata.NewRepo(store)),
		profileRepo:        profiledata.NewRepo(store, bootstrap.kratosLogger),
		eventRepo:          eventdata.NewRepo(store, bootstrap.kratosLogger),
		guildRepo:         guilddata.NewRepo(store, bootstrap.kratosLogger),
		podcastRepo:        podcastdata.NewRepo(store, bootstrap.kratosLogger),
		referralRepo:       referraldata.NewRepo(store, bootstrap.kratosLogger),
		codeEditorRepo:     codeeditordata.NewRepo(store, bootstrap.kratosLogger),
		arenaRepo:          arenadata.NewRepo(store, bootstrap.kratosLogger),
		interviewRepo:      interviewprepdata.New(store, bootstrap.kratosLogger),
		solutionReviewRepo: solutionreviewdata.NewRepo(store),
		missionRepo:        missiondata.NewRepo(store, bootstrap.kratosLogger),
		challengeRepo:      challengedata.NewRepo(store, bootstrap.kratosLogger),
		inboxRepo:          inboxdata.NewRepo(store, bootstrap.kratosLogger),
		friendChallengeRepo: friendchallengedata.NewRepo(store, bootstrap.kratosLogger),
		friendChallengeUsers: friendchallengedata.NewUserLookupAdapter(profiledata.NewRepo(store, bootstrap.kratosLogger)),
		duelReplayRepo:     duelreplaydata.NewRepo(store, bootstrap.kratosLogger),
		seasonPassRepo:     seasonpassdata.NewRepo(store, bootstrap.kratosLogger),
		streakRepo:         streakdata.NewRepo(store, bootstrap.kratosLogger),
		streakStats:        streakdata.NewStatsAdapter(profiledata.NewRepo(store, bootstrap.kratosLogger)),
		shopRepo:           shopdata.NewRepo(store, bootstrap.kratosLogger),
		socialRepo:         socialdata.NewRepo(store, bootstrap.kratosLogger),
		socialUsers: socialdata.NewUserLookupAdapter(func(ctx context.Context, username string) (uuid.UUID, string, error) {
			pr := profiledata.NewRepo(store, bootstrap.kratosLogger)
			u, err := pr.FindUserByUsername(ctx, username)
			if err != nil {
				return uuid.Nil, "", err
			}
			if u == nil {
				return uuid.Nil, "", fmt.Errorf("user %q not found", username)
			}
			return u.ID, u.Username, nil
		}),
		walletRepo: walletdata.NewRepo(store, bootstrap.kratosLogger),
	}, nil
}

type geoResolver struct {
	geocoder *geocoder.Client
	repo     *geodata.Repo
}

func newGeoResolver(geocoderClient *geocoder.Client, repo *geodata.Repo) geodomain.Resolver {
	return &geoResolver{geocoder: geocoderClient, repo: repo}
}

func (r *geoResolver) Resolve(ctx context.Context, query string, limit int) ([]*model.GeoCandidate, error) {
	return r.geocoder.Resolve(ctx, query, limit)
}

func (r *geoResolver) ListCommunityPoints(ctx context.Context, currentUserID string) ([]*model.CommunityMapPoint, error) {
	return r.repo.ListCommunityPoints(ctx, currentUserID)
}

func (r *geoResolver) ListWorldPins(ctx context.Context) ([]*model.WorldPin, error) {
	return r.repo.ListWorldPins(ctx)
}
