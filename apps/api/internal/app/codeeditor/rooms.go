package codeeditor

import (
	"context"
	"strings"
	"time"

	domain "api/internal/domain/codeeditor"
	"api/internal/model"
	"api/internal/policy"
	"api/internal/sandbox"

	"github.com/google/uuid"
)

func (s *Service) CreateRoom(ctx context.Context, creatorID *uuid.UUID, name string, isGuest bool, mode string, topic string, difficulty string, task string, isPrivate bool) (*domain.Room, error) {
	modeEnum := model.RoomModeFromString(mode)
	if modeEnum != model.RoomModeAll && modeEnum != model.RoomModeDuel {
		return nil, domain.ErrInvalidMode
	}

	inviteCode := generateInviteCode()
	code := defaultCode()
	var taskID *uuid.UUID
	var duelTask *domain.Task
	nowTime := now()

	if modeEnum == model.RoomModeDuel {
		pickedTask, err := s.repo.PickRandomTask(ctx, topic, difficulty)
		if err != nil {
			return nil, err
		}
		if pickedTask == nil {
			return nil, domain.ErrNoAvailableTasks
		}
		duelTask = pickedTask
		taskID = &pickedTask.ID
		code = pickedTask.StarterCode
		s.taskCache.Set(pickedTask.ID.String(), *pickedTask)
	}

	roomLanguage := defaultRoomLanguage(nil, duelTask)
	if modeEnum != model.RoomModeDuel {
		roomLanguage = model.ProgrammingLanguageGo
	}

	room := &domain.Room{
		ID:         uuid.New(),
		Mode:       modeEnum,
		Code:       code,
		Status:     model.RoomStatusWaiting,
		CreatorID:  uuid.Nil,
		InviteCode: inviteCode,
		Language:   roomLanguage,
		Task:       task,
		TaskID:     taskID,
		DuelTopic:  topic,
		IsPrivate:  isPrivate,
		CreatedAt:  nowTime,
		UpdatedAt:  nowTime,
	}

	if creatorID != nil {
		room.CreatorID = *creatorID
	}

	participant := &domain.Participant{
		UserID:   creatorID,
		Name:     name,
		IsGuest:  isGuest,
		IsReady:  false,
		IsWinner: false,
		JoinedAt: nowTime,
	}
	room.Participants = []*domain.Participant{participant}

	createdRoom, err := s.repo.CreateRoom(ctx, room)
	if err != nil {
		return nil, err
	}
	if createdRoom.Mode == model.RoomModeDuel {
		initialGuestName := ""
		if isGuest {
			initialGuestName = name
		}
		if _, err := s.SetEditorLanguage(ctx, createdRoom.ID, creatorID, initialGuestName, createdRoom.Language); err != nil {
			return nil, err
		}
		return s.GetRoomForActor(ctx, createdRoom.ID, creatorID, initialGuestName)
	}
	return createdRoom, nil
}

func (s *Service) SetRoomTask(ctx context.Context, roomID uuid.UUID, callerID *uuid.UUID, task string) error {
	room, err := s.repo.GetRoom(ctx, roomID)
	if err != nil {
		return err
	}
	if callerID == nil || room.CreatorID != *callerID {
		return domain.ErrNotRoomCreator
	}
	return s.repo.UpdateRoomTask(ctx, roomID, task)
}

func (s *Service) CloseRoom(ctx context.Context, roomID uuid.UUID, callerID *uuid.UUID) error {
	room, err := s.repo.GetRoom(ctx, roomID)
	if err != nil {
		return err
	}
	if callerID == nil || room.CreatorID != *callerID {
		return domain.ErrNotRoomCreator
	}
	return s.repo.UpdateRoomStatus(ctx, roomID, model.RoomStatusFinished)
}

func (s *Service) SetRoomTaskByString(ctx context.Context, roomIDStr string, callerID *uuid.UUID, task string) error {
	roomID, err := uuid.Parse(roomIDStr)
	if err != nil {
		return domain.ErrRoomNotFound
	}
	return s.SetRoomTask(ctx, roomID, callerID, task)
}

func (s *Service) SetRoomPrivacy(ctx context.Context, roomID uuid.UUID, callerID *uuid.UUID, isPrivate bool) error {
	room, err := s.repo.GetRoom(ctx, roomID)
	if err != nil {
		return err
	}
	if callerID == nil || room.CreatorID != *callerID {
		return domain.ErrNotRoomCreator
	}
	return s.repo.UpdateRoomPrivacy(ctx, roomID, isPrivate)
}

func (s *Service) SetRoomPrivacyByString(ctx context.Context, roomIDStr string, callerID *uuid.UUID, isPrivate bool) error {
	roomID, err := uuid.Parse(roomIDStr)
	if err != nil {
		return domain.ErrRoomNotFound
	}
	return s.SetRoomPrivacy(ctx, roomID, callerID, isPrivate)
}

func (s *Service) CloseRoomByString(ctx context.Context, roomIDStr string, callerID *uuid.UUID) error {
	roomID, err := uuid.Parse(roomIDStr)
	if err != nil {
		return domain.ErrRoomNotFound
	}
	return s.CloseRoom(ctx, roomID, callerID)
}

func (s *Service) GetRoom(ctx context.Context, roomID uuid.UUID) (*domain.Room, error) {
	room, err := s.repo.GetRoom(ctx, roomID)
	if err != nil {
		return nil, err
	}

	// Добавляем гостей из кэша в список участников
	room.Participants = s.addCachedGuestsToRoom(room.Participants, roomID)

	return room, nil
}

// addCachedGuestsToRoom добавляет гостей из кэша в список участников
func (s *Service) addCachedGuestsToRoom(participants []*domain.Participant, roomID uuid.UUID) []*domain.Participant {
	// Создаем map существующих участников для избежания дубликатов
	existingGuests := make(map[string]bool)
	for _, p := range participants {
		if p.IsGuest && p.Name != "" {
			existingGuests[strings.ToLower(strings.TrimSpace(p.Name))] = true
		}
	}

	// Добавляем гостей из кэша
	result := make([]*domain.Participant, len(participants))
	copy(result, participants)

	// Получаем все ключи из кэша и фильтруем по roomID
	keys := s.guestCache.Keys()
	for _, key := range keys {
		guest, ok := s.guestCache.Get(key)
		if !ok {
			continue
		}
		// Проверяем, относится ли гость к этой комнате
		if guest.RoomID != roomID {
			continue
		}
		// Проверяем, не добавляли ли мы уже этого гостя
		guestKey := strings.ToLower(strings.TrimSpace(guest.Name))
		if existingGuests[guestKey] {
			continue
		}
		// Добавляем гостя из кэша
		participant := &domain.Participant{
			UserID:   nil,
			Name:     guest.Name,
			IsGuest:  true,
			IsReady:  guest.IsReady,
			IsWinner: false,
			JoinedAt: guest.JoinedAt,
		}
		result = append(result, participant)
		existingGuests[guestKey] = true
	}

	return result
}

func (s *Service) JoinRoom(ctx context.Context, roomID uuid.UUID, userID *uuid.UUID, name string, isGuest bool) (*domain.Room, error) {
	room, err := s.repo.GetRoom(ctx, roomID)
	if err != nil {
		return nil, err
	}

	if room.Status == model.RoomStatusFinished {
		return nil, domain.ErrRoomAlreadyClosed
	}

	// Для гостей проверяем кэш
	if isGuest {
		key := guestRoomKey(roomID, name)
		if cachedGuest, ok := s.guestCache.Get(key); ok {
			// Гость уже в кэше - обновляем ему время (refresh TTL)
			cachedGuest.IsReady = false
			s.guestCache.Set(key, cachedGuest)
			room.Participants = s.addCachedGuestsToRoom(room.Participants, roomID)
			if room.Mode == model.RoomModeDuel {
				return s.GetRoomForActor(ctx, roomID, userID, name)
			}
			return room, nil
		}
	}

	// Проверяем существующих участников
	for _, participant := range room.Participants {
		if userID != nil && participant.UserID != nil && *participant.UserID == *userID {
			if room.Mode == model.RoomModeDuel {
				return s.GetRoomForActor(ctx, roomID, userID, name)
			}
			return room, nil
		}
		if userID == nil && participant.IsGuest && strings.EqualFold(strings.TrimSpace(participant.Name), strings.TrimSpace(name)) {
			if room.Mode == model.RoomModeDuel {
				return s.GetRoomForActor(ctx, roomID, userID, name)
			}
			return room, nil
		}
	}

	if room.Mode == domain.RoomModeDuel && len(room.Participants) >= 2 {
		return nil, domain.ErrRoomFull
	}

	nowTime := now()

	if isGuest {
		// Гости добавляются в кэш, а не в БД
		guest := GuestParticipant{
			RoomID:   roomID,
			Name:     name,
			IsGuest:  true,
			IsReady:  false,
			JoinedAt: nowTime,
		}
		s.guestCache.Set(guestRoomKey(roomID, name), guest)
	} else {
		// Авторизованные пользователи добавляются в БД
		participant := &domain.Participant{
			UserID:   userID,
			Name:     name,
			IsGuest:  isGuest,
			IsReady:  false,
			IsWinner: false,
			JoinedAt: nowTime,
		}

		room, err = s.repo.AddParticipant(ctx, roomID, participant)
		if err != nil {
			return nil, err
		}
	}

	room.Participants = s.addCachedGuestsToRoom(room.Participants, roomID)

	if room.Mode == model.RoomModeDuel && len(room.Participants) == 2 && room.Status == model.RoomStatusWaiting {
		startedAt := now()
		if err := s.repo.StartDuel(ctx, roomID, startedAt); err != nil {
			return nil, err
		}
		room.Status = model.RoomStatusActive
		room.StartedAt = &startedAt
		return s.GetRoomForActor(ctx, roomID, userID, name)
	}

	if room.Mode == model.RoomModeDuel {
		return s.GetRoomForActor(ctx, roomID, userID, name)
	}
	return room, nil
}

func (s *Service) JoinRoomByInviteCode(ctx context.Context, inviteCode string, userID *uuid.UUID, name string, isGuest bool) (*domain.Room, error) {
	room, err := s.repo.GetRoomByInviteCode(ctx, inviteCode)
	if err != nil {
		return nil, domain.ErrRoomNotFound
	}
	return s.JoinRoom(ctx, room.ID, userID, name, isGuest)
}

func (s *Service) LeaveRoom(ctx context.Context, roomID uuid.UUID, userID *uuid.UUID, guestName string) error {
	// Если это гость - удаляем из кэша
	if guestName != "" {
		s.guestCache.Delete(guestRoomKey(roomID, guestName))
		return nil
	}
	// Для авторизованных пользователей - удаляем из БД
	return s.repo.RemoveParticipant(ctx, roomID, userID, guestName)
}

func (s *Service) SubmitCode(ctx context.Context, roomID uuid.UUID, userID *uuid.UUID, guestName string, code string) (*domain.Submission, error) {
	room, err := s.repo.GetRoom(ctx, roomID)
	if err != nil {
		return nil, err
	}

	if room.Mode == model.RoomModeDuel && room.Status == model.RoomStatusFinished {
		return nil, domain.ErrRoomAlreadyClosed
	}

	editorState, err := s.GetEditorState(ctx, roomID, userID, guestName)
	if err != nil {
		return nil, err
	}
	selectedLanguage := room.Language
	if editorState != nil {
		selectedLanguage = editorState.Language
	}

	if room.Mode == domain.RoomModeDuel && room.TaskID != nil {
		return s.submitDuelCode(ctx, room, userID, guestName, code, selectedLanguage)
	}

	result, err := s.sandbox.Execute(ctx, sandbox.ExecutionRequest{
		Code:       code,
		Task:       policy.TaskSpecForCodeEditorRun(),
		Language:   policy.LanguageForProgrammingLanguage(normalizeRoomLanguage(selectedLanguage)),
		RunnerMode: model.RunnerModeProgram.String(),
	})
	if err != nil {
		submission := &domain.Submission{
			ID:          uuid.New(),
			RoomID:      roomID,
			UserID:      userID,
			GuestName:   guestName,
			Code:        code,
			Output:      "",
			Error:       err.Error(),
			SubmittedAt: now(),
			IsCorrect:   false,
		}
		return s.repo.CreateSubmission(ctx, submission)
	}

	submission := &domain.Submission{
		ID:          uuid.New(),
		RoomID:      roomID,
		UserID:      userID,
		GuestName:   guestName,
		Code:        code,
		Output:      result.Output,
		SubmittedAt: now(),
		IsCorrect:   true,
	}

	if room.Mode == domain.RoomModeDuel && len(room.Participants) == 2 {
		allReady := true
		for _, p := range room.Participants {
			if !p.IsReady {
				allReady = false
				break
			}
		}
		if allReady && room.Status == model.RoomStatusWaiting {
			_ = s.repo.UpdateRoomStatus(ctx, roomID, model.RoomStatusActive)
		}
	}

	return s.repo.CreateSubmission(ctx, submission)
}

func (s *Service) SetReady(ctx context.Context, roomID uuid.UUID, userID *uuid.UUID, guestName string, ready bool) error {
	// Для гостей обновляем кэш
	if guestName != "" {
		key := guestRoomKey(roomID, guestName)
		if guest, ok := s.guestCache.Get(key); ok {
			guest.IsReady = ready
			s.guestCache.Set(key, guest)
			return nil
		}
		return nil // Гость не найден в кэше -可能已经离开
	}
	// Для авторизованных пользователей - обновляем БД
	return s.repo.SetParticipantReady(ctx, roomID, userID, guestName, ready)
}

func (s *Service) GetSubmissions(ctx context.Context, roomID uuid.UUID) ([]*domain.Submission, error) {
	return s.repo.GetSubmissions(ctx, roomID)
}

// StartRoom transitions a ROOM_MODE_ALL room from waiting → active.
// Only the room creator may call this. Idempotent: already-active rooms return nil.
// Duel rooms auto-start when both players join via JoinRoom — StartRoom is a no-op for them.
func (s *Service) StartRoom(ctx context.Context, roomID uuid.UUID, callerID *uuid.UUID) (*domain.Room, error) {
	room, err := s.repo.GetRoom(ctx, roomID)
	if err != nil {
		return nil, err
	}

	// Verify caller is the creator
	if callerID == nil || room.CreatorID == uuid.Nil || *callerID != room.CreatorID {
		return nil, domain.ErrForbidden
	}

	// Duel rooms auto-start when the second player joins — don't force-start them early.
	if room.Mode == model.RoomModeDuel {
		room.Participants = s.addCachedGuestsToRoom(room.Participants, roomID)
		return room, nil
	}

	// Already active or finished — nothing to do
	if room.Status == model.RoomStatusActive || room.Status == model.RoomStatusFinished {
		room.Participants = s.addCachedGuestsToRoom(room.Participants, roomID)
		return room, nil
	}

	if err := s.repo.UpdateRoomStatus(ctx, roomID, model.RoomStatusActive); err != nil {
		return nil, err
	}
	room.Status = model.RoomStatusActive

	room.Participants = s.addCachedGuestsToRoom(room.Participants, roomID)
	return room, nil
}

func (s *Service) CleanupInactiveRooms(ctx context.Context, idleFor time.Duration) (int64, error) {
	return s.repo.CleanupInactiveRooms(ctx, idleFor)
}

func (s *Service) CleanupOldSubmissions(ctx context.Context, idleFor time.Duration) (int64, error) {
	return s.repo.CleanupOldSubmissions(ctx, idleFor)
}

func (s *Service) ListRooms(ctx context.Context, userID *uuid.UUID) ([]*domain.Room, error) {
	if userID == nil {
		return nil, nil
	}
	return s.repo.ListRoomsForUser(ctx, *userID)
}
