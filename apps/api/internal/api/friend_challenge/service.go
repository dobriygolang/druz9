// Package friend_challenge implements the gRPC/HTTP transport for FriendChallenge.
package friend_challenge

import (
	"google.golang.org/grpc"

	v1 "api/pkg/api/friend_challenge/v1"
)

// Implementation is the gRPC/HTTP handler for the FriendChallenge service.
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
