package dto

const (
	CodeEditorRealtimeTypeHello           = "hello"
	CodeEditorRealtimeTypeSnapshot        = "snapshot"
	CodeEditorRealtimeTypeUpdate          = "update"
	CodeEditorRealtimeTypeAwareness       = "awareness"
	CodeEditorRealtimeTypeAwarenessRemove = "awareness_remove"
	CodeEditorRealtimeTypePing            = "ping"
	CodeEditorRealtimeTypePong            = "pong"
	CodeEditorRealtimeTypeRoomUpdate      = "room_update"
	CodeEditorRealtimeTypeSubmission      = "submission"
)

type CodeEditorRealtimeMessage struct {
	Type         string                     `json:"type"`
	ClientID     string                     `json:"clientId,omitempty"`
	AwarenessID  uint64                     `json:"awarenessId,omitempty"`
	AwarenessIDs []uint64                   `json:"awarenessIds,omitempty"`
	Data         string                     `json:"data,omitempty"`
	PlainText    string                     `json:"plainText,omitempty"`
	Room         *CodeEditorRealtimeRoom    `json:"room,omitempty"`
	Submission   *CodeEditorSubmissionEvent `json:"submission,omitempty"`
}

type CodeEditorRealtimeRoom struct {
	ID              string                           `json:"id"`
	Title           string                           `json:"title"`
	Mode            string                           `json:"mode"`
	Language        string                           `json:"language"`
	InviteCode      string                           `json:"inviteCode"`
	CreatorID       string                           `json:"creatorId"`
	Code            string                           `json:"code"`
	CodeRevision    int64                            `json:"codeRevision"`
	Status          string                           `json:"status"`
	Task            string                           `json:"task,omitempty"`
	TaskID          string                           `json:"taskId,omitempty"`
	MaxParticipants int32                            `json:"maxParticipants"`
	Participants    []*CodeEditorRealtimeParticipant `json:"participants"`
	CreatedAt       string                           `json:"createdAt"`
	UpdatedAt       string                           `json:"updatedAt"`
}

type CodeEditorRealtimeParticipant struct {
	ID          string `json:"id"`
	UserID      string `json:"userId,omitempty"`
	DisplayName string `json:"displayName"`
	IsGuest     bool   `json:"isGuest"`
	Role        string `json:"role"`
	IsReady     bool   `json:"isReady"`
	JoinedAt    string `json:"joinedAt"`
	Score       int32  `json:"score,omitempty"`
}

type CodeEditorSubmissionEvent struct {
	Output      string `json:"output"`
	Error       string `json:"error,omitempty"`
	ExitCode    int32  `json:"exitCode"`
	SubmittedBy string `json:"submittedBy"`
}
