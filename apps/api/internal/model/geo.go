package model

type GeoResolveRequest struct {
	Query string `json:"query"`
}

type GeoCandidate struct {
	Region      string  `json:"region"`
	Country     string  `json:"country"`
	City        string  `json:"city"`
	Latitude    float64 `json:"latitude"`
	Longitude   float64 `json:"longitude"`
	DisplayName string  `json:"display_name"`
}

type GeoResolveResponse struct {
	Candidates []*GeoCandidate `json:"candidates"`
}

type CommunityMapPoint struct {
	UserID           string  `json:"user_id"`
	Title            string  `json:"title"`
	Region           string  `json:"region"`
	Latitude         float64 `json:"latitude"`
	Longitude        float64 `json:"longitude"`
	IsCurrentUser    bool    `json:"is_current_user"`
	AvatarURL        string  `json:"avatar_url"`
	TelegramUsername string  `json:"telegram_username"`
	FirstName        string  `json:"first_name"`
	LastName         string  `json:"last_name"`
	ActivityStatus   string  `json:"activity_status"`
}

type CommunityMapResponse struct {
	Points []*CommunityMapPoint `json:"points"`
}
