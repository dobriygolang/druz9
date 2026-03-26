package room

import (
	"api/internal/model"
	v1 "api/pkg/api/room/v1"

	"google.golang.org/protobuf/types/known/timestamppb"
)

func mapRoom(item *model.Room) *v1.Room {
	if item == nil {
		return nil
	}
	resp := &v1.Room{
		Id:          item.ID.String(),
		Title:       item.Title,
		Kind:        item.Kind,
		Description: item.Description,
		IsPrivate:   item.IsPrivate,
		CreatorId:   item.CreatorID,
		CreatorName: item.CreatorName,
		MemberCount: item.MemberCount,
		IsJoined:    item.IsJoined,
		IsOwner:     item.IsOwner,
		CreatedAt:   timestamppb.New(item.CreatedAt),
		UpdatedAt:   timestamppb.New(item.UpdatedAt),
		MediaState:  mapRoomMediaState(item.MediaState),
	}
	if len(item.Participants) > 0 {
		resp.Participants = make([]*v1.RoomParticipant, 0, len(item.Participants))
		for _, participant := range item.Participants {
			resp.Participants = append(resp.Participants, mapRoomParticipant(participant))
		}
	}
	return resp
}

func mapRoomParticipant(item *model.RoomParticipant) *v1.RoomParticipant {
	if item == nil {
		return nil
	}
	return &v1.RoomParticipant{
		UserId:           item.UserID,
		Title:            item.Title,
		AvatarUrl:        item.AvatarURL,
		TelegramUsername: item.TelegramUsername,
		FirstName:        item.FirstName,
		LastName:         item.LastName,
		IsCurrentUser:    item.IsCurrentUser,
		JoinedAt:         timestamppb.New(item.JoinedAt),
	}
}

func mapRoomMediaState(item *model.RoomMediaState) *v1.RoomMediaState {
	if item == nil {
		return nil
	}
	return &v1.RoomMediaState{
		RoomId:             item.RoomID,
		MediaUrl:           item.MediaURL,
		Paused:             item.Paused,
		CurrentTimeSeconds: item.CurrentTimeSeconds,
		UpdatedBy:          item.UpdatedBy,
		UpdatedByName:      item.UpdatedByName,
		UpdatedAt:          timestamppb.New(item.UpdatedAt),
	}
}
