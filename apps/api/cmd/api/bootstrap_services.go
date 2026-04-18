package main

import (
	"api/internal/aireview"
	adminservice "api/internal/api/admin"
	arenaservice "api/internal/api/arena"
	challengeservice "api/internal/api/challenge"
	guildservice "api/internal/api/guild"
	codeeditorservice "api/internal/api/code_editor"
	eventservice "api/internal/api/event"
	geoservice "api/internal/api/geo"
	duelreplayservice "api/internal/api/duel_replay"
	friendchallengeservice "api/internal/api/friend_challenge"
	hubservice "api/internal/api/hub"
	inboxservice "api/internal/api/inbox"
	interviewprepservice "api/internal/api/interview_prep"
	missionservice "api/internal/api/mission"
	notificationservice "api/internal/api/notification"
	podcastservice "api/internal/api/podcast"
	profileservice "api/internal/api/profile"
	referralservice "api/internal/api/referral"
	seasonpassservice "api/internal/api/season_pass"
	shopservice "api/internal/api/shop"
	socialservice "api/internal/api/social"
	streakservice "api/internal/api/streak"
	trainingservice "api/internal/api/training"
	apparenа "api/internal/app/arena"
	appcodeeditor "api/internal/app/codeeditor"
	appinterviewprep "api/internal/app/interviewprep"
	"api/internal/app/solutionreview"
	"api/internal/clients/notification"
	"api/internal/closer"
	admindomainservice "api/internal/domain/admin"
	challengedomainservice "api/internal/domain/challenge"
	guilddomainservice "api/internal/domain/guild"
	duelreplaydomain "api/internal/domain/duel_replay"
	eventdomainservice "api/internal/domain/event"
	friendchallengedomain "api/internal/domain/friend_challenge"
	geodomainservice "api/internal/domain/geo"
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
	"api/internal/sandbox"
	server "api/internal/server"
	"context"
	"strings"
)

type serviceContext struct {
	cookies                 *server.SessionCookieManager
	notificationSender      notification.Sender
	aiReviewService         aireview.Reviewer
	profileServiceDomain    *profiledomainservice.Service
	adminServiceDomain      *admindomainservice.Service
	geoServiceDomain        *geodomainservice.Service
	guildServiceDomain     *guilddomainservice.Service
	eventServiceDomain      *eventdomainservice.Service
	podcastServiceDomain    *podcastdomainservice.Service
	referralServiceDomain   *referraldomainservice.Service
	codeEditorServiceDomain *appcodeeditor.Service
	arenaServiceDomain      *apparenа.Service
	interviewPrepDomain     *appinterviewprep.Service
	realtimeHub             *codeeditorrt.Hub
	arenaRealtimeHub        *arenart.Hub
	adminService            *adminservice.Implementation
	profileService          *profileservice.Implementation
	geoService              *geoservice.Implementation
	hubService              *hubservice.Implementation
	guildService           *guildservice.Implementation
	eventService            *eventservice.Implementation
	podcastService          *podcastservice.Implementation
	referralService         *referralservice.Implementation
	trainingService         *trainingservice.Implementation
	codeEditorService       *codeeditorservice.Implementation
	arenaService            *arenaservice.Implementation
	interviewPrepService    *interviewprepservice.Implementation
	missionServiceDomain    *missiondomainservice.Service
	missionService          *missionservice.Implementation
	notificationSettings    *notificationservice.SettingsImplementation
	challengeServiceDomain  *challengedomainservice.Service
	challengeService        *challengeservice.Implementation
	inboxServiceDomain      *inboxdomainservice.Service
	inboxService            *inboxservice.Implementation
	friendChallengeDomain   *friendchallengedomain.Service
	friendChallengeService  *friendchallengeservice.Implementation
	duelReplayDomain        *duelreplaydomain.Service
	duelReplayService       *duelreplayservice.Implementation
	seasonPassDomain        *seasonpassdomain.Service
	seasonPassService       *seasonpassservice.Implementation
	streakDomain            *streakdomain.Service
	streakService           *streakservice.Implementation
	shopDomain              *shopdomain.Service
	shopService             *shopservice.Implementation
	socialDomain            *socialdomain.Service
	socialService           *socialservice.Implementation
	walletDomain            *walletdomain.Service
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
	geoServiceDomain := geodomainservice.NewGeoService(geodomainservice.Config{
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
	// duel_replay is declared next so arena can record a replay header
	// when matches finish.
	duelReplayDomain := duelreplaydomain.NewService(duelreplaydomain.Config{
		Repository: storage.duelReplayRepo,
	})
	arenaServiceDomain := apparenа.New(apparenа.Config{
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
			return nil, adapterErr
		}
		closer.AddSync(adapter.Close)
		notifSender = adapter
	}

	return &serviceContext{
		cookies:                 cookies,
		notificationSender:      notifSender,
		aiReviewService:         aiReviewService,
		profileServiceDomain:    profileServiceDomain,
		adminServiceDomain:      adminServiceDomain,
		geoServiceDomain:        geoServiceDomain,
		guildServiceDomain:     guildServiceDomain,
		eventServiceDomain:      eventServiceDomain,
		podcastServiceDomain:    podcastServiceDomain,
		referralServiceDomain:   referralServiceDomain,
		codeEditorServiceDomain: codeEditorServiceDomain,
		arenaServiceDomain:      arenaServiceDomain,
		interviewPrepDomain:     interviewPrepDomain,
		realtimeHub:             realtimeHub,
		arenaRealtimeHub:        arenaRealtimeHub,
		adminService:            adminservice.New(adminServiceDomain, bootstrap.rtcManager, storage.profileRepo, profileServiceDomain),
		profileService:          profileservice.New(profileServiceDomain, cookies, profileservice.NewCachedProgressRepository(storage.profileRepo), notifSender),
		geoService:              geoservice.New(geoServiceDomain),
		hubService:              hubservice.New(storage.profileRepo, missionServiceDomain, eventServiceDomain, arenaServiceDomain, guildServiceDomain),
		guildService:           guildservice.New(guildServiceDomain, eventServiceDomain, notifSender),
		eventService:            eventservice.New(eventServiceDomain),
		podcastService:          podcastservice.New(podcastServiceDomain),
		referralService:         referralservice.New(referralServiceDomain),
		trainingService:         trainingservice.New(trainingservice.NewService(storage.profileRepo, codeEditorServiceDomain, sandboxService, solutionReviewService, seasonPassDomain)),
		codeEditorService:       codeeditorservice.New(codeEditorServiceDomain, realtimeHub, aiReviewService, solutionReviewService),
		arenaService: arenaservice.New(arenaServiceDomain, arenaRealtimeHub, func() bool {
			return bootstrap.cfg.Arena != nil && !bootstrap.cfg.Arena.RequireAuth
		}, solutionReviewService, notifSender),
		interviewPrepService:   interviewprepservice.New(interviewPrepDomain, storage.interviewRepo, notifSender),
		missionServiceDomain:   missionServiceDomain,
		missionService:         missionservice.New(missionServiceDomain),
		notificationSettings:   notificationservice.NewSettings(notifSender),
		challengeServiceDomain: challengeServiceDomain,
		challengeService:       challengeservice.New(challengeServiceDomain),
		inboxServiceDomain:     inboxServiceDomain,
		inboxService:           inboxservice.New(inboxServiceDomain),
		friendChallengeDomain:  friendChallengeDomain,
		friendChallengeService: friendchallengeservice.New(friendChallengeDomain),
		duelReplayDomain:       duelReplayDomain,
		duelReplayService:      duelreplayservice.New(duelReplayDomain),
		seasonPassDomain:       seasonPassDomain,
		seasonPassService:      seasonpassservice.New(seasonPassDomain),
		streakDomain:           streakDomain,
		streakService:          streakservice.New(streakDomain),
		shopDomain:             shopDomain,
		shopService:            shopservice.New(shopDomain),
		socialDomain:           socialDomain,
		socialService:          socialservice.New(socialDomain),
		walletDomain:           walletDomain,
	}, nil
}
