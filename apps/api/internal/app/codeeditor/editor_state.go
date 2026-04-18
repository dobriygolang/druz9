package codeeditor

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/google/uuid"

	domain "api/internal/domain/codeeditor"
	"api/internal/model"
)

func normalizeRoomLanguage(language model.ProgrammingLanguage) model.ProgrammingLanguage {
	switch language {
	case model.ProgrammingLanguagePython:
		return model.ProgrammingLanguagePython
	case model.ProgrammingLanguageSQL:
		return model.ProgrammingLanguageSQL
	case model.ProgrammingLanguageGo:
		fallthrough
	default:
		return model.ProgrammingLanguageGo
	}
}

func roomEditorActorKey(userID *uuid.UUID, guestName string) string {
	if userID != nil {
		return "user:" + userID.String()
	}
	normalizedGuest := strings.ToLower(strings.TrimSpace(guestName))
	if normalizedGuest == "" {
		return ""
	}
	return "guest:" + normalizedGuest
}

func cloneRoom(room *domain.Room) *domain.Room {
	if room == nil {
		return nil
	}
	cloned := *room
	if len(room.Participants) > 0 {
		cloned.Participants = append([]*domain.Participant(nil), room.Participants...)
	}
	return &cloned
}

func shouldHideDuelTask(room *domain.Room) bool {
	if room == nil || room.Mode != model.RoomModeDuel {
		return false
	}
	return len(room.Participants) < 2
}

func defaultRoomLanguage(room *domain.Room, task *domain.Task) model.ProgrammingLanguage {
	if room != nil && room.Language != model.ProgrammingLanguageUnknown {
		return normalizeRoomLanguage(room.Language)
	}
	if task != nil {
		return normalizeRoomLanguage(task.Language)
	}
	return model.ProgrammingLanguageGo
}

func defaultSharedRoomStarter(language model.ProgrammingLanguage) string {
	switch normalizeRoomLanguage(language) {
	case model.ProgrammingLanguagePython:
		return `def main() -> None:
    print("Hello, World!")


if __name__ == "__main__":
    main()
`
	case model.ProgrammingLanguageSQL:
		return "-- Write SQL here\nSELECT 1;\n"
	default:
		return defaultCode()
	}
}

func defaultDuelStarter(task *domain.Task, language model.ProgrammingLanguage) string {
	if task == nil {
		return defaultSharedRoomStarter(language)
	}
	switch normalizeRoomLanguage(language) {
	case model.ProgrammingLanguagePython:
		if task.RunnerMode == model.RunnerModeFunctionIO {
			return extractPythonSolveStarter(task.StarterCode)
		}
		return `def main() -> None:
    print("")


if __name__ == "__main__":
    main()
`
	case model.ProgrammingLanguageSQL:
		if strings.TrimSpace(task.StarterCode) != "" && normalizeRoomLanguage(task.Language) == model.ProgrammingLanguageSQL {
			return task.StarterCode
		}
		return "-- Write SQL here\nSELECT 1;\n"
	default:
		if task.RunnerMode == model.RunnerModeFunctionIO {
			return extractGoSolveStarter(task.StarterCode)
		}
		if trimmed := strings.TrimSpace(task.StarterCode); trimmed != "" {
			return task.StarterCode
		}
		return defaultCode()
	}
}

func defaultEditorStarter(room *domain.Room, task *domain.Task, language model.ProgrammingLanguage) string {
	if room != nil && room.Mode == model.RoomModeDuel {
		return defaultDuelStarter(task, language)
	}
	return defaultSharedRoomStarter(language)
}

func shouldReplaceStarterCode(currentCode string, room *domain.Room, task *domain.Task, currentLanguage, nextLanguage model.ProgrammingLanguage) bool {
	trimmedCurrent := strings.TrimSpace(currentCode)
	if trimmedCurrent == "" {
		return true
	}
	currentStarter := strings.TrimSpace(defaultEditorStarter(room, task, currentLanguage))
	if currentStarter == "" {
		return false
	}
	return trimmedCurrent == currentStarter
}

func extractGoSolveStarter(code string) string {
	trimmed := strings.TrimSpace(code)
	if trimmed == "" {
		return "func solve(input string) string {\n\treturn \"\"\n}\n"
	}
	index := strings.Index(trimmed, "func solve(")
	if index < 0 {
		return "func solve(input string) string {\n\treturn \"\"\n}\n"
	}
	snippet := strings.TrimSpace(trimmed[index:])
	if mainIndex := strings.Index(snippet, "\nfunc main("); mainIndex >= 0 {
		snippet = strings.TrimSpace(snippet[:mainIndex])
	}
	if !strings.HasSuffix(snippet, "\n") {
		snippet += "\n"
	}
	return snippet
}

func extractPythonSolveStarter(code string) string {
	trimmed := strings.TrimSpace(code)
	if trimmed == "" {
		return "def solve(input: str) -> str:\n    return \"\"\n"
	}
	index := strings.Index(trimmed, "def solve(")
	if index < 0 {
		return "def solve(input: str) -> str:\n    return \"\"\n"
	}
	snippet := strings.TrimSpace(trimmed[index:])
	if !strings.HasSuffix(snippet, "\n") {
		snippet += "\n"
	}
	return snippet
}

func (s *Service) getCachedTask(ctx context.Context, taskID uuid.UUID) (*domain.Task, error) {
	if cached, ok := s.taskCache.Get(taskID.String()); ok {
		taskCopy := cached
		return &taskCopy, nil
	}
	task, err := s.repo.GetTask(ctx, taskID)
	if err != nil {
		return nil, fmt.Errorf("get task: %w", err)
	}
	if task != nil {
		s.taskCache.Set(taskID.String(), *task)
	}
	return task, nil
}

func (s *Service) getRoomTask(ctx context.Context, room *domain.Room) (*domain.Task, error) {
	if room == nil || room.TaskID == nil {
		return nil, nil
	}
	return s.getCachedTask(ctx, *room.TaskID)
}

func (s *Service) GetEditorState(ctx context.Context, roomID uuid.UUID, userID *uuid.UUID, guestName string) (*domain.RoomEditorState, error) {
	room, err := s.GetRoom(ctx, roomID)
	if err != nil {
		return nil, fmt.Errorf("get room: %w", err)
	}

	task, err := s.getRoomTask(ctx, room)
	if err != nil {
		return nil, fmt.Errorf("get room task: %w", err)
	}

	if room.Mode != model.RoomModeDuel {
		return &domain.RoomEditorState{
			Code:     room.Code,
			Language: defaultRoomLanguage(room, task),
		}, nil
	}

	actorKey := roomEditorActorKey(userID, guestName)
	if actorKey == "" {
		return nil, domain.ErrForbidden
	}

	storedState, err := s.repo.GetDuelEditorState(ctx, roomID, actorKey)
	if errors.Is(err, domain.ErrDuelStateNotFound) {
		storedState = nil
	} else if err != nil {
		return nil, fmt.Errorf("get duel editor state: %w", err)
	}
	if storedState == nil {
		initialState := &domain.RoomEditorState{
			Code:     defaultEditorStarter(room, task, defaultRoomLanguage(room, task)),
			Language: defaultRoomLanguage(room, task),
		}
		if err := s.repo.SaveDuelEditorState(ctx, roomID, actorKey, initialState.Code, initialState.Language); err != nil {
			return nil, fmt.Errorf("save duel editor state: %w", err)
		}
		return initialState, nil
	}

	return &domain.RoomEditorState{
		Code:     storedState.Code,
		Language: normalizeRoomLanguage(storedState.Language),
	}, nil
}

func (s *Service) SaveEditorState(ctx context.Context, roomID uuid.UUID, userID *uuid.UUID, guestName, code string, language model.ProgrammingLanguage) error {
	room, err := s.GetRoom(ctx, roomID)
	if err != nil {
		return fmt.Errorf("get room: %w", err)
	}

	task, err := s.getRoomTask(ctx, room)
	if err != nil {
		return fmt.Errorf("get room task: %w", err)
	}

	selectedLanguage := normalizeRoomLanguage(language)
	if language == model.ProgrammingLanguageUnknown {
		selectedLanguage = defaultRoomLanguage(room, task)
	}

	if room.Mode != model.RoomModeDuel {
		if err := s.repo.SaveCodeSnapshot(ctx, roomID, code, selectedLanguage); err != nil {
			return fmt.Errorf("save code snapshot: %w", err)
		}
		return nil
	}

	actorKey := roomEditorActorKey(userID, guestName)
	if actorKey == "" {
		return domain.ErrForbidden
	}
	if err := s.repo.SaveDuelEditorState(ctx, roomID, actorKey, code, selectedLanguage); err != nil {
		return fmt.Errorf("save duel editor state: %w", err)
	}
	return nil
}

func (s *Service) SetEditorLanguage(ctx context.Context, roomID uuid.UUID, userID *uuid.UUID, guestName string, language model.ProgrammingLanguage) (*domain.RoomEditorState, error) {
	room, err := s.GetRoom(ctx, roomID)
	if err != nil {
		return nil, fmt.Errorf("get room: %w", err)
	}

	task, err := s.getRoomTask(ctx, room)
	if err != nil {
		return nil, fmt.Errorf("get room task: %w", err)
	}

	nextLanguage := normalizeRoomLanguage(language)
	currentState, err := s.GetEditorState(ctx, roomID, userID, guestName)
	if err != nil {
		return nil, fmt.Errorf("get editor state: %w", err)
	}

	nextCode := currentState.Code
	if shouldReplaceStarterCode(currentState.Code, room, task, currentState.Language, nextLanguage) {
		nextCode = defaultEditorStarter(room, task, nextLanguage)
	}

	if err := s.SaveEditorState(ctx, roomID, userID, guestName, nextCode, nextLanguage); err != nil {
		return nil, fmt.Errorf("save editor state: %w", err)
	}

	return &domain.RoomEditorState{
		Code:     nextCode,
		Language: nextLanguage,
	}, nil
}

func (s *Service) GetRoomForActor(ctx context.Context, roomID uuid.UUID, userID *uuid.UUID, guestName string) (*domain.Room, error) {
	room, err := s.GetRoom(ctx, roomID)
	if err != nil {
		return nil, fmt.Errorf("get room: %w", err)
	}
	state, err := s.GetEditorState(ctx, roomID, userID, guestName)
	if err != nil {
		return nil, fmt.Errorf("get editor state: %w", err)
	}
	cloned := cloneRoom(room)
	if state != nil {
		cloned.Code = state.Code
		cloned.Language = state.Language
	}
	if shouldHideDuelTask(cloned) {
		cloned.Task = ""
		cloned.TaskID = nil
	}
	return cloned, nil
}
