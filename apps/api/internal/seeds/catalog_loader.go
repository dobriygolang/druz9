package seeds

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"gopkg.in/yaml.v3"
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
		return TaskCatalog{}, nil, fmt.Errorf("unsupported catalog format %s", path)
	}

	if strings.TrimSpace(catalog.Version) == "" {
		return TaskCatalog{}, nil, fmt.Errorf("catalog %s must define version", path)
	}
	if len(catalog.Tasks) == 0 {
		return TaskCatalog{}, nil, fmt.Errorf("catalog %s must contain tasks", path)
	}
	return catalog, content, nil
}
