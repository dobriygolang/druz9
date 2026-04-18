package friend_challenge

import (
	"google.golang.org/protobuf/types/known/timestamppb"

	"api/internal/model"
	v1 "api/pkg/api/friend_challenge/v1"
)

func mapChallenge(ch *model.FriendChallenge) *v1.FriendChallenge {
	if ch == nil {
		return nil
	}
	out := &v1.FriendChallenge{
		Id:                 ch.ID.String(),
		ChallengerId:       ch.ChallengerID.String(),
		ChallengerUsername: ch.ChallengerUsername,
		OpponentId:         ch.OpponentID.String(),
		OpponentUsername:   ch.OpponentUsername,
		TaskTitle:          ch.TaskTitle,
		TaskTopic:          ch.TaskTopic,
		TaskDifficulty:     v1.ChallengeDifficulty(ch.TaskDifficulty),
		TaskRef:            ch.TaskRef,
		Note:               ch.Note,
		Status:             v1.ChallengeStatus(ch.Status),
		DeadlineAt:         timestamppb.New(ch.DeadlineAt),
		CreatedAt:          timestamppb.New(ch.CreatedAt),
	}
	if ch.ChallengerSubmittedAt != nil {
		out.ChallengerSubmittedAt = timestamppb.New(*ch.ChallengerSubmittedAt)
	}
	if ch.ChallengerTimeMs != nil {
		out.ChallengerTimeMs = *ch.ChallengerTimeMs
	}
	if ch.ChallengerScore != nil {
		out.ChallengerScore = *ch.ChallengerScore
	}
	if ch.OpponentSubmittedAt != nil {
		out.OpponentSubmittedAt = timestamppb.New(*ch.OpponentSubmittedAt)
	}
	if ch.OpponentTimeMs != nil {
		out.OpponentTimeMs = *ch.OpponentTimeMs
	}
	if ch.OpponentScore != nil {
		out.OpponentScore = *ch.OpponentScore
	}
	if ch.WinnerID != nil {
		out.WinnerId = ch.WinnerID.String()
	}
	if ch.CompletedAt != nil {
		out.CompletedAt = timestamppb.New(*ch.CompletedAt)
	}
	return out
}
