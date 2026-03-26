package rtc

import (
	"strconv"
	"time"
)

//go:generate go run ./cmd/rtccodegen -input ../../.platform/values_local.yaml -output config.go

// Key identifies a realtime config variable.
type Key string

// Definition describes a realtime config variable stored in YAML.
type Definition struct {
	Usage    string `yaml:"usage"`
	Group    string `yaml:"group"`
	Value    string `yaml:"value"`
	Type     string `yaml:"type"`
	Writable bool   `yaml:"writable"`
}

// Variable represents a runtime config variable with metadata.
type Variable struct {
	Key Key
	Definition
}

// Value is a typed accessor wrapper around the variable raw value.
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
		return 0
	}
	return parsed
}

func (v Value) Uint64() uint64 {
	parsed, err := strconv.ParseUint(v.raw, 10, 64)
	if err != nil {
		return 0
	}
	return parsed
}

func (v Value) Int64() int64 {
	parsed, err := strconv.ParseInt(v.raw, 10, 64)
	if err != nil {
		return 0
	}
	return parsed
}

func (v Value) Bool() bool {
	parsed, err := strconv.ParseBool(v.raw)
	if err != nil {
		return false
	}
	return parsed
}

func (v Value) Float64() float64 {
	parsed, err := strconv.ParseFloat(v.raw, 64)
	if err != nil {
		return 0
	}
	return parsed
}

func (v Value) Duration() time.Duration {
	parsed, err := time.ParseDuration(v.raw)
	if err != nil {
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
