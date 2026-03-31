package schema

const (
	CodeEditorTypeHello           = "hello"
	CodeEditorTypeSnapshot        = "snapshot"
	CodeEditorTypeUpdate          = "update"
	CodeEditorTypeAwareness       = "awareness"
	CodeEditorTypeAwarenessRemove = "awareness_remove"
	CodeEditorTypePing            = "ping"
	CodeEditorTypePong            = "pong"
	CodeEditorTypeRoomUpdate      = "room_update"
	CodeEditorTypeSubmission      = "submission"
)

type CodeEditorMessage struct {
	Type         string                     `json:"type"`
	ClientID     string                     `json:"clientId,omitempty"`
	AwarenessID  uint64                     `json:"awarenessId,omitempty"`
	AwarenessIDs []uint64                   `json:"awarenessIds,omitempty"`
	UserID       string                     `json:"userId,omitempty"`
	Data         string                     `json:"data,omitempty"`
	PlainText    string                     `json:"plainText,omitempty"`
	Room         *CodeEditorRoom            `json:"room,omitempty"`
	Submission   *CodeEditorSubmissionEvent `json:"submission,omitempty"`
}

type CodeEditorRoom struct {
	ID              string                   `json:"id"`
	Mode            string                   `json:"mode"`
	InviteCode      string                   `json:"inviteCode"`
	CreatorID       string                   `json:"creatorId"`
	Code            string                   `json:"code"`
	CodeRevision    int64                    `json:"codeRevision"`
	Status          string                   `json:"status"`
	TaskID          string                   `json:"taskId,omitempty"`
	MaxParticipants int32                    `json:"maxParticipants"`
	Participants    []*CodeEditorParticipant `json:"participants"`
	CreatedAt       string                   `json:"createdAt"`
	UpdatedAt       string                   `json:"updatedAt"`
}

type CodeEditorParticipant struct {
	ID          string `json:"id"`
	UserID      string `json:"userId,omitempty"`
	DisplayName string `json:"displayName"`
	IsGuest     bool   `json:"isGuest"`
	IsReady     bool   `json:"isReady"`
	JoinedAt    string `json:"joinedAt"`
}

type CodeEditorSubmissionEvent struct {
	Output      string `json:"output"`
	Error       string `json:"error,omitempty"`
	ExitCode    int32  `json:"exitCode"`
	SubmittedBy string `json:"submittedBy"`
}
