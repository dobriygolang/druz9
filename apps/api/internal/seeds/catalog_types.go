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

// InterviewPrepCatalog describes the interview prep catalog format.
// Each entry is a task with attached questions — the entire prep session unit.
type InterviewPrepCatalog struct {
	Version string                 `json:"version" yaml:"version"`
	Tasks   []InterviewPrepCatalogTask `json:"tasks" yaml:"tasks"`
}

type InterviewPrepCatalogTask struct {
	Slug              string                      `json:"slug" yaml:"slug"`
	Title             string                      `json:"title" yaml:"title"`
	PrepType          string                      `json:"prep_type" yaml:"prep_type"`
	Language          string                      `json:"language" yaml:"language"`
	IsExecutable      bool                        `json:"is_executable" yaml:"is_executable"`
	ExecutionProfile  string                      `json:"execution_profile" yaml:"execution_profile"`
	RunnerMode        string                      `json:"runner_mode" yaml:"runner_mode"`
	DurationSeconds   int32                       `json:"duration_seconds" yaml:"duration_seconds"`
	Statement         string                      `json:"statement" yaml:"statement"`
	StarterCode       string                      `json:"starter_code" yaml:"starter_code"`
	ReferenceSolution string                      `json:"reference_solution" yaml:"reference_solution"`
	IsActive          bool                        `json:"is_active" yaml:"is_active"`
	Questions         []InterviewPrepCatalogQuestion `json:"questions" yaml:"questions"`
}

type InterviewPrepCatalogQuestion struct {
	Position int32  `json:"position" yaml:"position"`
	Prompt   string `json:"prompt" yaml:"prompt"`
	Answer   string `json:"answer" yaml:"answer"`
}
