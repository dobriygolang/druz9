package main

import (
	"context"
	"fmt"
	"strings"

	"api/internal/aireview"
	adminservice "api/internal/api/admin"
	arenaservice "api/internal/api/arena"
	challengeservice "api/internal/api/challenge"
	codeeditorservice "api/internal/api/code_editor"
	duelreplayservice "api/internal/api/duel_replay"
	eventservice "api/internal/api/event"
	friendchallengeservice "api/internal/api/friend_challenge"
	geoservice "api/internal/api/geo"
	guildservice "api/internal/api/guild"
	hubservice "api/internal/api/hub"
	inboxservice "api/internal/api/inbox"
	insightsservice "api/internal/api/insights"
	interviewprepservice "api/internal/api/interview_prep"
	missionservice "api/internal/api/mission"
	notificationservice "api/internal/api/notification"
	peermockservice "api/internal/api/peer_mock"
	podcastservice "api/internal/api/podcast"
	premiumapi "api/internal/api/premium"
	profileservice "api/internal/api/profile"
	referralservice "api/internal/api/referral"
	sceneservice "api/internal/api/scene"
	seasonpassservice "api/internal/api/season_pass"
	shopservice "api/internal/api/shop"
	skillsservice "api/internal/api/skills"
	socialservice "api/internal/api/social"
	streakservice "api/internal/api/streak"
	trainingservice "api/internal/api/training"
	apparena "api/internal/app/arena"
	appcodeeditor "api/internal/app/codeeditor"
	insightsapp "api/internal/app/insights"
	appinterviewprep "api/internal/app/interviewprep"
	"api/internal/app/solutionreview"
	"api/internal/boosty"
	"api/internal/clients/notification"
	"api/internal/closer"
	admindomainservice "api/internal/domain/admin"
	challengedomainservice "api/internal/domain/challenge"
	duelreplaydomain "api/internal/domain/duel_replay"
	eventdomainservice "api/internal/domain/event"
	friendchallengedomain "api/internal/domain/friend_challenge"
	geodomainservice "api/internal/domain/geo"
	guilddomainservice "api/internal/domain/guild"
	inboxdomainservice "api/internal/domain/inbox"
	missiondomainservice "api/internal/domain/mission"
	podcastdomainservice "api/internal/domain/podcast"
	profiledomainservice "api/internal/domain/profile"
	referraldomainservice "api/internal/domain/referral"
	seasonpassdomain "api/internal/domain/season_pass"
	shopdomain "api/internal/domain/shop"
	socialdomain "api/internal/domain/social"
	streakdomain "api/internal/domain/streak"
	walletdomain "api/internal/domain/wallet"
	arenart "api/internal/realtime/arena"
	codeeditorrt "api/internal/realtime/codeeditor"
	guildwarrt "api/internal/realtime/guildwar"
	"api/internal/sandbox"
	server "api/internal/server"
)

// serviceContext holds only the services that are accessed from outside
// initializeServices (transport registration, background workers, HTTP routes).
// Intermediate domain services used solely to wire up handlers stay as local
// variables inside initializeServices.
type serviceContext struct {
	cookies                 *server.SessionCookieManager
	notificationSender      notification.Sender
	profileServiceDomain    *profiledomainservice.Service
	codeEditorServiceDomain *appcodeeditor.Service
	arenaServiceDomain      *apparena.Service
	friendChallengeDomain   *friendchallengedomain.Service
	realtimeHub             *codeeditorrt.Hub
	arenaRealtimeHub        *arenart.Hub
	guildWarHub             *guildwarrt.Hub

	aiReviewer aireview.Reviewer

	adminService           *adminservice.Implementation
	profileService         *profileservice.Implementation
	geoService             *geoservice.Implementation
	hubService             *hubservice.Implementation
	guildService           *guildservice.Implementation
	eventService           *eventservice.Implementation
	podcastService         *podcastservice.Implementation
	referralService        *referralservice.Implementation
	skillsService          *skillsservice.Implementation
	trainingService        *trainingservice.Implementation
	codeEditorService      *codeeditorservice.Implementation
	arenaService           *arenaservice.Implementation
	interviewPrepService   *interviewprepservice.Implementation
	missionService         *missionservice.Implementation
	notificationSettings   *notificationservice.SettingsImplementation
	challengeService       *challengeservice.Implementation
	inboxService           *inboxservice.Implementation
	friendChallengeService *friendchallengeservice.Implementation
	duelReplayService      *duelreplayservice.Implementation
	seasonPassService      *seasonpassservice.Implementation
	streakService          *streakservice.Implementation
	shopService            *shopservice.Implementation
	sceneService           *sceneservice.Implementation
	insightsService        *insightsservice.Implementation
	socialService          *socialservice.Implementation
	peerMockService        *peermockservice.Implementation
	aiMentorService        *adminservice.AIMentorImpl
	premiumHandler         *premiumapi.Handler
}

func initializeServices(bootstrap *bootstrapContext, storage *storageContext) (*serviceContext, error) {
	var sandboxService interface {
		Execute(ctx context.Context, req sandbox.ExecutionRequest) (sandbox.ExecutionResult, error)
	}
	if bootstrap.cfg.Sandbox != nil && strings.EqualFold(strings.TrimSpace(bootstrap.cfg.Sandbox.Mode), "remote") {
		sandboxService = sandbox.NewRemote(sandbox.RemoteConfig{
			BaseURL: bootstrap.cfg.Sandbox.RunnerURL,
			Timeout: bootstrap.cfg.Sandbox.Timeout,
		})
	} else {
		sandboxService = sandbox.New()
	}

	// ADR-001 — Optional symmetric-key vault for ai_mentor_secrets. Nil
	// when AI_MENTOR_KEY_KMS isn't set (dev mode); production must set it.
	mentorKeyVault, vaultErr := aireview.NewKeyVaultFromEnv()
	if vaultErr != nil {
		return nil, fmt.Errorf("init mentor key vault: %w", vaultErr)
	}

	aiReviewService := aireview.New(aireview.Config{
		Provider: bootstrap.cfg.External.AIReview.Provider,
		BaseURL:  bootstrap.cfg.External.AIReview.BaseURL,
		APIKey:   bootstrap.cfg.External.AIReview.APIKey,
		Model:    bootstrap.cfg.External.AIReview.Model,
		Timeout:  bootstrap.cfg.External.AIReview.Timeout,
	})
	codeReviewService := aireview.NewCodeReviewer(aireview.Config{
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
	geoServiceDomain := geodomainservice.NewService(geodomainservice.Config{
		Resolver:      storage.geoResolver,
		ActivityCache: profileServiceDomain.ActivityCache(),
	})
	guildServiceDomain := guilddomainservice.NewService(guilddomainservice.Config{
		Repository: storage.guildRepo,
	})
	eventServiceDomain := eventdomainservice.NewEventService(eventdomainservice.Config{
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
	realtimeHub := codeeditorrt.NewHub(codeEditorServiceDomain, bootstrap.cfg.Server.AllowedOrigins)
	closer.AddSync(func() error { realtimeHub.Stop(); return nil })

	// Wallet + SeasonPass are declared first so downstream services
	// (arena, interview, training) can receive a SeasonPassAwarder and
	// credit XP on match/session completion.
	walletDomain := walletdomain.NewService(walletdomain.Config{
		Repository: storage.walletRepo,
	})
	seasonPassDomain := seasonpassdomain.NewService(seasonpassdomain.Config{
		Repository: storage.seasonPassRepo,
		Wallet:     walletdomain.NewSeasonPassAdapter(walletDomain),
	})
	skillsDomain := skillsservice.NewService(storage.skillsRepo, walletdomain.NewSkillsAdapter(walletDomain))

	// duel_replay is declared next so arena can record a replay header
	// when matches finish.
	duelReplayDomain := duelreplaydomain.NewService(duelreplaydomain.Config{
		Repository: storage.duelReplayRepo,
	})
	arenaServiceDomain := apparena.New(apparena.Config{
		Repository: storage.arenaRepo,
		Sandbox:    sandboxService,
		SeasonPass: seasonPassDomain,
		DuelReplay: duelReplayDomain,
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
		SeasonPass:        seasonPassDomain,
		AIReviewTimeout:   bootstrap.cfg.External.AIReview.Timeout,
		MaxImageBytes:     bootstrap.cfg.External.AIReview.MaxImageBytes,
		ModelCode:         bootstrap.cfg.External.AIReview.ModelCode,
		ModelArchitecture: bootstrap.cfg.External.AIReview.ModelArchitecture,
		ModelFollowup:     bootstrap.cfg.External.AIReview.ModelFollowup,
		ModelSystemDesign: bootstrap.cfg.External.AIReview.ModelSystemDesign,
	})
	missionServiceDomain := missiondomainservice.NewService(missiondomainservice.Config{
		Repository: storage.missionRepo,
	})
	inboxServiceDomain := inboxdomainservice.NewService(inboxdomainservice.Config{
		Repository: storage.inboxRepo,
	})
	friendChallengeDomain := friendchallengedomain.NewService(friendchallengedomain.Config{
		Repository: storage.friendChallengeRepo,
		Users:      storage.friendChallengeUsers,
	})
	streakDomain := streakdomain.NewService(streakdomain.Config{
		Repository: storage.streakRepo,
		Stats:      storage.streakStats,
		Wallet:     walletdomain.NewStreakAdapter(walletDomain),
	})
	shopDomain := shopdomain.NewService(shopdomain.Config{
		Repository: storage.shopRepo,
		Wallet:     walletdomain.NewShopAdapter(walletDomain),
	})
	socialDomain := socialdomain.NewService(socialdomain.Config{
		Repository: storage.socialRepo,
		Users:      storage.socialUsers,
	})
	challengeServiceDomain := challengedomainservice.NewService(challengedomainservice.Config{
		Repository: storage.challengeRepo,
		Reviewer:   aiReviewService,
	})
	arenaRealtimeHub := arenart.NewHub(arenaServiceDomain, bootstrap.cfg.Server.AllowedOrigins)
	guildWarHub := guildwarrt.NewHub(bootstrap.kratosLogger, bootstrap.cfg.Server.AllowedOrigins)
	closer.AddSync(func() error { arenaRealtimeHub.Stop(); return nil })
	solutionReviewService := solutionreview.New(solutionreview.Config{
		Repo:      storage.solutionReviewRepo,
		Reviewer:  codeReviewService,
		Publisher: solutionreview.NewRealtimePublisher(realtimeHub),
	})

	cookies := server.NewSessionCookieManager(bootstrap.cfg.Auth.Session)

	var notifSender notification.Sender = notification.Noop{}
	if bootstrap.cfg.External.NotificationService != nil && bootstrap.cfg.External.NotificationService.Addr != "" {
		adapter, adapterErr := notification.NewGRPCAdapter(bootstrap.cfg.External.NotificationService.Addr)
		if adapterErr != nil {
			return nil, fmt.Errorf("create notification adapter: %w", adapterErr)
		}
		closer.AddSync(adapter.Close)
		notifSender = adapter
	}

	return &serviceContext{
		cookies:                 cookies,
		notificationSender:      notifSender,
		profileServiceDomain:    profileServiceDomain,
		codeEditorServiceDomain: codeEditorServiceDomain,
		arenaServiceDomain:      arenaServiceDomain,
		friendChallengeDomain:   friendChallengeDomain,
		realtimeHub:             realtimeHub,
		arenaRealtimeHub:        arenaRealtimeHub,
		guildWarHub:             guildWarHub,

		aiReviewer: aiReviewService,

		adminService: adminservice.New(adminServiceDomain, bootstrap.rtcManager, storage.profileRepo, profileServiceDomain).
			WithWalletGranter(adminWalletGranter{repo: storage.walletRepo}),
		profileService: profileservice.New(profileServiceDomain, cookies, profileservice.NewCachedProgressRepository(storage.profileRepo), storage.walletRepo, notifSender).
			WithPreferencesRepo(profilePreferencesAdapter{repo: storage.profileRepo}).
			WithToursRepo(storage.profileRepo),
		geoService:   geoservice.New(geoServiceDomain),
		hubService:   hubservice.New(storage.profileRepo, missionServiceDomain, eventServiceDomain, arenaServiceDomain, guildServiceDomain, seasonPassDomain).WithRegionStatsRepository(hubRegionStatsAdapter{db: storage.store.DB}),
		guildService: guildservice.New(guildServiceDomain, eventServiceDomain, notifSender).WithWarRepo(storage.guildRepo),
		eventService: eventservice.New(eventServiceDomain),
		podcastService: podcastservice.New(podcastServiceDomain).
			WithSeriesRepo(podcastSeriesAdapter{repo: storage.podcastRepo}).
			WithSavedRepo(podcastSavedAdapter{repo: storage.podcastRepo}).
			WithSeriesAdminRepo(podcastSeriesAdminAdapter{repo: storage.podcastRepo}),
		referralService:   referralservice.New(referralServiceDomain),
		skillsService:     skillsservice.New(skillsDomain),
		trainingService:   trainingservice.New(trainingservice.NewService(storage.profileRepo, codeEditorServiceDomain, sandboxService, solutionReviewService, seasonPassDomain)),
		codeEditorService: codeeditorservice.New(codeEditorServiceDomain, realtimeHub, aiReviewService, solutionReviewService),
		arenaService: arenaservice.New(arenaServiceDomain, arenaRealtimeHub, func() bool {
			return bootstrap.cfg.Arena != nil && !bootstrap.cfg.Arena.RequireAuth
		}, solutionReviewService, notifSender).WithLobbyRepo(storage.arenaRepo),
		interviewPrepService: interviewprepservice.New(interviewPrepDomain, storage.interviewRepo, notifSender).WithAIMentorRepo(storage.aiMentorRepo),
		missionService:       missionservice.New(missionServiceDomain),
		notificationSettings: notificationservice.NewSettings(notifSender),
		challengeService:     challengeservice.New(challengeServiceDomain),
		inboxService: inboxservice.New(inboxServiceDomain, storage.profileRepo).
			WithGiftsRepo(inboxGiftsAdapter{repo: storage.inboxRepo}).
			WithTradesRepo(inboxTradesAdapter{repo: storage.inboxRepo}),
		friendChallengeService: friendchallengeservice.New(friendChallengeDomain),
		duelReplayService:      duelreplayservice.New(duelReplayDomain),
		seasonPassService:      seasonpassservice.New(seasonPassDomain),
		streakService:          streakservice.New(streakDomain),
		shopService:            shopservice.New(shopDomain),
		sceneService:           sceneservice.New(storage.sceneRepo, storage.guildRepo),
		insightsService:        insightsservice.New(insightsapp.New(storage.profileRepo, storage.insightsRepo)),
		socialService:          socialservice.New(socialDomain),
		peerMockService:        peermockservice.New(storage.peerMockRepo),
		aiMentorService:        adminservice.NewAIMentorImpl(storage.aiMentorRepo).WithKeyVault(mentorKeyVault),
		premiumHandler:         newPremiumHandler(bootstrap, storage),
	}, nil
}

func newPremiumHandler(bootstrap *bootstrapContext, storage *storageContext) *premiumapi.Handler {
	var boostyClient *boosty.Client
	if bootstrap.cfg.External.Boosty != nil {
		c, err := boosty.New(boosty.Config{
			AccessToken:  bootstrap.cfg.External.Boosty.AccessToken,
			RefreshToken: bootstrap.cfg.External.Boosty.RefreshToken,
			DeviceID:     bootstrap.cfg.External.Boosty.DeviceID,
			BlogName:     bootstrap.cfg.External.Boosty.BlogName,
			Timeout:      bootstrap.cfg.External.Boosty.Timeout,
		})
		if err == nil {
			boostyClient = c
		}
	}
	return premiumapi.New(storage.premiumRepo, boostyClient)
}
