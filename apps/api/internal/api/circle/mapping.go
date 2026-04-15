package circle

import (
	"math"

	"api/internal/model"
	v1 "api/pkg/api/circle/v1"

	"google.golang.org/protobuf/types/known/timestamppb"
)

func mapChallenge(ch *model.CircleChallenge) *v1.CircleChallengeData {
	if ch == nil {
		return nil
	}
	progress := make([]*v1.ChallengeMemberProgress, 0, len(ch.Progress))
	for _, p := range ch.Progress {
		progress = append(progress, &v1.ChallengeMemberProgress{
			UserId:    p.UserID.String(),
			FirstName: p.FirstName,
			LastName:  p.LastName,
			AvatarUrl: p.AvatarURL,
			Current:   p.Current,
		})
	}
	return &v1.CircleChallengeData{
		Id:          ch.ID.String(),
		CircleId:    ch.CircleID.String(),
		TemplateKey: ch.TemplateKey,
		TargetValue: ch.TargetValue,
		StartsAt:    timestamppb.New(ch.StartsAt),
		EndsAt:      timestamppb.New(ch.EndsAt),
		CreatedBy:   ch.CreatedBy.String(),
		Progress:    progress,
	}
}

func mapCircle(item *model.Circle) *v1.Circle {
	if item == nil {
		return nil
	}

	memberCount := uint32(0)
	if item.MemberCount > 0 {
		if item.MemberCount > math.MaxUint32 {
			memberCount = math.MaxUint32
		} else {
			memberCount = uint32(item.MemberCount)
		}
	}

	return &v1.Circle{
		Id:          item.ID.String(),
		Name:        item.Name,
		Description: item.Description,
		CreatorId:   item.CreatorID.String(),
		MemberCount: memberCount,
		Tags:        item.Tags,
		IsPublic:    item.IsPublic,
		IsJoined:    item.IsJoined,
		CreatedAt:   timestamppb.New(item.CreatedAt),
	}
}

func mapListCirclesResponse(resp *model.ListCirclesResponse) *v1.ListCirclesResponse {
	if resp == nil {
		return nil
	}

	circles := make([]*v1.Circle, 0, len(resp.Circles))
	for _, item := range resp.Circles {
		if item == nil {
			continue
		}
		circles = append(circles, mapCircle(item))
	}

	return &v1.ListCirclesResponse{
		Circles:    circles,
		TotalCount: resp.TotalCount,
	}
}
