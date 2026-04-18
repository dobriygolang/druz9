package seeds

import (
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"gopkg.in/yaml.v3"
)

var (
	errUnsupportedCatalogFormat = errors.New("unsupported catalog format")
	errCatalogMissingVersion    = errors.New("catalog must define version")
	errCatalogMissingTasks      = errors.New("catalog must contain tasks")
)

func loadCatalog(path string) (TaskCatalog, []byte, error) {
	content, err := os.ReadFile(path)
	if err != nil {
		return TaskCatalog{}, nil, fmt.Errorf("read catalog %s: %w", path, err)
	}

	var catalog TaskCatalog
	switch strings.ToLower(filepath.Ext(path)) {
	case ".json":
		if err := json.Unmarshal(content, &catalog); err != nil {
			return TaskCatalog{}, nil, fmt.Errorf("unmarshal json catalog %s: %w", path, err)
		}
	case ".yaml", ".yml":
		if err := yaml.Unmarshal(content, &catalog); err != nil {
			return TaskCatalog{}, nil, fmt.Errorf("unmarshal yaml catalog %s: %w", path, err)
		}
	default:
		return TaskCatalog{}, nil, fmt.Errorf("%w: %s", errUnsupportedCatalogFormat, path)
	}

	if strings.TrimSpace(catalog.Version) == "" {
		return TaskCatalog{}, nil, fmt.Errorf("%w: %s", errCatalogMissingVersion, path)
	}
	if len(catalog.Tasks) == 0 {
		return TaskCatalog{}, nil, fmt.Errorf("%w: %s", errCatalogMissingTasks, path)
	}
	return catalog, content, nil
}
