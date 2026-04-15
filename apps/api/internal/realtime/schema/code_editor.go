package schema

const (
	CodeEditorTypeHello           = "hello"
	CodeEditorTypeSnapshot        = "snapshot"
	CodeEditorTypeUpdate          = "update"
	CodeEditorTypeDocSync         = "doc_sync"
	CodeEditorTypePersist         = "persist"
	CodeEditorTypeAwareness       = "awareness"
	CodeEditorTypeAwarenessRemove = "awareness_remove"
	CodeEditorTypePing            = "ping"
	CodeEditorTypePong            = "pong"
	CodeEditorTypeRoomUpdate      = "room_update"
	CodeEditorTypeSubmission      = "submission"
	CodeEditorTypeLanguage        = "language"
	CodeEditorTypeReviewReady     = "review_ready"
)

type CodeEditorMessage struct {
	Type              string                     `json:"type"`
	ClientID          string                     `json:"clientId,omitempty"`
	AwarenessID       uint64                     `json:"awarenessId,omitempty"`
	AwarenessIDs      []uint64                   `json:"awarenessIds,omitempty"`
	ActiveClientCount int                        `json:"activeClientCount,omitempty"`
	UserID            string                     `json:"userId,omitempty"`
	GuestName         string                     `json:"guestName,omitempty"`
	Data              string                     `json:"data,omitempty"`
	PlainText         string                     `json:"plainText,omitempty"`
	Language          string                     `json:"language,omitempty"`
	Room              *CodeEditorRoom            `json:"room,omitempty"`
	Submission        *CodeEditorSubmissionEvent `json:"submission,omitempty"`
	Review            *CodeEditorReviewEvent     `json:"review,omitempty"`
}

type CodeEditorRoom struct {
	ID              string                   `json:"id"`
	Mode            string                   `json:"mode"`
	InviteCode      string                   `json:"inviteCode"`
	CreatorID       string                   `json:"creatorId"`
	Code            string                   `json:"code"`
	CodeRevision    int64                    `json:"codeRevision"`
	Language        string                   `json:"language"`
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

// CodeEditorReviewEvent is pushed when an AI review completes.
type CodeEditorReviewEvent struct {
	ReviewID        string            `json:"reviewId"`
	SubmissionID    string            `json:"submissionId"`
	Status          string            `json:"status"`
	Verdict         string            `json:"verdict,omitempty"`
	TimeComplexity  string            `json:"timeComplexity,omitempty"`
	SpaceComplexity string            `json:"spaceComplexity,omitempty"`
	Pattern         string            `json:"pattern,omitempty"`
	Strengths       []string          `json:"strengths,omitempty"`
	Weaknesses      []string          `json:"weaknesses,omitempty"`
	Hint            string            `json:"hint,omitempty"`
	SkillSignals    map[string]string `json:"skillSignals,omitempty"`
	Comparison      string            `json:"comparison,omitempty"`
	AttemptNumber   int               `json:"attemptNumber"`
	SolveTimeMs     int64             `json:"solveTimeMs"`
	MedianTimeMs    int64             `json:"medianTimeMs"`
}
