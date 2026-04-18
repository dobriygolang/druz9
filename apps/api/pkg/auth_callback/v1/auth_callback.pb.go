package v1

type OperationStatus int32

const (
	OperationStatus_OPERATION_STATUS_UNSPECIFIED OperationStatus = 0
	OperationStatus_OPERATION_STATUS_OK          OperationStatus = 1
)

type ConfirmTelegramAuthRequest struct {
	Token      string `protobuf:"bytes,1,opt,name=token,proto3" json:"token,omitempty"`
	BotToken   string `protobuf:"bytes,2,opt,name=bot_token,json=botToken,proto3" json:"bot_token,omitempty"`
	TelegramId int64  `protobuf:"varint,3,opt,name=telegram_id,json=telegramId,proto3" json:"telegram_id,omitempty"`
	FirstName  string `protobuf:"bytes,4,opt,name=first_name,json=firstName,proto3" json:"first_name,omitempty"`
	LastName   string `protobuf:"bytes,5,opt,name=last_name,json=lastName,proto3" json:"last_name,omitempty"`
	Username   string `protobuf:"bytes,6,opt,name=username,proto3" json:"username,omitempty"`
	PhotoUrl   string `protobuf:"bytes,7,opt,name=photo_url,json=photoUrl,proto3" json:"photo_url,omitempty"`
}

func (x *ConfirmTelegramAuthRequest) Reset()         { *x = ConfirmTelegramAuthRequest{} }
func (x *ConfirmTelegramAuthRequest) String() string { return "ConfirmTelegramAuthRequest" }
func (*ConfirmTelegramAuthRequest) ProtoMessage()    {}

func (x *ConfirmTelegramAuthRequest) GetToken() string {
	if x != nil {
		return x.Token
	}
	return ""
}

func (x *ConfirmTelegramAuthRequest) GetBotToken() string {
	if x != nil {
		return x.BotToken
	}
	return ""
}

func (x *ConfirmTelegramAuthRequest) GetTelegramId() int64 {
	if x != nil {
		return x.TelegramId
	}
	return 0
}

func (x *ConfirmTelegramAuthRequest) GetFirstName() string {
	if x != nil {
		return x.FirstName
	}
	return ""
}

func (x *ConfirmTelegramAuthRequest) GetLastName() string {
	if x != nil {
		return x.LastName
	}
	return ""
}

func (x *ConfirmTelegramAuthRequest) GetUsername() string {
	if x != nil {
		return x.Username
	}
	return ""
}

func (x *ConfirmTelegramAuthRequest) GetPhotoUrl() string {
	if x != nil {
		return x.PhotoUrl
	}
	return ""
}

type ConfirmTelegramAuthResponse struct {
	Status OperationStatus `protobuf:"varint,1,opt,name=status,proto3,enum=profile.v1.OperationStatus" json:"status,omitempty"`
	Code   string          `protobuf:"bytes,2,opt,name=code,proto3" json:"code,omitempty"`
}

func (x *ConfirmTelegramAuthResponse) Reset()         { *x = ConfirmTelegramAuthResponse{} }
func (x *ConfirmTelegramAuthResponse) String() string { return "ConfirmTelegramAuthResponse" }
func (*ConfirmTelegramAuthResponse) ProtoMessage()    {}

func (x *ConfirmTelegramAuthResponse) GetStatus() OperationStatus {
	if x != nil {
		return x.Status
	}
	return OperationStatus_OPERATION_STATUS_UNSPECIFIED
}

func (x *ConfirmTelegramAuthResponse) GetCode() string {
	if x != nil {
		return x.Code
	}
	return ""
}
