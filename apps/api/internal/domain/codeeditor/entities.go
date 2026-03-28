package codeeditor

import "api/internal/model"

const (
	RoomModeAll        = model.RoomModeAll
	RoomModeDuel       = model.RoomModeDuel
	RoomStatusWaiting  = model.RoomStatusWaiting
	RoomStatusActive   = model.RoomStatusActive
	RoomStatusFinished = model.RoomStatusFinished
)

type Room = model.Room
type Participant = model.Participant
type Submission = model.Submission
type Task = model.CodeTask
type TestCase = model.CodeTestCase
type TaskFilter = model.CodeTaskFilter
type LeaderboardEntry = model.CodeLeaderboardEntry
