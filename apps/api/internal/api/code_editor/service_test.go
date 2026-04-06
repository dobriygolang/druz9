package code_editor

import (
	"context"
	"errors"
	"testing"
	"time"

	"api/internal/api/code_editor/mocks"
	codeeditordomain "api/internal/domain/codeeditor"
	"api/internal/model"
	v1 "api/pkg/api/code_editor/v1"

	"github.com/google/uuid"
	"github.com/stretchr/testify/mock"
)

func TestCreateRoom(t *testing.T) {
	t.Parallel()

	t.Run("creates room and returns response", func(t *testing.T) {
		t.Parallel()

		userID := uuid.New()
		user := &model.User{ID: userID, FirstName: "John"}
		roomID := uuid.New()
		req := &v1.CreateRoomRequest{
			Name:       "Test Room",
			Mode:       v1.RoomMode_ROOM_MODE_DUEL,
			Topic:      "algorithms",
			Difficulty: v1.TaskDifficulty_TASK_DIFFICULTY_MEDIUM,
		}
		expectedRoom := &codeeditordomain.Room{
			ID:         roomID,
			InviteCode: "ABC123",
			Mode:       codeeditordomain.RoomModeDuel,
		}

		mockService := mocks.NewService(t)
		mockService.On("CreateRoom", mock.Anything, &userID, "John", false, "duel", "algorithms", "medium").Return(expectedRoom, nil).Once()

		mockRealtime := mocks.NewRealtimePublisher(t)

		impl := New(mockService, mockRealtime, nil)
		ctx := model.ContextWithAuth(context.Background(), &model.AuthState{User: user})

		resp, err := impl.CreateRoom(ctx, req)
		if err != nil {
			t.Errorf("unexpected error: %v", err)
		}
		if resp == nil {
			t.Fatal("expected response, got nil")
		}
		if resp.InviteCode != "ABC123" {
			t.Errorf("expected invite code ABC123, got %s", resp.InviteCode)
		}

		mockService.AssertExpectations(t)
	})

	t.Run("creates room for guest", func(t *testing.T) {
		t.Parallel()

		roomID := uuid.New()
		req := &v1.CreateRoomRequest{
			Name:       "Guest Room",
			Mode:       v1.RoomMode_ROOM_MODE_ALL,
			Topic:      "algorithms",
			Difficulty: v1.TaskDifficulty_TASK_DIFFICULTY_EASY,
		}
		expectedRoom := &codeeditordomain.Room{
			ID:         roomID,
			InviteCode: "GUEST01",
			Mode:       codeeditordomain.RoomModeAll,
		}

		mockService := mocks.NewService(t)
		mockService.On("CreateRoom", mock.Anything, (*uuid.UUID)(nil), "Guest Room", true, "all", "algorithms", "easy").Return(expectedRoom, nil).Once()

		mockRealtime := mocks.NewRealtimePublisher(t)

		impl := New(mockService, mockRealtime, nil)

		resp, err := impl.CreateRoom(context.Background(), req)
		if err != nil {
			t.Errorf("unexpected error: %v", err)
		}
		if resp == nil {
			t.Error("expected response, got nil")
		}

		mockService.AssertExpectations(t)
	})

	t.Run("propagates service error", func(t *testing.T) {
		t.Parallel()

		userID := uuid.New()
		user := &model.User{ID: userID}
		expectedErr := errors.New("invalid mode")

		mockService := mocks.NewService(t)
		mockService.On("CreateRoom", mock.Anything, &userID, mock.Anything, mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(nil, expectedErr).Once()

		mockRealtime := mocks.NewRealtimePublisher(t)

		impl := New(mockService, mockRealtime, nil)
		ctx := model.ContextWithAuth(context.Background(), &model.AuthState{User: user})

		_, err := impl.CreateRoom(ctx, &v1.CreateRoomRequest{Mode: v1.RoomMode_ROOM_MODE_DUEL})
		if err == nil {
			t.Error("expected error, got nil")
		}
	})
}

func TestGetRoom(t *testing.T) {
	t.Parallel()

	t.Run("returns room data", func(t *testing.T) {
		t.Parallel()

		roomID := uuid.New()
		req := &v1.GetRoomRequest{RoomId: roomID.String()}
		expectedRoom := &codeeditordomain.Room{
			ID:         roomID,
			Mode:       codeeditordomain.RoomModeDuel,
			InviteCode: "TEST123",
		}

		mockService := mocks.NewService(t)
		mockService.On("GetRoom", mock.Anything, roomID).Return(expectedRoom, nil).Once()

		mockRealtime := mocks.NewRealtimePublisher(t)

		impl := New(mockService, mockRealtime, nil)

		resp, err := impl.GetRoom(context.Background(), req)
		if err != nil {
			t.Errorf("unexpected error: %v", err)
		}
		if resp == nil {
			t.Fatal("expected response, got nil")
		}
		if resp.Room == nil {
			t.Fatal("expected room, got nil")
		}

		mockService.AssertExpectations(t)
	})

	t.Run("returns error for invalid room id", func(t *testing.T) {
		t.Parallel()

		impl := New(nil, nil, nil)

		_, err := impl.GetRoom(context.Background(), &v1.GetRoomRequest{RoomId: "invalid-uuid"})
		if err == nil {
			t.Error("expected error for invalid room id")
		}
	})
}

func TestJoinRoom(t *testing.T) {
	t.Parallel()

	t.Run("joins room and returns response", func(t *testing.T) {
		t.Parallel()

		userID := uuid.New()
		user := &model.User{ID: userID, FirstName: "John"}
		roomID := uuid.New()
		req := &v1.JoinRoomRequest{RoomId: roomID.String(), Name: "Test"}
		expectedRoom := &codeeditordomain.Room{
			ID:   roomID,
			Mode: codeeditordomain.RoomModeDuel,
		}

		mockService := mocks.NewService(t)
		mockService.On("JoinRoom", mock.Anything, roomID, &userID, "John", false).Return(expectedRoom, nil).Once()

		mockRealtime := mocks.NewRealtimePublisher(t)
		mockRealtime.On("PublishRoomUpdate", mock.Anything).Once()

		impl := New(mockService, mockRealtime, nil)
		ctx := model.ContextWithAuth(context.Background(), &model.AuthState{User: user})

		resp, err := impl.JoinRoom(ctx, req)
		if err != nil {
			t.Errorf("unexpected error: %v", err)
		}
		if resp == nil {
			t.Error("expected response, got nil")
		}

		mockService.AssertExpectations(t)
	})

	t.Run("returns error for invalid room id", func(t *testing.T) {
		t.Parallel()

		impl := New(nil, nil, nil)

		_, err := impl.JoinRoom(context.Background(), &v1.JoinRoomRequest{RoomId: "invalid-uuid"})
		if err == nil {
			t.Error("expected error for invalid room id")
		}
	})
}

func TestLeaveRoom(t *testing.T) {
	t.Parallel()

	t.Run("leaves room successfully", func(t *testing.T) {
		t.Parallel()

		userID := uuid.New()
		user := &model.User{ID: userID}
		roomID := uuid.New()

		mockService := mocks.NewService(t)
		mockService.On("LeaveRoom", mock.Anything, roomID, &userID, mock.Anything).Return(nil).Once()
		mockService.On("GetRoom", mock.Anything, roomID).Return(&codeeditordomain.Room{ID: roomID}, nil).Once()

		mockRealtime := mocks.NewRealtimePublisher(t)
		mockRealtime.On("PublishRoomUpdate", mock.Anything).Once()

		impl := New(mockService, mockRealtime, nil)
		ctx := model.ContextWithAuth(context.Background(), &model.AuthState{User: user})

		resp, err := impl.LeaveRoom(ctx, &v1.LeaveRoomRequest{RoomId: roomID.String()})
		if err != nil {
			t.Errorf("unexpected error: %v", err)
		}
		if resp == nil {
			t.Error("expected response, got nil")
		}

		mockService.AssertExpectations(t)
	})

	t.Run("returns error for invalid room id", func(t *testing.T) {
		t.Parallel()

		impl := New(nil, nil, nil)

		_, err := impl.LeaveRoom(context.Background(), &v1.LeaveRoomRequest{RoomId: "invalid-uuid"})
		if err == nil {
			t.Error("expected error for invalid room id")
		}
	})
}

func TestSubmitCode(t *testing.T) {
	t.Parallel()

	t.Run("submits code and returns result", func(t *testing.T) {
		t.Parallel()

		userID := uuid.New()
		user := &model.User{ID: userID, FirstName: "John"}
		roomID := uuid.New()
		submissionID := uuid.New()
		req := &v1.SubmitCodeRequest{
			RoomId: roomID.String(),
			Code:   "console.log('test')",
		}
		expectedSubmission := &codeeditordomain.Submission{
			ID:          submissionID,
			UserID:      &userID,
			Code:        req.Code,
			IsCorrect:   true,
			PassedCount: 5,
			TotalCount:  5,
		}

		mockService := mocks.NewService(t)
		mockService.On("SubmitCode", mock.Anything, roomID, &userID, mock.Anything, req.Code).Return(expectedSubmission, nil).Once()
		mockService.On("GetRoom", mock.Anything, roomID).Return(&codeeditordomain.Room{ID: roomID}, nil).Once()

		mockRealtime := mocks.NewRealtimePublisher(t)
		mockRealtime.On("PublishSubmission", mock.Anything, mock.Anything).Once()
		mockRealtime.On("PublishRoomUpdate", mock.Anything).Once()

		impl := New(mockService, mockRealtime, nil)
		ctx := model.ContextWithAuth(context.Background(), &model.AuthState{User: user})

		resp, err := impl.SubmitCode(ctx, req)
		if err != nil {
			t.Errorf("unexpected error: %v", err)
		}
		if resp == nil {
			t.Error("expected response, got nil")
		}

		mockService.AssertExpectations(t)
	})
}

func TestSetReady(t *testing.T) {
	t.Parallel()

	t.Run("sets ready status", func(t *testing.T) {
		t.Parallel()

		userID := uuid.New()
		user := &model.User{ID: userID}
		roomID := uuid.New()

		mockService := mocks.NewService(t)
		mockService.On("SetReady", mock.Anything, roomID, &userID, mock.Anything, true).Return(nil).Once()
		mockService.On("GetRoom", mock.Anything, roomID).Return(&codeeditordomain.Room{ID: roomID}, nil).Once()

		mockRealtime := mocks.NewRealtimePublisher(t)
		mockRealtime.On("PublishRoomUpdate", mock.Anything).Once()

		impl := New(mockService, mockRealtime, nil)
		ctx := model.ContextWithAuth(context.Background(), &model.AuthState{User: user})

		resp, err := impl.SetReady(ctx, &v1.SetReadyRequest{RoomId: roomID.String(), Ready: true})
		if err != nil {
			t.Errorf("unexpected error: %v", err)
		}
		if resp == nil {
			t.Error("expected response, got nil")
		}

		mockService.AssertExpectations(t)
	})
}

func TestGetSubmissions(t *testing.T) {
	t.Parallel()

	t.Run("returns submissions", func(t *testing.T) {
		t.Parallel()

		roomID := uuid.New()
		submissionID := uuid.New()
		userID := uuid.New()
		req := &v1.GetSubmissionsRequest{RoomId: roomID.String()}
		expectedSubmissions := []*codeeditordomain.Submission{
			{
				ID:          submissionID,
				UserID:      &userID,
				Code:        "test",
				IsCorrect:   true,
				SubmittedAt: time.Now(),
			},
		}

		mockService := mocks.NewService(t)
		mockService.On("GetSubmissions", mock.Anything, roomID).Return(expectedSubmissions, nil).Once()

		mockRealtime := mocks.NewRealtimePublisher(t)

		impl := New(mockService, mockRealtime, nil)

		resp, err := impl.GetSubmissions(context.Background(), req)
		if err != nil {
			t.Errorf("unexpected error: %v", err)
		}
		if resp == nil {
			t.Fatal("expected response, got nil")
		}
		if len(resp.Submissions) != 1 {
			t.Errorf("expected 1 submission, got %d", len(resp.Submissions))
		}

		mockService.AssertExpectations(t)
	})
}

func TestListTasks(t *testing.T) {
	t.Parallel()

	t.Run("returns tasks list", func(t *testing.T) {
		t.Parallel()

		taskID := uuid.New()
		req := &v1.ListTasksRequest{
			Difficulty: v1.TaskDifficulty_TASK_DIFFICULTY_EASY,
		}
		expectedTasks := []*codeeditordomain.Task{
			{
				ID:         taskID,
				Title:      "Test Task",
				Difficulty: codeeditordomain.TaskDifficultyEasy,
			},
		}

		mockService := mocks.NewService(t)
		mockService.On("ListTasks", mock.Anything, model.CodeTaskFilter{
			Difficulty: "easy",
		}).Return(expectedTasks, nil).Once()

		mockRealtime := mocks.NewRealtimePublisher(t)

		impl := New(mockService, mockRealtime, nil)

		resp, err := impl.ListTasks(context.Background(), req)
		if err != nil {
			t.Errorf("unexpected error: %v", err)
		}
		if resp == nil {
			t.Fatal("expected response, got nil")
		}
		if len(resp.Tasks) != 1 {
			t.Errorf("expected 1 task, got %d", len(resp.Tasks))
		}

		mockService.AssertExpectations(t)
	})
}

func TestDeleteTask(t *testing.T) {
	t.Parallel()

	t.Run("deletes task successfully", func(t *testing.T) {
		t.Parallel()

		taskID := uuid.New()

		mockService := mocks.NewService(t)
		mockService.On("DeleteTask", mock.Anything, taskID).Return(nil).Once()

		mockRealtime := mocks.NewRealtimePublisher(t)

		impl := New(mockService, mockRealtime, nil)

		resp, err := impl.DeleteTask(context.Background(), &v1.DeleteTaskRequest{TaskId: taskID.String()})
		if err != nil {
			t.Errorf("unexpected error: %v", err)
		}
		if resp == nil {
			t.Error("expected response, got nil")
		}

		mockService.AssertExpectations(t)
	})

	t.Run("returns error for invalid task id", func(t *testing.T) {
		t.Parallel()

		impl := New(nil, nil, nil)

		_, err := impl.DeleteTask(context.Background(), &v1.DeleteTaskRequest{TaskId: "invalid-uuid"})
		if err == nil {
			t.Error("expected error for invalid task id")
		}
	})
}

func TestGetLeaderboard(t *testing.T) {
	t.Parallel()

	t.Run("returns leaderboard", func(t *testing.T) {
		t.Parallel()

		req := &v1.GetLeaderboardRequest{Limit: 10}
		expectedEntries := []*codeeditordomain.LeaderboardEntry{
			{UserID: "user1", DisplayName: "Player1", Wins: 10, Matches: 15},
		}

		mockService := mocks.NewService(t)
		mockService.On("GetLeaderboard", mock.Anything, int32(10)).Return(expectedEntries, nil).Once()

		mockRealtime := mocks.NewRealtimePublisher(t)

		impl := New(mockService, mockRealtime, nil)

		resp, err := impl.GetLeaderboard(context.Background(), req)
		if err != nil {
			t.Errorf("unexpected error: %v", err)
		}
		if resp == nil {
			t.Fatal("expected response, got nil")
		}
		if len(resp.Entries) != 1 {
			t.Errorf("expected 1 entry, got %d", len(resp.Entries))
		}

		mockService.AssertExpectations(t)
	})
}
