// Package friend_challenge (api layer) is the gRPC/HTTP transport for the
// friend-challenge domain. Handlers do auth, proto↔domain mapping and error
// translation only.
package friend_challenge

import (
	"context"
	goerr "errors"

	"github.com/go-kratos/kratos/v2/errors"
	"github.com/google/uuid"
	"google.golang.org/grpc"
	"google.golang.org/protobuf/types/known/timestamppb"

	"api/internal/apihelpers"
	friendchallengedomain "api/internal/domain/friend_challenge"
	"api/internal/model"
	v1 "api/pkg/api/friend_challenge/v1"
)

// Service is the interface consumed by transport handlers.
type Service interface {
	SendChallenge(
		ctx context.Context,
		challengerID uuid.UUID,
		opponentUsername, taskTitle, taskTopic, taskRef, note string,
		difficulty model.ChallengeDifficulty,
	) (*model.FriendChallenge, error)
	SubmitSolution(ctx context.Context, userID, challengeID uuid.UUID, timeMs, score int32) (*model.FriendChallenge, error)
	Decline(ctx context.Context, userID, challengeID uuid.UUID) (*model.FriendChallenge, error)
	ListIncoming(ctx context.Context, userID uuid.UUID, limit, offset int32) (*model.ChallengeList, error)
	ListSent(ctx context.Context, userID uuid.UUID, limit, offset int32) (*model.ChallengeList, error)
	ListHistory(ctx context.Context, userID uuid.UUID, limit, offset int32) (*model.ChallengeList, error)
}

// Implementation is the gRPC/HTTP handler.
type Implementation struct {
	v1.UnimplementedFriendChallengeServiceServer
	service Service
}

func New(service Service) *Implementation {
	return &Implementation{service: service}
}

func (i *Implementation) GetDescription() grpc.ServiceDesc {
	return v1.FriendChallengeService_ServiceDesc
}

// ---------- handlers ----------

func (i *Implementation) ListIncoming(ctx context.Context, req *v1.ListIncomingRequest) (*v1.ListChallengesResponse, error) {
	user, err := apihelpers.RequireUser(ctx)
	if err != nil {
		return nil, err
	}
	result, err := i.service.ListIncoming(ctx, user.ID, req.GetLimit(), req.GetOffset())
	if err != nil {
		return nil, errors.InternalServer("INTERNAL", "failed to list incoming challenges")
	}
	return mapList(result), nil
}

func (i *Implementation) ListSent(ctx context.Context, req *v1.ListSentRequest) (*v1.ListChallengesResponse, error) {
	user, err := apihelpers.RequireUser(ctx)
	if err != nil {
		return nil, err
	}
	result, err := i.service.ListSent(ctx, user.ID, req.GetLimit(), req.GetOffset())
	if err != nil {
		return nil, errors.InternalServer("INTERNAL", "failed to list sent challenges")
	}
	return mapList(result), nil
}

func (i *Implementation) ListHistory(ctx context.Context, req *v1.ListHistoryRequest) (*v1.ListChallengesResponse, error) {
	user, err := apihelpers.RequireUser(ctx)
	if err != nil {
		return nil, err
	}
	result, err := i.service.ListHistory(ctx, user.ID, req.GetLimit(), req.GetOffset())
	if err != nil {
		return nil, errors.InternalServer("INTERNAL", "failed to list challenge history")
	}
	return mapList(result), nil
}

func (i *Implementation) SendChallenge(ctx context.Context, req *v1.SendChallengeRequest) (*v1.SendChallengeResponse, error) {
	user, err := apihelpers.RequireUser(ctx)
	if err != nil {
		return nil, err
	}
	ch, err := i.service.SendChallenge(
		ctx, user.ID,
		req.GetOpponentUsername(), req.GetTaskTitle(), req.GetTaskTopic(), req.GetTaskRef(), req.GetNote(),
		model.ChallengeDifficulty(req.GetTaskDifficulty()),
	)
	if err != nil {
		return nil, mapSendError(err)
	}
	return &v1.SendChallengeResponse{Challenge: mapChallenge(ch)}, nil
}

func (i *Implementation) SubmitSolution(ctx context.Context, req *v1.SubmitSolutionRequest) (*v1.SubmitSolutionResponse, error) {
	user, err := apihelpers.RequireUser(ctx)
	if err != nil {
		return nil, err
	}
	challengeID, parseErr := apihelpers.ParseUUID(req.GetChallengeId(), "INVALID_CHALLENGE_ID", "challenge_id")
	if parseErr != nil {
		return nil, parseErr
	}
	ch, err := i.service.SubmitSolution(ctx, user.ID, challengeID, req.GetTimeMs(), req.GetScore())
	if err != nil {
		return nil, mapSubmitError(err)
	}
	return &v1.SubmitSolutionResponse{Challenge: mapChallenge(ch)}, nil
}

func (i *Implementation) Decline(ctx context.Context, req *v1.DeclineRequest) (*v1.DeclineResponse, error) {
	user, err := apihelpers.RequireUser(ctx)
	if err != nil {
		return nil, err
	}
	challengeID, parseErr := apihelpers.ParseUUID(req.GetChallengeId(), "INVALID_CHALLENGE_ID", "challenge_id")
	if parseErr != nil {
		return nil, parseErr
	}
	ch, err := i.service.Decline(ctx, user.ID, challengeID)
	if err != nil {
		return nil, mapDeclineError(err)
	}
	return &v1.DeclineResponse{Challenge: mapChallenge(ch)}, nil
}

// ---------- helpers ----------

func mapList(list *model.ChallengeList) *v1.ListChallengesResponse {
	out := make([]*v1.FriendChallenge, 0, len(list.Challenges))
	for _, ch := range list.Challenges {
		out = append(out, mapChallenge(ch))
	}
	return &v1.ListChallengesResponse{Challenges: out, Total: list.Total}
}

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

func mapSendError(err error) error {
	switch {
	case goerr.Is(err, friendchallengedomain.ErrOpponentNotFound):
		return errors.NotFound("OPPONENT_NOT_FOUND", "opponent user not found")
	case goerr.Is(err, friendchallengedomain.ErrCannotChallengeSelf):
		return errors.BadRequest("INVALID_OPPONENT", "cannot challenge yourself")
	case goerr.Is(err, friendchallengedomain.ErrTaskTitleMissing):
		return errors.BadRequest("INVALID_TASK", "task_title is required")
	case goerr.Is(err, friendchallengedomain.ErrNoteTooLong):
		return errors.BadRequest("NOTE_TOO_LONG", "note exceeds 400 characters")
	default:
		return errors.InternalServer("INTERNAL", "failed to create challenge")
	}
}

func mapSubmitError(err error) error {
	switch {
	case goerr.Is(err, friendchallengedomain.ErrChallengeNotFound):
		return errors.NotFound("CHALLENGE_NOT_FOUND", "challenge does not exist")
	case goerr.Is(err, friendchallengedomain.ErrNotParticipant):
		return errors.Forbidden("NOT_PARTICIPANT", "you are not a participant of this challenge")
	case goerr.Is(err, friendchallengedomain.ErrAlreadyCompleted):
		return errors.Conflict("CHALLENGE_COMPLETED", "challenge is already completed")
	case goerr.Is(err, friendchallengedomain.ErrAlreadyExpired):
		return errors.Conflict("CHALLENGE_EXPIRED", "challenge deadline has passed")
	case goerr.Is(err, friendchallengedomain.ErrAlreadyDeclined):
		return errors.Conflict("CHALLENGE_DECLINED", "challenge was declined")
	case goerr.Is(err, friendchallengedomain.ErrAlreadySubmitted):
		return errors.Conflict("ALREADY_SUBMITTED", "you already submitted to this challenge")
	case goerr.Is(err, friendchallengedomain.ErrBadScore):
		return errors.BadRequest("INVALID_SCORE", "score must be between 0 and 5")
	case goerr.Is(err, friendchallengedomain.ErrBadTime):
		return errors.BadRequest("INVALID_TIME", "time_ms must be positive")
	default:
		return errors.InternalServer("INTERNAL", "failed to submit solution")
	}
}

func mapDeclineError(err error) error {
	switch {
	case goerr.Is(err, friendchallengedomain.ErrChallengeNotFound):
		return errors.NotFound("CHALLENGE_NOT_FOUND", "challenge does not exist")
	case goerr.Is(err, friendchallengedomain.ErrOnlyOpponentCanDecline):
		return errors.Forbidden("ONLY_OPPONENT_CAN_DECLINE", "only the opponent can decline a challenge")
	case goerr.Is(err, friendchallengedomain.ErrAlreadyCompleted),
		goerr.Is(err, friendchallengedomain.ErrAlreadyExpired),
		goerr.Is(err, friendchallengedomain.ErrAlreadyDeclined):
		return errors.Conflict("CHALLENGE_TERMINAL", "challenge is no longer actionable")
	default:
		return errors.InternalServer("INTERNAL", "failed to decline challenge")
	}
}
