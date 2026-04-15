package seeds

// TaskCatalog describes the code-editor/blind75 catalog format.
type TaskCatalog struct {
	Version string        `json:"version" yaml:"version"`
	Tasks   []CatalogTask `json:"tasks" yaml:"tasks"`
}

type CatalogTask struct {
	Slug       string        `json:"slug" yaml:"slug"`
	Title      string        `json:"title" yaml:"title"`
	Difficulty string        `json:"difficulty" yaml:"difficulty"`
	Statement  string        `json:"statement" yaml:"statement"`
	Topics     []string      `json:"topics" yaml:"topics"`
	Cases      []CatalogCase `json:"cases" yaml:"cases"`
}

type CatalogCase struct {
	Input    string `json:"input" yaml:"input"`
	Output   string `json:"output" yaml:"output"`
	IsPublic bool   `json:"is_public" yaml:"is_public"`
}
