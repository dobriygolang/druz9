package model

import (
	"time"

	"github.com/google/uuid"
)

const (
	RoomModeAll        = "all"      // collaborative mode
	RoomModeDuel       = "duel"     // duel mode (two users race)
	RoomStatusWaiting  = "waiting"  // waiting for participants
	RoomStatusActive   = "active"   // room is active
	RoomStatusFinished = "finished" // duel finished
)

type Room struct {
	ID           uuid.UUID      `json:"id"`
	Mode         string         `json:"mode"` // "all" or "duel"
	Code         string         `json:"code"` // current code
	CodeRevision int64          `json:"code_revision"`
	Status       string         `json:"status"`      // "waiting", "active", "finished"
	CreatorID    uuid.UUID      `json:"creator_id"`  // creator user ID (nil for guests)
	InviteCode   string         `json:"invite_code"` // public invite code for guests
	Task         string         `json:"task"`        // task description for duel
	TaskID       *uuid.UUID     `json:"task_id,omitempty"`
	DuelTopic    string         `json:"duel_topic,omitempty"`
	WinnerUserID *uuid.UUID     `json:"winner_user_id,omitempty"`
	WinnerGuest  string         `json:"winner_guest_name,omitempty"`
	StartedAt    *time.Time     `json:"started_at,omitempty"`
	FinishedAt   *time.Time     `json:"finished_at,omitempty"`
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
	Participants []*Participant `json:"participants"`
}

type Participant struct {
	UserID   *uuid.UUID `json:"user_id"`   // nil for guests
	Name     string     `json:"name"`      // display name
	IsGuest  bool       `json:"is_guest"`  // true if not registered
	IsReady  bool       `json:"is_ready"`  // ready for duel
	IsWinner bool       `json:"is_winner"` // winner in duel mode
	JoinedAt time.Time  `json:"joined_at"`
}

type Submission struct {
	ID          uuid.UUID  `json:"id"`
	RoomID      uuid.UUID  `json:"room_id"`
	UserID      *uuid.UUID `json:"user_id"` // nil for guests
	GuestName   string     `json:"guest_name"`
	Code        string     `json:"code"`
	Output      string     `json:"output"`
	Error       string     `json:"error"`
	SubmittedAt time.Time  `json:"submitted_at"`
	DurationMs  int64      `json:"duration_ms"` // time to solve in duel
	IsCorrect   bool       `json:"is_correct"`
	PassedCount int32      `json:"passed_count"`
	TotalCount  int32      `json:"total_count"`
}

type CodeTask struct {
	ID               uuid.UUID       `json:"id"`
	Title            string          `json:"title"`
	Slug             string          `json:"slug"`
	Statement        string          `json:"statement"`
	Difficulty       string          `json:"difficulty"`
	Topics           []string        `json:"topics"`
	StarterCode      string          `json:"starter_code"`
	Language         string          `json:"language"`
	TaskType         string          `json:"task_type"`
	ExecutionProfile string          `json:"execution_profile"`
	FixtureFiles     []string        `json:"fixture_files"`
	ReadablePaths    []string        `json:"readable_paths"`
	WritablePaths    []string        `json:"writable_paths"`
	AllowedHosts     []string        `json:"allowed_hosts"`
	AllowedPorts     []int32         `json:"allowed_ports"`
	MockEndpoints    []string        `json:"mock_endpoints"`
	WritableTempDir  bool            `json:"writable_temp_dir"`
	IsActive         bool            `json:"is_active"`
	PublicTestCases  []*CodeTestCase `json:"public_test_cases"`
	HiddenTestCases  []*CodeTestCase `json:"hidden_test_cases"`
	CreatedAt        time.Time       `json:"created_at"`
	UpdatedAt        time.Time       `json:"updated_at"`
}

type CodeTestCase struct {
	ID             uuid.UUID `json:"id"`
	TaskID         uuid.UUID `json:"task_id"`
	Input          string    `json:"input"`
	ExpectedOutput string    `json:"expected_output"`
	IsPublic       bool      `json:"is_public"`
	Weight         int32     `json:"weight"`
	Order          int32     `json:"order"`
}

type CodeTaskFilter struct {
	Topic           string
	Difficulty      string
	IncludeInactive bool
}

type CodeLeaderboardEntry struct {
	UserID      string  `json:"user_id"`
	DisplayName string  `json:"display_name"`
	Wins        int32   `json:"wins"`
	Matches     int32   `json:"matches"`
	WinRate     float64 `json:"win_rate"`
	BestSolveMs int64   `json:"best_solve_ms"`
}

type CodeUpdatedEvent struct {
	Type   string `json:"type"` // "code_updated", "participant_joined", "participant_left", "duel_started", "duel_finished"
	Code   string `json:"code,omitempty"`
	RoomID string `json:"room_id,omitempty"`
}

type ParticipantEvent struct {
	Type        string       `json:"type"`
	Participant *Participant `json:"participant"`
}
