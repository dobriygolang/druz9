package profile

import (
	"testing"

	"api/internal/model"
)

func TestComputeLevel(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name        string
		competency  *model.ProfileCompetency
		wantLevel   string
		wantMinProg float64
		wantMaxProg float64
	}{
		{
			name:       "nil competency",
			competency: nil,
			wantLevel:  LevelBeginner,
		},
		{
			name:       "zero activity",
			competency: &model.ProfileCompetency{},
			wantLevel:  LevelBeginner,
		},
		{
			name: "low score beginner",
			competency: &model.ProfileCompetency{
				Score: 20, PracticeSessions: 2, StageCount: 0,
			},
			wantLevel:   LevelBeginner,
			wantMinProg: 0.5,
			wantMaxProg: 1.0,
		},
		{
			name: "score 30 with 3 sessions = confident",
			competency: &model.ProfileCompetency{
				Score: 30, PracticeSessions: 3, StageCount: 0,
			},
			wantLevel: LevelConfident,
		},
		{
			name: "score 30 but only 2 sessions = beginner",
			competency: &model.ProfileCompetency{
				Score: 30, PracticeSessions: 2, StageCount: 0,
			},
			wantLevel: LevelBeginner,
		},
		{
			name: "verified 60 = strong",
			competency: &model.ProfileCompetency{
				Score: 65, VerifiedScore: 60, StageCount: 3, PracticeSessions: 5,
			},
			wantLevel: LevelStrong,
		},
		{
			name: "verified 85 with 5 stages = expert",
			competency: &model.ProfileCompetency{
				Score: 90, VerifiedScore: 85, StageCount: 5,
			},
			wantLevel: LevelExpert,
		},
		{
			name: "verified 85 but only 4 stages = strong",
			competency: &model.ProfileCompetency{
				Score: 88, VerifiedScore: 85, StageCount: 4,
			},
			wantLevel: LevelStrong,
		},
		{
			name: "verified 100 expert full progress",
			competency: &model.ProfileCompetency{
				Score: 100, VerifiedScore: 100, StageCount: 10,
			},
			wantLevel:   LevelExpert,
			wantMinProg: 1.0,
			wantMaxProg: 1.0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			level, prog := ComputeLevel(tt.competency)
			if level != tt.wantLevel {
				t.Errorf("ComputeLevel() level = %q, want %q", level, tt.wantLevel)
			}
			if prog < 0 || prog > 1 {
				t.Errorf("ComputeLevel() progress = %f, want [0, 1]", prog)
			}
			if tt.wantMinProg > 0 && prog < tt.wantMinProg {
				t.Errorf("ComputeLevel() progress = %f, want >= %f", prog, tt.wantMinProg)
			}
			if tt.wantMaxProg > 0 && prog > tt.wantMaxProg {
				t.Errorf("ComputeLevel() progress = %f, want <= %f", prog, tt.wantMaxProg)
			}
		})
	}
}

func TestComputeNextActions(t *testing.T) {
	t.Parallel()

	t.Run("empty competencies returns empty", func(t *testing.T) {
		t.Parallel()
		actions := ComputeNextActions(nil, nil, 5)
		if len(actions) != 0 {
			t.Errorf("expected 0 actions, got %d", len(actions))
		}
	})

	t.Run("max 3 actions", func(t *testing.T) {
		t.Parallel()
		competencies := make([]*model.ProfileCompetency, 0, 5)
		for _, s := range ProgressSkills {
			competencies = append(competencies, &model.ProfileCompetency{
				Key: s.Key, Label: s.Meta.Label, Score: 0,
			})
		}
		actions := ComputeNextActions(competencies, nil, 0)
		if len(actions) > 3 {
			t.Errorf("expected max 3 actions, got %d", len(actions))
		}
	})

	t.Run("streak broken adds daily action", func(t *testing.T) {
		t.Parallel()
		competencies := []*model.ProfileCompetency{
			{Key: "slices", Label: "Algorithms", Score: 80, VerifiedScore: 85, StageCount: 5, Confidence: "verified"},
		}
		actions := ComputeNextActions(competencies, nil, 0)
		hasDailyAction := false
		for _, a := range actions {
			if a.ActionType == "daily" {
				hasDailyAction = true
				break
			}
		}
		if !hasDailyAction {
			t.Error("expected a daily action when streak is 0")
		}
	})

	t.Run("weakest_first goal prioritizes lowest score", func(t *testing.T) {
		t.Parallel()
		competencies := []*model.ProfileCompetency{
			{Key: "slices", Label: "Algorithms", Score: 80, PracticeSessions: 10, StageCount: 3, Confidence: "verified", VerifiedScore: 70},
			{Key: "sql", Label: "SQL", Score: 10, PracticeSessions: 1, StageCount: 0, Confidence: "low"},
		}
		goal := &model.UserGoal{Kind: "weakest_first"}
		actions := ComputeNextActions(competencies, goal, 5)
		if len(actions) == 0 {
			t.Fatal("expected at least 1 action")
		}
		if actions[0].SkillKey != "sql" {
			t.Errorf("expected first action for sql, got %s", actions[0].SkillKey)
		}
	})

	t.Run("unverified high practice suggests mock", func(t *testing.T) {
		t.Parallel()
		competencies := []*model.ProfileCompetency{
			{Key: "concurrency", Label: "Coding", Score: 35, PracticeScore: 50, PracticeSessions: 8, Confidence: "medium"},
		}
		actions := ComputeNextActions(competencies, nil, 5)
		if len(actions) == 0 {
			t.Fatal("expected at least 1 action")
		}
		if actions[0].ActionType != "mock" {
			t.Errorf("expected mock action, got %s", actions[0].ActionType)
		}
	})
}

func TestComputeNextMilestone(t *testing.T) {
	t.Parallel()

	t.Run("nil returns default", func(t *testing.T) {
		t.Parallel()
		m := ComputeNextMilestone(nil)
		if m == "" {
			t.Error("expected non-empty milestone for nil")
		}
	})

	t.Run("beginner with zero sessions", func(t *testing.T) {
		t.Parallel()
		m := ComputeNextMilestone(&model.ProfileCompetency{Key: "sql", Label: "SQL", Score: 0})
		if m == "" {
			t.Error("expected non-empty milestone")
		}
	})

	t.Run("expert has maintenance message", func(t *testing.T) {
		t.Parallel()
		m := ComputeNextMilestone(&model.ProfileCompetency{
			Key: "slices", Label: "Algorithms", Score: 95, VerifiedScore: 95, StageCount: 10,
		})
		if m == "" {
			t.Error("expected non-empty milestone for expert")
		}
	})
}
