package rtc

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"sync"

	"github.com/fsnotify/fsnotify"
	"github.com/go-kratos/kratos/v2/log"
	"gopkg.in/yaml.v3"
)

// VariableChangeCallback is invoked on variable change.
type VariableChangeCallback func(oldVariable, newVariable Variable)

// RealtimeConfig defines runtime config provider interface.
type RealtimeConfig interface {
	GetValue(context.Context, Key) Value
	WatchValue(context.Context, Key, VariableChangeCallback) error
	SetValue(context.Context, Key, string) error
	ListVariables(context.Context) map[Key]Variable
}

type Manager struct {
	path      string
	log       *log.Helper
	watcher   *fsnotify.Watcher
	done      chan struct{}
	mu        sync.RWMutex
	variables map[Key]Variable
	callbacks map[Key][]VariableChangeCallback
}

func NewManager(path string, logger log.Logger) (*Manager, func(), error) {
	var err error
	manager := &Manager{
		path:      path,
		log:       log.NewHelper(logger),
		done:      make(chan struct{}),
		variables: make(map[Key]Variable),
		callbacks: make(map[Key][]VariableChangeCallback),
	}

	if err = manager.reload(); err != nil {
		return nil, nil, err
	}

	manager.watcher, err = fsnotify.NewWatcher()
	if err != nil {
		return nil, nil, err
	}

	dir := filepath.Dir(path)
	if err = manager.watcher.Add(dir); err != nil {
		_ = manager.watcher.Close()
		return nil, nil, err
	}

	go manager.watchLoop(filepath.Base(path))

	cleanup := func() {
		close(manager.done)
		_ = manager.watcher.Close()
	}

	return manager, cleanup, nil
}

func (m *Manager) GetValue(_ context.Context, key Key) Value {
	m.mu.RLock()
	defer m.mu.RUnlock()

	variable, ok := m.variables[key]
	if !ok {
		return Value{}
	}

	return variable.Value()
}

func (m *Manager) WatchValue(_ context.Context, key Key, callback VariableChangeCallback) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	m.callbacks[key] = append(m.callbacks[key], callback)
	return nil
}

// SetValue updates a config variable value in memory and triggers callbacks.
func (m *Manager) SetValue(_ context.Context, key Key, value string) error {
	m.mu.Lock()

	oldVariable, exists := m.variables[key]
	if !exists {
		m.mu.Unlock()
		return fmt.Errorf("config key not found: %s", key)
	}

	if !oldVariable.Writable {
		m.mu.Unlock()
		return fmt.Errorf("config key is not writable: %s", key)
	}

	newVariable := Variable{
		Key: key,
		Definition: Definition{
			Usage:    oldVariable.Usage,
			Group:    oldVariable.Group,
			Value:    value,
			Type:     oldVariable.Type,
			Writable: oldVariable.Writable,
		},
	}

	m.variables[key] = newVariable

	// Copy callbacks and release the lock before invoking them to avoid
	// deadlocks if a callback calls back into the Manager (e.g. GetValue).
	callbacks := append([]VariableChangeCallback(nil), m.callbacks[key]...)
	m.mu.Unlock()

	for _, callback := range callbacks {
		callback(oldVariable, newVariable)
	}

	m.log.Infof("config updated: %s = %s", key, value)
	return nil
}

// ListVariables returns all config variables.
func (m *Manager) ListVariables(_ context.Context) map[Key]Variable {
	m.mu.RLock()
	defer m.mu.RUnlock()

	result := make(map[Key]Variable, len(m.variables))
	for k, v := range m.variables {
		result[k] = v
	}
	return result
}

func (m *Manager) watchLoop(fileName string) {
	for {
		select {
		case <-m.done:
			return
		case event, ok := <-m.watcher.Events:
			if !ok {
				return
			}
			if filepath.Base(event.Name) != fileName {
				continue
			}
			if event.Op&(fsnotify.Write|fsnotify.Create|fsnotify.Rename) == 0 {
				continue
			}
			if err := m.reload(); err != nil {
				m.log.Errorf("reload realtime config: %v", err)
			}
		case err, ok := <-m.watcher.Errors:
			if !ok {
				return
			}
			m.log.Errorf("watch realtime config: %v", err)
		}
	}
}

func (m *Manager) reload() error {
	definitions, err := readDefinitions(m.path)
	if err != nil {
		return err
	}

	updated := make(map[Key]Variable, len(definitions))
	for key, definition := range definitions {
		updated[key] = variableFromDefinition(key, definition)
	}

	var changes []struct {
		oldVariable Variable
		newVariable Variable
		callbacks   []VariableChangeCallback
	}

	m.mu.Lock()
	for key, newVariable := range updated {
		oldVariable, ok := m.variables[key]
		if ok && oldVariable.Definition == newVariable.Definition {
			continue
		}

		callbacks := append([]VariableChangeCallback(nil), m.callbacks[key]...)
		changes = append(changes, struct {
			oldVariable Variable
			newVariable Variable
			callbacks   []VariableChangeCallback
		}{
			oldVariable: oldVariable,
			newVariable: newVariable,
			callbacks:   callbacks,
		})
	}
	m.variables = updated
	m.mu.Unlock()

	for _, change := range changes {
		for _, callback := range change.callbacks {
			callback(change.oldVariable, change.newVariable)
		}
	}

	m.log.Infof("realtime config loaded from %s", m.path)
	return nil
}

func readDefinitions(path string) (map[Key]Definition, error) {
	content, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("read realtime values: %w", err)
	}

	raw := make(map[string]Definition)
	if err := yaml.Unmarshal(content, &raw); err != nil {
		return nil, fmt.Errorf("unmarshal realtime values: %w", err)
	}

	definitions := make(map[Key]Definition, len(raw))
	for key, definition := range raw {
		definitions[Key(key)] = definition
	}

	return definitions, nil
}
