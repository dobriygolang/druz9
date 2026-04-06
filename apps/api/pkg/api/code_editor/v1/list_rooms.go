package v1

// ListRoomsRequest is the request for the ListRooms endpoint.
type ListRoomsRequest struct{}

// ListRoomsParticipant is a participant in the list rooms response.
type ListRoomsParticipant struct {
	UserID    string `json:"userId,omitempty"`
	Name      string `json:"name,omitempty"`
	IsGuest   bool   `json:"isGuest,omitempty"`
	IsReady   bool   `json:"isReady,omitempty"`
	IsWinner  bool   `json:"isWinner,omitempty"`
	JoinedAt  string `json:"joinedAt,omitempty"`
	IsCreator bool   `json:"isCreator,omitempty"`
}

// ListRoomsRoomItem is a room entry in the list rooms response.
type ListRoomsRoomItem struct {
	ID           string                 `json:"id"`
	Mode         string                 `json:"mode,omitempty"`
	Status       string                 `json:"status,omitempty"`
	InviteCode   string                 `json:"inviteCode,omitempty"`
	Task         string                 `json:"task,omitempty"`
	CreatedAt    string                 `json:"createdAt,omitempty"`
	Participants []*ListRoomsParticipant `json:"participants"`
	TaskID       string                 `json:"taskId,omitempty"`
	CodeRevision int64                  `json:"codeRevision,omitempty"`
	CreatorID    string                 `json:"creatorId,omitempty"`
}

// ListRoomsResponse is the response for the ListRooms endpoint.
type ListRoomsResponse struct {
	Rooms []*ListRoomsRoomItem `json:"rooms"`
}
