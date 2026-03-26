package logger

import (
	"context"
	"fmt"
	"os"

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

func Stdout() *os.File {
	return os.Stdout
}

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
		zapFields = append(zapFields, zap.Any(key, keyvals[i+1]))
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
