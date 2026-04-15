package rtc

import (
	stdlog "log"
	"strconv"
	"time"
)

//go:generate go run ./cmd/rtccodegen -input ../../.platform/values.yaml -output config.go

type Key string

type Definition struct {
	Usage    string `yaml:"usage"`
	Group    string `yaml:"group"`
	Value    string `yaml:"value"`
	Type     string `yaml:"type"`
	Writable bool   `yaml:"writable"`
}

type Variable struct {
	Key Key
	Definition
}

type Value struct {
	raw string
}

func (v Variable) Value() Value {
	return Value{raw: v.Definition.Value}
}

func (v Value) String() string {
	return v.raw
}

func (v Value) Int() int {
	parsed, err := strconv.Atoi(v.raw)
	if err != nil {
		if v.raw != "" {
			stdlog.Printf("rtc: failed to parse int from %q: %v", v.raw, err)
		}
		return 0
	}
	return parsed
}

func (v Value) Uint64() uint64 {
	parsed, err := strconv.ParseUint(v.raw, 10, 64)
	if err != nil {
		if v.raw != "" {
			stdlog.Printf("rtc: failed to parse uint64 from %q: %v", v.raw, err)
		}
		return 0
	}
	return parsed
}

func (v Value) Int64() int64 {
	parsed, err := strconv.ParseInt(v.raw, 10, 64)
	if err != nil {
		if v.raw != "" {
			stdlog.Printf("rtc: failed to parse int64 from %q: %v", v.raw, err)
		}
		return 0
	}
	return parsed
}

func (v Value) Bool() bool {
	parsed, err := strconv.ParseBool(v.raw)
	if err != nil {
		if v.raw != "" {
			stdlog.Printf("rtc: failed to parse bool from %q: %v", v.raw, err)
		}
		return false
	}
	return parsed
}

func (v Value) Float64() float64 {
	parsed, err := strconv.ParseFloat(v.raw, 64)
	if err != nil {
		if v.raw != "" {
			stdlog.Printf("rtc: failed to parse float64 from %q: %v", v.raw, err)
		}
		return 0
	}
	return parsed
}

func (v Value) Duration() time.Duration {
	parsed, err := time.ParseDuration(v.raw)
	if err != nil {
		if v.raw != "" {
			stdlog.Printf("rtc: failed to parse duration from %q: %v", v.raw, err)
		}
		return 0
	}
	return parsed
}

func variableFromDefinition(key Key, def Definition) Variable {
	return Variable{
		Key:        key,
		Definition: def,
	}
}
