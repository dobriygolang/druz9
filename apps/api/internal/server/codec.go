package server

import (
	"encoding/json"

	kratosencoding "github.com/go-kratos/kratos/v2/encoding"
	"google.golang.org/protobuf/encoding/protojson"
	"google.golang.org/protobuf/proto"
)

// protoJSONCodec overrides the default "json" codec so that proto.Message
// values are marshaled with protojson (enums as strings, camelCase fields)
// while plain Go structs fall back to encoding/json.
type protoJSONCodec struct{}

var protoJSONMarshaler = protojson.MarshalOptions{
	EmitUnpopulated: false,
	UseProtoNames:   false, // camelCase field names
}

var protoJSONUnmarshaler = protojson.UnmarshalOptions{
	DiscardUnknown: true,
}

func (protoJSONCodec) Marshal(v any) ([]byte, error) {
	if m, ok := v.(proto.Message); ok {
		return protoJSONMarshaler.Marshal(m)
	}
	return json.Marshal(v)
}

func (protoJSONCodec) Unmarshal(data []byte, v any) error {
	if m, ok := v.(proto.Message); ok {
		return protoJSONUnmarshaler.Unmarshal(data, m)
	}
	return json.Unmarshal(data, v)
}

func (protoJSONCodec) Name() string { return "json" }

func init() {
	kratosencoding.RegisterCodec(protoJSONCodec{})
}
