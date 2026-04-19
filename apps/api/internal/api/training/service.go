package training

import (
	"context"
	"fmt"
	"sort"
	"strings"

	"github.com/google/uuid"
	"google.golang.org/grpc"

	"api/internal/app/solutionreview"
	"api/internal/app/taskjudge"
	codeeditordomain "api/internal/domain/codeeditor"
	"api/internal/model"
	"api/internal/policy"
	"api/internal/sandbox"
	v1 "api/pkg/api/training/v1"
)

type ProfileProgressRepository interface {
	GetProfileProgress(ctx context.Context, userID uuid.UUID) (*model.ProfileProgress, error)
}

type CodeEditorService interface {
	ListTasks(ctx context.Context, filter codeeditordomain.TaskFilter) ([]*codeeditordomain.Task, error)
	ListSolvedTasks(ctx context.Context, userID uuid.UUID) ([]*codeeditordomain.Task, error)
}

type ReviewService interface {
	StartReview(ctx context.Context, input solutionreview.ReviewInput) (uuid.UUID, error)
	GetReview(ctx context.Context, submissionID uuid.UUID) (*model.SolutionReview, error)
}

type Sandbox interface {
	Execute(ctx context.Context, req sandbox.ExecutionRequest) (sandbox.ExecutionResult, error)
}

// SeasonPassAwarder credits XP to an active Season Pass when a training
// task is solved. Optional — nil means no XP is awarded.
type SeasonPassAwarder interface {
	AddXP(ctx context.Context, userID uuid.UUID, delta int32) error
}

// trainingTaskSolvedXP is awarded the first time a solution passes.
// Re-submissions after that do not stack — tier-uplift should come from
// breadth of practice, not from re-running the same task.
const trainingTaskSolvedXP = int32(80)

type TaskView struct {
	ModuleID     string
	TaskID       string
	Title        string
	Topic        string
	Difficulty   v1.TrainingTaskDifficulty
	Statement    string
	Examples     []*v1.TrainingTaskExample
	Constraints  []string
	StarterCodes []*v1.TrainingStarterCode
	VisibleTests []*v1.TrainingTestCase
	Hints        []string
	RewardLabels []string
	SourceTaskID uuid.UUID
	SourceTask   *codeeditordomain.Task
}

type EvaluationResult struct {
	TestResults  []*v1.TrainingTestResult
	Accepted     bool
	Error        string
	PassedCount  int32
	TotalCount   int32
	SubmissionID string
	RewardLabels []string
}

//go:generate mockery --case underscore --name Service --with-expecter --output mocks
type Service interface {
	GetSkillTree(ctx context.Context, userID uuid.UUID) (*v1.GetSkillTreeResponse, error)
	GetTask(ctx context.Context, userID uuid.UUID, moduleID string) (*TaskView, error)
	EvaluateTaskSolution(ctx context.Context, userID uuid.UUID, moduleID string, language v1.TrainingProgrammingLanguage, code string, mode v1.TrainingEvaluationMode) (*EvaluationResult, error)
}

type liveService struct {
	profiles   ProfileProgressRepository
	codeEditor CodeEditorService
	sandbox    Sandbox
	reviews    ReviewService
	seasonPass SeasonPassAwarder
}

// Implementation of training service.
type Implementation struct {
	v1.UnimplementedTrainingServiceServer
	service Service
}

func NewService(
	profiles ProfileProgressRepository,
	codeEditor CodeEditorService,
	executor Sandbox,
	reviews ReviewService,
	seasonPass SeasonPassAwarder,
) Service {
	return &liveService{
		profiles:   profiles,
		codeEditor: codeEditor,
		sandbox:    executor,
		reviews:    reviews,
		seasonPass: seasonPass,
	}
}

// New returns new instance of Implementation.
func New(service Service) *Implementation {
	return &Implementation{service: service}
}

// GetDescription returns grpc service description.
func (i *Implementation) GetDescription() grpc.ServiceDesc {
	return v1.TrainingService_ServiceDesc
}

func (s *liveService) GetSkillTree(ctx context.Context, userID uuid.UUID) (*v1.GetSkillTreeResponse, error) {
	progress, _ := s.profiles.GetProfileProgress(ctx, userID)
	tasks, err := s.codeEditor.ListTasks(ctx, codeeditordomain.TaskFilter{})
	if err != nil {
		return nil, fmt.Errorf("list tasks: %w", err)
	}
	solvedTasks, err := s.codeEditor.ListSolvedTasks(ctx, userID)
	if err != nil {
		solvedTasks = nil
	}
	return buildSkillTree(progress, tasks, solvedTasks), nil
}

func (s *liveService) GetTask(ctx context.Context, userID uuid.UUID, moduleID string) (*TaskView, error) {
	task, node := s.resolveTaskForModule(ctx, userID, moduleID)
	if task == nil || node == nil {
		//nolint:nilnil // No task for the module is represented as an empty view.
		return nil, nil
	}
	return buildTaskView(node, task), nil
}

func (s *liveService) EvaluateTaskSolution(ctx context.Context, userID uuid.UUID, moduleID string, language v1.TrainingProgrammingLanguage, code string, mode v1.TrainingEvaluationMode) (*EvaluationResult, error) {
	task, node := s.resolveTaskForModule(ctx, userID, moduleID)
	if task == nil || node == nil {
		//nolint:nilnil // No task for the module is represented as an empty evaluation.
		return nil, nil
	}

	result := &EvaluationResult{
		RewardLabels: rewardLabelsForNode(node, int32(len(task.PublicTestCases)+len(task.HiddenTestCases))),
	}

	selectedLanguage, overrideLanguage := mapProgrammingLanguage(language, task.Language)
	if selectedLanguage == policy.Language("") {
		selectedLanguage = policy.LanguageForProgrammingLanguage(task.Language)
	}

	if mode == v1.TrainingEvaluationMode_TRAINING_EVALUATION_MODE_RUN_VISIBLE {
		testCases := append([]*model.CodeTestCase(nil), task.PublicTestCases...)
		testResults, passedCount, totalCount, accepted, errText := s.evaluateCases(ctx, task, testCases, code, selectedLanguage, overrideLanguage)
		result.TestResults = testResults
		result.PassedCount = passedCount
		result.TotalCount = totalCount
		result.Accepted = accepted
		result.Error = errText
		return result, nil
	}

	judgeResult, err := taskjudge.EvaluateCodeTask(ctx, s.sandbox, task, code, overrideLanguage)
	if err != nil {
		result.Error = err.Error()
		//nolint:nilerr // Judge failures are returned in the training response, not as transport errors.
		return result, nil
	}

	allCases := append([]*model.CodeTestCase(nil), task.PublicTestCases...)
	allCases = append(allCases, task.HiddenTestCases...)
	testResults := expandJudgeResult(allCases, judgeResult)
	result.TestResults = testResults
	result.Accepted = judgeResult.Passed
	result.Error = judgeResult.LastError
	result.PassedCount = judgeResult.PassedCount
	result.TotalCount = judgeResult.TotalCount

	submissionID := uuid.New()
	result.SubmissionID = submissionID.String()

	// Credit the active Season Pass on every accepted solution. We rely
	// on the domain-level AddXP to no-op when no pass is active or the
	// user has no current progress row.
	if result.Accepted && s.seasonPass != nil {
		_ = s.seasonPass.AddXP(ctx, userID, trainingTaskSolvedXP)
	}

	if s.reviews != nil {
		_, _ = s.reviews.StartReview(ctx, solutionreview.ReviewInput{
			SubmissionID:     submissionID,
			UserID:           userID,
			TaskID:           task.ID,
			SourceType:       model.ReviewSourcePractice,
			Code:             code,
			Language:         overrideLanguage,
			IsCorrect:        judgeResult.Passed,
			SolveTimeMs:      judgeResult.RuntimeMs,
			PassedCount:      judgeResult.PassedCount,
			TotalCount:       judgeResult.TotalCount,
			TaskTitle:        task.Title,
			TaskStatement:    task.Statement,
			TaskDifficulty:   task.Difficulty.String(),
			TaskPattern:      strings.Join(task.Topics, ", "),
			TaskOptimalTime:  "",
			TaskOptimalSpace: "",
		})
	}

	return result, nil
}

func (s *liveService) resolveTaskForModule(ctx context.Context, userID uuid.UUID, moduleID string) (*codeeditordomain.Task, *nodeDefinition) {
	node := findNodeDefinition(moduleID)
	if node == nil {
		node = findNodeDefinition("graph-dfs")
	}
	if node == nil {
		return nil, nil
	}

	allTasks, err := s.codeEditor.ListTasks(ctx, codeeditordomain.TaskFilter{})
	if err != nil {
		return nil, node
	}
	solvedTasks, err := s.codeEditor.ListSolvedTasks(ctx, userID)
	if err != nil {
		solvedTasks = nil
	}

	solvedSet := make(map[uuid.UUID]struct{}, len(solvedTasks))
	for _, task := range solvedTasks {
		if task != nil {
			solvedSet[task.ID] = struct{}{}
		}
	}

	candidates := make([]*codeeditordomain.Task, 0)
	for _, task := range allTasks {
		if task == nil {
			continue
		}
		for _, matchedNodeID := range matchTaskNodes(task) {
			if matchedNodeID == node.ID {
				candidates = append(candidates, task)
				break
			}
		}
	}
	sort.SliceStable(candidates, func(i, j int) bool {
		if candidates[i].Difficulty != candidates[j].Difficulty {
			return difficultyRank(candidates[i].Difficulty) < difficultyRank(candidates[j].Difficulty)
		}
		return candidates[i].Title < candidates[j].Title
	})
	for _, candidate := range candidates {
		if _, ok := solvedSet[candidate.ID]; !ok {
			return candidate, node
		}
	}
	if len(candidates) > 0 {
		return candidates[0], node
	}
	return nil, node
}

func (s *liveService) evaluateCases(ctx context.Context, task *codeeditordomain.Task, testCases []*model.CodeTestCase, code string, _ policy.Language, overrideLanguage string) ([]*v1.TrainingTestResult, int32, int32, bool, string) {
	results := make([]*v1.TrainingTestResult, 0, len(testCases))
	passedCount := int32(0)
	for _, testCase := range testCases {
		if testCase == nil {
			continue
		}
		judgeTask := *task
		judgeTask.PublicTestCases = []*model.CodeTestCase{testCase}
		judgeTask.HiddenTestCases = nil

		started := taskjudge.Result{}
		runResult, err := taskjudge.EvaluateCodeTask(ctx, s.sandbox, &judgeTask, code, overrideLanguage)
		if err != nil {
			started.LastError = err.Error()
			runResult = started
		}

		status := v1.TrainingTestStatus_TRAINING_TEST_STATUS_FAIL
		actual := runResult.LastOutput
		if runResult.Passed {
			status = v1.TrainingTestStatus_TRAINING_TEST_STATUS_PASS
			passedCount++
		} else if actual == "" && runResult.LastError != "" {
			actual = runResult.LastError
		}

		results = append(results, &v1.TrainingTestResult{
			Id:        testCase.ID.String(),
			Input:     testCase.Input,
			Expected:  testCase.ExpectedOutput,
			Hidden:    false,
			Status:    status,
			RuntimeMs: runResult.RuntimeMs,
			Actual:    actual,
		})
	}

	totalCount := int32(len(results))
	return results, passedCount, totalCount, totalCount > 0 && passedCount == totalCount, ""
}

func difficultyRank(value model.TaskDifficulty) int {
	switch value {
	case model.TaskDifficultyEasy:
		return 1
	case model.TaskDifficultyMedium:
		return 2
	case model.TaskDifficultyHard:
		return 3
	default:
		return 99
	}
}
