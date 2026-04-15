package rtc

import (
	"context"
	"encoding/json"
	stdlog "log"
	"time"
)

func SetAndWatchInt(ctx context.Context, c RealtimeConfig, key Key, callback func(v int)) error {
	return setAndWatchValue(ctx, c, key, callback, Value.Int)
}

func SetAndWatchUint64(ctx context.Context, c RealtimeConfig, key Key, callback func(v uint64)) error {
	return setAndWatchValue(ctx, c, key, callback, Value.Uint64)
}

func SetAndWatchInt64(ctx context.Context, c RealtimeConfig, key Key, callback func(v int64)) error {
	return setAndWatchValue(ctx, c, key, callback, Value.Int64)
}

func SetAndWatchBool(ctx context.Context, c RealtimeConfig, key Key, callback func(v bool)) error {
	return setAndWatchValue(ctx, c, key, callback, Value.Bool)
}

func SetAndWatchString(ctx context.Context, c RealtimeConfig, key Key, callback func(v string)) error {
	return setAndWatchValue(ctx, c, key, callback, Value.String)
}

func SetAndWatchFloat64(ctx context.Context, c RealtimeConfig, key Key, callback func(v float64)) error {
	return setAndWatchValue(ctx, c, key, callback, Value.Float64)
}

func SetAndWatchDuration(ctx context.Context, c RealtimeConfig, key Key, callback func(v time.Duration)) error {
	return setAndWatchValue(ctx, c, key, callback, Value.Duration)
}

func SetAndWatch[T any](ctx context.Context, c RealtimeConfig, key Key, callback func(v T)) error {
	return SetAndWatchString(ctx, c, key, func(value string) {
		var parsed T
		if err := json.Unmarshal([]byte(value), &parsed); err != nil {
			stdlog.Printf("rtc: failed to unmarshal key %q value %q: %v", key, value, err)
			return
		}
		callback(parsed)
	})
}

func setAndWatchValue[T any](ctx context.Context, c RealtimeConfig, key Key, callback func(v T), convert func(Value) T) error {
	callback(convert(c.GetValue(ctx, key)))
	return c.WatchValue(ctx, key, func(_, newVariable Variable) {
		callback(convert(newVariable.Value()))
	})
}
