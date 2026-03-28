package dto

const (
	ArenaRealtimeTypeHello      = "hello"
	ArenaRealtimeTypeSnapshot   = "snapshot"
	ArenaRealtimeTypeCodeUpdate = "code_update"
	ArenaRealtimeTypeMatch      = "match"
	ArenaRealtimeTypePing       = "ping"
	ArenaRealtimeTypePong       = "pong"
)

type ArenaRealtimeMessage struct {
	Type        string               `json:"type"`
	UserID      string               `json:"userId,omitempty"`
	DisplayName string               `json:"displayName,omitempty"`
	Spectator   bool                 `json:"spectator,omitempty"`
	Code        string               `json:"code,omitempty"`
	UpdatedAt   string               `json:"updatedAt,omitempty"`
	Match       *ArenaRealtimeMatch  `json:"match,omitempty"`
	Players     []*ArenaRealtimeCode `json:"players,omitempty"`
}

type ArenaRealtimeCode struct {
	UserID      string `json:"userId"`
	DisplayName string `json:"displayName"`
	Code        string `json:"code"`
	IsSelf      bool   `json:"isSelf"`
}

type ArenaRealtimeMatch struct {
	ID                string                 `json:"id"`
	TaskID            string                 `json:"taskId"`
	TaskTitle         string                 `json:"taskTitle"`
	TaskStatement     string                 `json:"taskStatement"`
	StarterCode       string                 `json:"starterCode"`
	Topic             string                 `json:"topic"`
	Difficulty        string                 `json:"difficulty"`
	Status            string                 `json:"status"`
	DurationSeconds   int32                  `json:"durationSeconds"`
	ObfuscateOpponent bool                   `json:"obfuscateOpponent"`
	IsRated           bool                   `json:"isRated"`
	UnratedReason     string                 `json:"unratedReason,omitempty"`
	AntiCheatEnabled  bool                   `json:"antiCheatEnabled"`
	WinnerUserID      string                 `json:"winnerUserId,omitempty"`
	WinnerReason      string                 `json:"winnerReason,omitempty"`
	StartedAt         string                 `json:"startedAt,omitempty"`
	FinishedAt        string                 `json:"finishedAt,omitempty"`
	CreatedAt         string                 `json:"createdAt,omitempty"`
	Players           []*ArenaRealtimePlayer `json:"players"`
}

type ArenaRealtimePlayer struct {
	UserID        string `json:"userId"`
	DisplayName   string `json:"displayName"`
	Side          string `json:"side"`
	IsCreator     bool   `json:"isCreator"`
	FreezeUntil   string `json:"freezeUntil,omitempty"`
	AcceptedAt    string `json:"acceptedAt,omitempty"`
	BestRuntimeMs int64  `json:"bestRuntimeMs,omitempty"`
	IsWinner      bool   `json:"isWinner"`
	JoinedAt      string `json:"joinedAt,omitempty"`
}
