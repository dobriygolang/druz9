package config

import "time"

type Bootstrap struct {
	Server   *Server   `json:"server" yaml:"server"`
	Data     *Data     `json:"data" yaml:"data"`
	External *External `json:"external" yaml:"external"`
}

type Server struct {
	HTTP *HTTP `json:"http" yaml:"http"`
	GRPC *GRPC `json:"grpc" yaml:"grpc"`
}

type HTTP struct {
	Addr    string        `json:"addr" yaml:"addr"`
	Timeout time.Duration `json:"timeout" yaml:"timeout"`
}

type GRPC struct {
	Addr    string        `json:"addr" yaml:"addr"`
	Timeout time.Duration `json:"timeout" yaml:"timeout"`
}

type Data struct {
	Database *Database `json:"database" yaml:"database"`
}

type Database struct {
	Driver string `json:"driver" yaml:"driver"`
	Source string `json:"source" yaml:"source"`
}

type External struct {
	Telegram *Telegram `json:"telegram" yaml:"telegram"`
	S3       *S3       `json:"s3" yaml:"s3"`
}

type Telegram struct {
	BotToken   string `json:"bot_token" yaml:"bot_token"`
	WebhookURL string `json:"webhook_url" yaml:"webhook_url"`
}

type S3 struct {
	Endpoint  string `json:"endpoint" yaml:"endpoint"`
	AccessKey string `json:"access_key" yaml:"access_key"`
	SecretKey string `json:"secret_key" yaml:"secret_key"`
	Bucket    string `json:"bucket" yaml:"bucket"`
	Region    string `json:"region" yaml:"region"`
}
