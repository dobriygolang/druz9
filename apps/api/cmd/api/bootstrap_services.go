package main

import (
	"api/internal/aireview"
	adminservice "api/internal/api/admin"
	arenaservice "api/internal/api/arena"
	codeeditorservice "api/internal/api/code_editor"
	eventservice "api/internal/api/event"
	geoservice "api/internal/api/geo"
	podcastservice "api/internal/api/podcast"
	profileservice "api/internal/api/profile"
	referralservice "api/internal/api/referral"
	apparenа "api/internal/app/arena"
	appcodeeditor "api/internal/app/codeeditor"
	appinterviewprep "api/internal/app/interviewprep"
	admindomainservice "api/internal/domain/admin"
	eventdomainservice "api/internal/domain/event"
	geodomainservice "api/internal/domain/geo"
	podcastdomainservice "api/internal/domain/podcast"
	profiledomainservice "api/internal/domain/profile"
	referraldomainservice "api/internal/domain/referral"
	"api/internal/realtime"
	"api/internal/sandbox"
	server "api/internal/server"
)

type serviceContext struct {
	cookies                 *server.SessionCookieManager
	profileServiceDomain    *profiledomainservice.Service
	adminServiceDomain      *admindomainservice.Service
	geoServiceDomain        *geodomainservice.Service
	eventServiceDomain      *eventdomainservice.Service
	podcastServiceDomain    *podcastdomainservice.Service
	referralServiceDomain   *referraldomainservice.Service
	codeEditorServiceDomain *appcodeeditor.Service
	arenaServiceDomain      *apparenа.Service
	interviewPrepDomain     *appinterviewprep.Service
	realtimeHub             *realtime.CodeEditorHub
	arenaRealtimeHub        *realtime.ArenaHub
	adminService            *adminservice.Implementation
	profileService          *profileservice.Implementation
	geoService              *geoservice.Implementation
	eventService            *eventservice.Implementation
	podcastService          *podcastservice.Implementation
	referralService         *referralservice.Implementation
	codeEditorService       *codeeditorservice.Implementation
	arenaService            *arenaservice.Implementation
}

func initializeServices(bootstrap *bootstrapContext, storage *storageContext) (*serviceContext, error) {
	realtimeHub := realtime.NewCodeEditorHub(storage.codeEditorRepo)
	sandboxService := sandbox.New()
	aiReviewService := aireview.New(aireview.Config{
		Provider: bootstrap.cfg.External.AIReview.Provider,
		BaseURL:  bootstrap.cfg.External.AIReview.BaseURL,
		APIKey:   bootstrap.cfg.External.AIReview.APIKey,
		Model:    bootstrap.cfg.External.AIReview.Model,
		Timeout:  bootstrap.cfg.External.AIReview.Timeout,
	})

	profileServiceDomain := profiledomainservice.NewProfileService(profiledomainservice.Config{
		Repository:     storage.profileRepo,
		SessionStorage: storage.profileRepo,
		Settings: profiledomainservice.Settings{
			BotToken:            bootstrap.cfg.External.Telegram.BotToken,
			BotUsername:         bootstrap.cfg.External.Telegram.BotUsername,
			YandexClientID:      bootstrap.cfg.External.Yandex.ClientID,
			YandexClientSecret:  bootstrap.cfg.External.Yandex.ClientSecret,
			YandexRedirectURL:   bootstrap.cfg.External.Yandex.RedirectURL,
			DevBypass:           bootstrap.cfg.Dev.AuthBypass,
			DevUserID:           bootstrap.cfg.Dev.DevUserID,
			CookieName:          bootstrap.cfg.Auth.Session.CookieName,
			SessionTTL:          bootstrap.cfg.Auth.Session.TTL,
			SessionRefreshAfter: bootstrap.cfg.Auth.Session.RefreshAfter,
			TelegramAuthMaxAge:  bootstrap.cfg.Auth.Session.TelegramAuthMaxAge,
		},
	})
	adminServiceDomain := admindomainservice.NewService(admindomainservice.Config{
		ProfileRepository: storage.profileRepo,
	})
	geoServiceDomain := geodomainservice.NewGeoService(geodomainservice.Config{
		Resolver:      storage.geoClient,
		ActivityCache: profileServiceDomain.ActivityCache(),
	})
	eventServiceDomain := eventdomainservice.NewService(eventdomainservice.Config{
		Repository: storage.eventRepo,
	})
	podcastServiceDomain := podcastdomainservice.NewPodcastService(podcastdomainservice.Config{
		Repository: storage.podcastRepo,
		Storage:    storage.storageClient,
	})
	referralServiceDomain := referraldomainservice.NewReferralService(referraldomainservice.Config{
		Repository: storage.referralRepo,
	})
	codeEditorServiceDomain := appcodeeditor.New(appcodeeditor.Config{
		Repository: storage.codeEditorRepo,
		Sandbox:    sandboxService,
	})
	arenaServiceDomain := apparenа.New(apparenа.Config{
		Repository: storage.arenaRepo,
		Sandbox:    sandboxService,
		AllowGuestAccess: func() bool {
			return bootstrap.cfg.Arena != nil && !bootstrap.cfg.Arena.RequireAuth
		},
		AntiCheatEnabled: func() bool {
			return true
		},
	})
	interviewPrepDomain := appinterviewprep.New(appinterviewprep.Config{
		Repository:        storage.interviewRepo,
		Sandbox:           sandboxService,
		Reviewer:          aiReviewService,
		MaxImageBytes:     bootstrap.cfg.External.AIReview.MaxImageBytes,
		ModelCode:         bootstrap.cfg.External.AIReview.ModelCode,
		ModelArchitecture: bootstrap.cfg.External.AIReview.ModelArchitecture,
		ModelFollowup:     bootstrap.cfg.External.AIReview.ModelFollowup,
		ModelSystemDesign: bootstrap.cfg.External.AIReview.ModelSystemDesign,
	})
	arenaRealtimeHub := realtime.NewArenaHub(arenaServiceDomain)

	cookies := server.NewSessionCookieManager(bootstrap.cfg.Auth.Session)

	return &serviceContext{
		cookies:                 cookies,
		profileServiceDomain:    profileServiceDomain,
		adminServiceDomain:      adminServiceDomain,
		geoServiceDomain:        geoServiceDomain,
		eventServiceDomain:      eventServiceDomain,
		podcastServiceDomain:    podcastServiceDomain,
		referralServiceDomain:   referralServiceDomain,
		codeEditorServiceDomain: codeEditorServiceDomain,
		arenaServiceDomain:      arenaServiceDomain,
		interviewPrepDomain:     interviewPrepDomain,
		realtimeHub:             realtimeHub,
		arenaRealtimeHub:        arenaRealtimeHub,
		adminService:            adminservice.New(adminServiceDomain),
		profileService:          profileservice.New(profileServiceDomain, cookies),
		geoService:              geoservice.New(geoServiceDomain),
		eventService:            eventservice.New(eventServiceDomain),
		podcastService:          podcastservice.New(podcastServiceDomain),
		referralService:         referralservice.New(referralServiceDomain),
		codeEditorService:       codeeditorservice.New(codeEditorServiceDomain, realtimeHub),
		arenaService: arenaservice.New(arenaServiceDomain, arenaRealtimeHub, func() bool {
			return bootstrap.cfg.Arena != nil && !bootstrap.cfg.Arena.RequireAuth
		}),
	}, nil
}
