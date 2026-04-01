package main

import (
	"context"
	"time"

	"api/internal/cache"
	"api/internal/closer"
	arenadata "api/internal/data/arena"
	codeeditordata "api/internal/data/code_editor"
	eventdata "api/internal/data/event"
	geodata "api/internal/data/geo"
	interviewprepdata "api/internal/data/interviewprep"
	podcastdata "api/internal/data/podcast"
	profiledata "api/internal/data/profile"
	referraldata "api/internal/data/referral"
	referraldomainservice "api/internal/domain/referral"
	"api/internal/storage/postgres"
	s3storage "api/internal/storage/s3"
)

type storageContext struct {
	store          *postgres.Store
	storageClient  *s3storage.Service
	geoClient      *geodata.Client
	avatarURLCache *cache.TTLCache[string]
	profileRepo    *profiledata.Repo
	eventRepo      *eventdata.Repo
	podcastRepo    *podcastdata.Repo
	referralRepo   referraldomainservice.Repository
	codeEditorRepo *codeeditordata.Repo
	arenaRepo      *arenadata.Repo
	interviewRepo  *interviewprepdata.Repo
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
		store:          store,
		storageClient:  storageClient,
		geoClient:      geodata.NewClient(bootstrap.cfg, store, bootstrap.kratosLogger),
		avatarURLCache: cache.NewTTLCache[string](1000, 1*time.Hour),
		profileRepo:    profiledata.NewRepo(store, bootstrap.kratosLogger),
		eventRepo:      eventdata.NewRepo(store, bootstrap.kratosLogger),
		podcastRepo:    podcastdata.NewRepo(store, bootstrap.kratosLogger),
		referralRepo:   referraldata.NewRepo(store, bootstrap.kratosLogger),
		codeEditorRepo: codeeditordata.NewRepo(store, bootstrap.kratosLogger),
		arenaRepo:      arenadata.NewRepo(store, bootstrap.kratosLogger),
		interviewRepo:  interviewprepdata.New(store, bootstrap.kratosLogger),
	}, nil
}
