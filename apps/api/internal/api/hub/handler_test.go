package hub

import (
	"context"
	"testing"
	"time"

	"api/internal/model"
	v1 "api/pkg/api/hub/v1"

	"github.com/google/uuid"
)

func TestGetOverviewReturnsOverview(t *testing.T) {
	userID := uuid.New()
	now := time.Date(2026, 4, 18, 12, 0, 0, 0, time.UTC)
	svc := New(
		&fakeProfiles{
			user: &model.User{ID: userID, FirstName: "Ada", LastName: "Lovelace", PinnedAchievements: []string{"first_blood"}},
			progress: &model.ProfileProgress{
				Overview: model.ProfileProgressOverview{Level: 12, CurrentStreakDays: 4},
				NextActions: []*model.NextAction{{
					Title:       "Beat the graph ladder",
					Description: "Solve one graph task to keep your streak alive.",
					ActionURL:   "/training",
				}},
			},
		},
		&fakeMissions{
			resp: &model.DailyMissionsResponse{
				Missions: []*model.DailyMission{{
					Key:         "practice",
					Title:       "Solve 3 medium tasks",
					TargetValue: 3,
					Current:     2,
					XPReward:    120,
					ActionURL:   "/training",
					Icon:        "sword",
				}},
			},
		},
		&fakeEvents{
			resp: &model.ListEventsResponse{
				Events: []*model.Event{{
					ID:               uuid.New(),
					Title:            "Midnight Contest",
					PlaceLabel:       "Town board",
					ParticipantCount: 14,
					ScheduledAt:      ptrTime(now.Add(6 * time.Hour)),
				}},
			},
		},
		&fakeArena{
			matches: []*model.ArenaMatch{{
				ID:         uuid.New(),
				Topic:      "graphs",
				Difficulty: model.ArenaDifficultyMedium,
				Players: []*model.ArenaPlayer{
					{DisplayName: "thornmoss"},
					{DisplayName: "kyrie.dev"},
				},
			}},
		},
		&fakeGuilds{
			resp: &model.ListGuildsResponse{
				Guilds: []*model.Guild{{ID: uuid.New(), Name: "Mossveil", IsJoined: true}},
			},
			members: []*model.GuildMemberProfile{
				{FirstName: "Ada", LastName: "Lovelace"},
				{FirstName: "Grace", LastName: "Hopper"},
			},
		},
	)
	ctx := model.ContextWithAuth(context.Background(), &model.AuthState{
		User: &model.User{ID: userID},
	})

	payload, err := svc.GetOverview(ctx, &v1.GetOverviewRequest{})
	if err != nil {
		t.Fatalf("GetOverview returned error: %v", err)
	}

	if payload.GetPlayer().GetDisplayName() != "Ada Lovelace" {
		t.Fatalf("unexpected player name: %q", payload.GetPlayer().GetDisplayName())
	}
	if payload.GetPlayer().GetLevelLabel() != "Level 12" {
		t.Fatalf("unexpected level label: %q", payload.GetPlayer().GetLevelLabel())
	}
	if len(payload.GetDailyMissions()) != 1 || payload.GetDailyMissions()[0].GetProgressLabel() != "2/3" {
		t.Fatalf("missions not mapped correctly: %+v", payload.GetDailyMissions())
	}
	if payload.GetQuest() == nil || payload.GetQuest().GetActionUrl() != "/training" {
		t.Fatalf("quest not mapped correctly: %+v", payload.GetQuest())
	}
	if len(payload.GetArena().GetItems()) != 1 || payload.GetArena().GetItems()[0].GetActionUrl() == "" {
		t.Fatalf("arena preview not mapped correctly: %+v", payload.GetArena().GetItems())
	}
	if len(payload.GetEvents()) != 1 || payload.GetEvents()[0].GetActionUrl() != "/events" {
		t.Fatalf("events not mapped correctly: %+v", payload.GetEvents())
	}
	if payload.GetGuild() == nil || len(payload.GetGuild().GetMemberPreview()) != 2 {
		t.Fatalf("guild preview not mapped correctly: %+v", payload.GetGuild())
	}
	if payload.GetMerchantPicks() == nil || len(payload.GetMerchantPicks()) != 0 {
		t.Fatalf("merchant picks should be empty array: %+v", payload.GetMerchantPicks())
	}
}

func TestGetOverviewDegradesOnSectionFailures(t *testing.T) {
	userID := uuid.New()
	svc := New(
		&fakeProfiles{
			user:        &model.User{ID: userID, Username: "wanderer"},
			progressErr: context.DeadlineExceeded,
		},
		&fakeMissions{err: context.DeadlineExceeded},
		&fakeEvents{err: context.DeadlineExceeded},
		&fakeArena{err: context.DeadlineExceeded, leaderboardErr: context.DeadlineExceeded},
		&fakeGuilds{err: context.DeadlineExceeded},
	)
	ctx := model.ContextWithAuth(context.Background(), &model.AuthState{
		User: &model.User{ID: userID},
	})

	payload, err := svc.GetOverview(ctx, &v1.GetOverviewRequest{})
	if err != nil {
		t.Fatalf("GetOverview returned error: %v", err)
	}

	if payload.GetPlayer().GetDisplayName() != "wanderer" {
		t.Fatalf("expected fallback player name, got %q", payload.GetPlayer().GetDisplayName())
	}
	if len(payload.GetDailyMissions()) != 0 {
		t.Fatalf("expected empty missions, got %+v", payload.GetDailyMissions())
	}
	if payload.GetQuest() != nil {
		t.Fatalf("expected nil quest, got %+v", payload.GetQuest())
	}
	if len(payload.GetArena().GetItems()) != 0 {
		t.Fatalf("expected empty arena items, got %+v", payload.GetArena().GetItems())
	}
	if len(payload.GetEvents()) != 0 {
		t.Fatalf("expected empty events, got %+v", payload.GetEvents())
	}
	if payload.GetGuild() != nil {
		t.Fatalf("expected nil guild, got %+v", payload.GetGuild())
	}
}

func TestGetOverviewUnauthorized(t *testing.T) {
	svc := New(&fakeProfiles{}, &fakeMissions{}, &fakeEvents{}, &fakeArena{}, &fakeGuilds{})

	_, err := svc.GetOverview(context.Background(), &v1.GetOverviewRequest{})
	if err == nil {
		t.Fatal("expected unauthorized error")
	}
}

type fakeProfiles struct {
	user        *model.User
	userErr     error
	progress    *model.ProfileProgress
	progressErr error
}

func (f *fakeProfiles) FindUserByID(_ context.Context, _ uuid.UUID) (*model.User, error) {
	return f.user, f.userErr
}

func (f *fakeProfiles) GetProfileProgress(_ context.Context, _ uuid.UUID) (*model.ProfileProgress, error) {
	return f.progress, f.progressErr
}

type fakeMissions struct {
	resp *model.DailyMissionsResponse
	err  error
}

func (f *fakeMissions) GetDailyMissions(_ context.Context, _ uuid.UUID) (*model.DailyMissionsResponse, error) {
	return f.resp, f.err
}

type fakeEvents struct {
	resp *model.ListEventsResponse
	err  error
}

func (f *fakeEvents) ListEvents(_ context.Context, _ uuid.UUID, _ model.ListEventsOptions) (*model.ListEventsResponse, error) {
	return f.resp, f.err
}

type fakeArena struct {
	matches        []*model.ArenaMatch
	err            error
	leaderboard    []*model.ArenaLeaderboardEntry
	leaderboardErr error
}

func (f *fakeArena) ListOpenMatches(_ context.Context, _ int32) ([]*model.ArenaMatch, error) {
	return f.matches, f.err
}

func (f *fakeArena) GetLeaderboard(_ context.Context, _ int32) ([]*model.ArenaLeaderboardEntry, error) {
	return f.leaderboard, f.leaderboardErr
}

type fakeGuilds struct {
	resp    *model.ListGuildsResponse
	err     error
	members []*model.GuildMemberProfile
}

func (f *fakeGuilds) ListGuilds(_ context.Context, _ uuid.UUID, _ model.ListGuildsOptions) (*model.ListGuildsResponse, error) {
	return f.resp, f.err
}

func (f *fakeGuilds) ListGuildMembers(_ context.Context, _ uuid.UUID, _ int32) ([]*model.GuildMemberProfile, error) {
	return f.members, nil
}

func ptrTime(v time.Time) *time.Time {
	return &v
}
