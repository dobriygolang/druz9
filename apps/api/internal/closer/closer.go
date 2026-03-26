package closer

import (
	"os"
	"os/signal"
	"slices"
	"sync"
	"syscall"
)

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
		defer mu.Unlock()

		slices.Reverse(funcs)
		for _, fn := range funcs {
			_ = fn()
		}
	})
}
