package profile

import (
	grpc "google.golang.org/grpc"

	v1 "api/pkg/api/profile/v1"
	authcallbackv1 "api/pkg/auth_callback/v1"
)

type grpcCompatServer struct {
	*Implementation
	authcallbackv1.UnimplementedProfileServiceServer
}

var compatProfileServiceDesc = func() grpc.ServiceDesc {
	desc := v1.ProfileService_ServiceDesc
	desc.Methods = append(
		append([]grpc.MethodDesc{}, v1.ProfileService_ServiceDesc.Methods...),
		authcallbackv1.ProfileService_ServiceDesc.Methods...,
	)
	return desc
}()

func RegisterCompatProfileServiceServer(s grpc.ServiceRegistrar, srv *Implementation) {
	s.RegisterService(&compatProfileServiceDesc, &grpcCompatServer{Implementation: srv})
}
