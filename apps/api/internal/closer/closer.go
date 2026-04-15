package closer

import (
	"context"
	"os"
	"os/signal"
	"slices"
	"sync"
	"syscall"
	"time"

	klog "github.com/go-kratos/kratos/v2/log"
)

const perFuncTimeout = 5 * time.Second

var (
	mu         sync.Mutex
	funcs      []func() error
	closeOnce  sync.Once
	signalOnce sync.Once
)

func AddSync(fn func() error) {
	if fn == nil {
		return
	}

	signalOnce.Do(func() {
		signals := make(chan os.Signal, 1)
		signal.Notify(signals, syscall.SIGINT, syscall.SIGTERM)
		go func() {
			<-signals
			Close()
		}()
	})

	mu.Lock()
	defer mu.Unlock()
	funcs = append(funcs, fn)
}

func Close() {
	closeOnce.Do(func() {
		mu.Lock()
		snapshot := make([]func() error, len(funcs))
		copy(snapshot, funcs)
		mu.Unlock()

		slices.Reverse(snapshot)
		for _, fn := range snapshot {
			ctx, cancel := context.WithTimeout(context.Background(), perFuncTimeout)
			done := make(chan struct{})
			go func() {
				if err := fn(); err != nil {
					klog.Errorf("closer: %v", err)
				}
				close(done)
			}()
			select {
			case <-done:
			case <-ctx.Done():
				klog.Warnf("closer: function timed out after %v", perFuncTimeout)
			}
			cancel()
		}
	})
}
