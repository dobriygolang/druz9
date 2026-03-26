package logger

import (
	"context"
	"fmt"
	"strings"

	"github.com/go-kratos/kratos/v2/log"
	"go.uber.org/zap"
)

type Logger struct {
	*zap.Logger
}

func New() (*Logger, error) {
	cfg := zap.NewProductionConfig()
	cfg.OutputPaths = []string{"stdout"}
	base, err := cfg.Build()
	if err != nil {
		return nil, err
	}
	return &Logger{Logger: base}, nil
}

func (l *Logger) FatalKV(_ context.Context, msg string, fields ...zap.Field) {
	l.Logger.Fatal(msg, fields...)
}

func (l *Logger) Sync() error {
	return l.Logger.Sync()
}

// Log implements Kratos log.Logger interface
func (l *Logger) Log(level log.Level, keyvals ...interface{}) error {
	if len(keyvals) == 0 || len(keyvals)%2 != 0 {
		l.Logger.Warn(fmt.Sprint("Keyvalues must appear in pairs: ", keyvals))
		return nil
	}

	var zapFields []zap.Field
	var msg string
	for i := 0; i < len(keyvals); i += 2 {
		key, ok := keyvals[i].(string)
		if !ok {
			continue
		}
		if key == log.DefaultMessageKey {
			msg = fmt.Sprint(keyvals[i+1])
			continue
		}
		zapFields = append(zapFields, zap.Any(key, sanitizeValue(key, keyvals[i+1])))
	}

	switch level {
	case log.LevelDebug:
		l.Logger.Debug(msg, zapFields...)
	case log.LevelInfo:
		l.Logger.Info(msg, zapFields...)
	case log.LevelWarn:
		l.Logger.Warn(msg, zapFields...)
	case log.LevelError:
		l.Logger.Error(msg, zapFields...)
	case log.LevelFatal:
		l.Logger.Fatal(msg, zapFields...)
	default:
		l.Logger.Info(msg, zapFields...)
	}
	return nil
}

func sanitizeValue(key string, value any) any {
	switch v := value.(type) {
	case []byte:
		return fmt.Sprintf("<bytes %s>", formatBytes(len(v)))
	case string:
		if key == "args" {
			return sanitizeArgsString(v)
		}
		return v
	default:
		if key != "args" {
			return value
		}
		return sanitizeArgsString(fmt.Sprint(value))
	}
}

func sanitizeArgsString(value string) string {
	if value == "" {
		return value
	}

	if looksBinary(value) {
		return fmt.Sprintf("<omitted binary payload; %s>", formatBytes(len(value)))
	}

	const maxLen = 512
	if len(value) <= maxLen {
		return value
	}

	return fmt.Sprintf("%s... <truncated %s>", value[:maxLen], formatBytes(len(value)-maxLen))
}

func looksBinary(value string) bool {
	if strings.Contains(value, `\x`) || strings.Contains(value, `\\x`) {
		return true
	}
	return strings.Count(value, `\`) > 24 && len(value) > 256
}

func formatBytes(size int) string {
	const unit = 1024
	if size < unit {
		return fmt.Sprintf("%dB", size)
	}

	value := float64(size)
	suffixes := []string{"KB", "MB", "GB", "TB"}
	for _, suffix := range suffixes {
		value /= unit
		if value < unit {
			return fmt.Sprintf("%.1f%s", value, suffix)
		}
	}
	return fmt.Sprintf("%.1fPB", value/unit)
}
