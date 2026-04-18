package friend_challenge

import (
	"context"
	"strings"

	"github.com/google/uuid"

	"api/internal/model"
)

// SendChallenge creates a new row after validating the inputs and resolving
// the opponent's username to a user id.
func (s *Service) SendChallenge(
	ctx context.Context,
	challengerID uuid.UUID,
	opponentUsername, taskTitle, taskTopic, taskRef, note string,
	difficulty model.ChallengeDifficulty,
) (*model.FriendChallenge, error) {
	taskTitle = strings.TrimSpace(taskTitle)
	if taskTitle == "" {
		return nil, ErrTaskTitleMissing
	}
	if len(note) > MaxNoteLen {
		return nil, ErrNoteTooLong
	}

	opponentID, opponentName, err := s.users.FindUserIDByUsername(ctx, opponentUsername)
	if err != nil {
		return nil, ErrOpponentNotFound
	}
	if opponentID == challengerID {
		return nil, ErrCannotChallengeSelf
	}

	challengerName, err := s.users.FindUsernameByID(ctx, challengerID)
	if err != nil {
		challengerName = "" // best-effort; row still inserts
	}

	now := s.clock.Now()
	ch := &model.FriendChallenge{
		ID:                 uuid.New(),
		ChallengerID:       challengerID,
		ChallengerUsername: challengerName,
		OpponentID:         opponentID,
		OpponentUsername:   opponentName,
		TaskTitle:          taskTitle,
		TaskTopic:          strings.TrimSpace(taskTopic),
		TaskDifficulty:     difficulty,
		TaskRef:            strings.TrimSpace(taskRef),
		Note:               strings.TrimSpace(note),
		Status:             model.ChallengeStatusPending,
		DeadlineAt:         now.Add(DefaultDeadline),
		CreatedAt:          now,
	}
	if err := s.repo.Insert(ctx, ch); err != nil {
		return nil, err
	}
	return ch, nil
}
