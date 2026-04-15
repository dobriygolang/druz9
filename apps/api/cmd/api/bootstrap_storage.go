package main

import (
	"context"

	"api/internal/clients/geocoder"
	"api/internal/closer"
	arenadata "api/internal/data/arena"
	circledata "api/internal/data/circle"
	codeeditordata "api/internal/data/code_editor"
	eventdata "api/internal/data/event"
	geodata "api/internal/data/geo"
	interviewprepdata "api/internal/data/interviewprep"
	podcastdata "api/internal/data/podcast"
	profiledata "api/internal/data/profile"
	referraldata "api/internal/data/referral"
	solutionreviewdata "api/internal/data/solution_review"
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
	circleRepo         *circledata.Repo
	podcastRepo        *podcastdata.Repo
	referralRepo       referraldomainservice.Repository
	codeEditorRepo     *codeeditordata.Repo
	arenaRepo          *arenadata.Repo
	interviewRepo      *interviewprepdata.Repo
	solutionReviewRepo *solutionreviewdata.Repo
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
		circleRepo:         circledata.NewRepo(store, bootstrap.kratosLogger),
		podcastRepo:        podcastdata.NewRepo(store, bootstrap.kratosLogger),
		referralRepo:       referraldata.NewRepo(store, bootstrap.kratosLogger),
		codeEditorRepo:     codeeditordata.NewRepo(store, bootstrap.kratosLogger),
		arenaRepo:          arenadata.NewRepo(store, bootstrap.kratosLogger),
		interviewRepo:      interviewprepdata.New(store, bootstrap.kratosLogger),
		solutionReviewRepo: solutionreviewdata.NewRepo(store),
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
