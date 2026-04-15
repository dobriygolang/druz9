package config

import "time"

type Bootstrap struct {
	Server   *Server   `json:"server"`
	Data     *Data     `json:"data"`
	Telegram *Telegram `json:"telegram"`
	API      *API      `json:"api"`
}

type Server struct {
	HTTP *HTTP `json:"http"`
	GRPC *GRPC `json:"grpc"`
}

type HTTP struct {
	Addr    string        `json:"addr"`
	Timeout time.Duration `json:"timeout"`
}

type GRPC struct {
	Addr    string        `json:"addr"`
	Timeout time.Duration `json:"timeout"`
}

type Data struct {
	Database *Database `json:"database"`
}

type Database struct {
	Source string `json:"source"`
}

type Telegram struct {
	BotToken string `json:"bot_token"`
}

type API struct {
	GRPCAddr string `json:"grpc_addr"`
}
