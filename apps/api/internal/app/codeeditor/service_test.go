package codeeditor

import (
	"testing"
	"time"

	domain "api/internal/domain/codeeditor"
	"api/internal/model"
	"api/internal/policy"

	"github.com/stretchr/testify/assert"
)

// TTLCache interface for testing
type cacheInterface interface {
	Get(key string) (interface{}, bool)
	Set(key string, value interface{})
}

func TestService_New(t *testing.T) {
	t.Parallel()

	// Verify that New() creates service
	svc := New(Config{
		Repository: nil,
		Sandbox:    nil,
	})

	assert.NotNil(t, svc, "service should be created")
}

func TestTaskCache_StoresAndRetrieves(t *testing.T) {
	t.Parallel()

	cache := newTaskCacheForTest()

	// Store value
	testKey := "task-123"
	testValue := "test-task-data"

	cache.Set(testKey, testValue)

	// Retrieve value
	retrieved, found := cache.Get(testKey)

	assert.True(t, found, "should find cached value")
	assert.Equal(t, testValue, retrieved, "should retrieve same value")
}

func TestTaskCache_ReturnsFalseForMissingKey(t *testing.T) {
	t.Parallel()

	cache := newTaskCacheForTest()

	_, found := cache.Get("nonexistent")

	assert.False(t, found, "should return false for missing key")
}

// Helper to simulate TTLCache for testing without real implementation
func newTaskCacheForTest() *testCache {
	return &testCache{data: make(map[string]interface{})}
}

type testCache struct {
	data map[string]interface{}
}

func (c *testCache) Get(key string) (interface{}, bool) {
	v, ok := c.data[key]
	return v, ok
}

func (c *testCache) Set(key string, value interface{}) {
	c.data[key] = value
}

func TestGenerateInviteCode_Length(t *testing.T) {
	t.Parallel()

	code := generateInviteCode()
	assert.Len(t, code, 8, "invite code should be 8 characters")
}

func TestGenerateInviteCode_ValidChars(t *testing.T) {
	t.Parallel()

	code := generateInviteCode()
	const validChars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"

	for _, ch := range code {
		assert.Contains(t, validChars, string(ch), "character %c should be valid", ch)
	}
}

func TestGenerateInviteCode_DifferentCodes(t *testing.T) {
	t.Parallel()

	// Generate multiple codes and verify they're different
	codes := make(map[string]bool)
	for i := 0; i < 100; i++ {
		code := generateInviteCode()
		assert.False(t, codes[code], "generated code should be unique: %s", code)
		codes[code] = true
	}
}

func TestDefaultCode(t *testing.T) {
	t.Parallel()

	code := defaultCode()

	assert.Contains(t, code, "package main")
	assert.Contains(t, code, "fmt.Println")
	assert.Contains(t, code, "Hello, World!")
}

func TestNow(t *testing.T) {
	t.Parallel()

	before := time.Now()
	nowTime := now()
	after := time.Now()

	assert.True(t, nowTime.After(before) || nowTime.Equal(before))
	assert.True(t, nowTime.Before(after) || nowTime.Equal(after))
}

func TestShouldHideDuelTask(t *testing.T) {
	t.Parallel()

	t.Run("hides duel task before opponent joins", func(t *testing.T) {
		t.Parallel()
		room := &domain.Room{
			Mode: model.RoomModeDuel,
			Participants: []*domain.Participant{
				{Name: "creator"},
			},
		}
		assert.True(t, shouldHideDuelTask(room))
	})

	t.Run("reveals duel task after opponent joins", func(t *testing.T) {
		t.Parallel()
		room := &domain.Room{
			Mode: model.RoomModeDuel,
			Participants: []*domain.Participant{
				{Name: "creator"},
				{Name: "opponent"},
			},
		}
		assert.False(t, shouldHideDuelTask(room))
	})

	t.Run("shared room stays visible", func(t *testing.T) {
		t.Parallel()
		room := &domain.Room{
			Mode: model.RoomModeAll,
			Participants: []*domain.Participant{
				{Name: "creator"},
			},
		}
		assert.False(t, shouldHideDuelTask(room))
	})
}

func TestCloneStrings(t *testing.T) {
	t.Parallel()

	t.Run("returns nil for empty slice", func(t *testing.T) {
		t.Parallel()
		result := cloneStrings(nil)
		assert.Nil(t, result)
	})

	t.Run("returns nil for zero-length slice", func(t *testing.T) {
		t.Parallel()
		result := cloneStrings([]string{})
		assert.Nil(t, result)
	})

	t.Run("copies slice with values", func(t *testing.T) {
		t.Parallel()
		original := []string{"a", "b", "c"}
		result := cloneStrings(original)

		assert.Equal(t, original, result)
		assert.Equal(t, len(original), len(result), "should be same length")

		// Modify original and verify result is independent
		original[0] = "modified"
		assert.Equal(t, "a", result[0], "result should not be affected by original modification")
	})
}

func TestNormalizeStringSlice(t *testing.T) {
	t.Parallel()

	t.Run("returns empty slice for nil", func(t *testing.T) {
		t.Parallel()
		result := normalizeStringSlice(nil)
		assert.NotNil(t, result)
		assert.Len(t, result, 0)
	})

	t.Run("returns empty slice for zero-length", func(t *testing.T) {
		t.Parallel()
		result := normalizeStringSlice([]string{})
		assert.NotNil(t, result)
		assert.Len(t, result, 0)
	})

	t.Run("copies slice with values", func(t *testing.T) {
		t.Parallel()
		original := []string{"a", "b"}
		result := normalizeStringSlice(original)

		assert.Equal(t, original, result)
		assert.Equal(t, len(original), len(result))
	})
}

func TestPolicyTaskTypeForTask(t *testing.T) {
	t.Parallel()

	t.Run("returns fallback for nil task", func(t *testing.T) {
		t.Parallel()
		result := policyTaskTypeForTask(nil, policy.TaskTypeAlgorithmPractice)
		assert.Equal(t, policy.TaskTypeAlgorithmPractice, result)
	})

	t.Run("returns FileParsing for FileIO profile", func(t *testing.T) {
		t.Parallel()
		task := &domain.Task{ExecutionProfile: model.ExecutionProfileFileIO}
		result := policyTaskTypeForTask(task, policy.TaskTypeAlgorithmPractice)
		assert.Equal(t, policy.TaskTypeFileParsing, result)
	})

	t.Run("returns APIJSON for HTTPClient profile", func(t *testing.T) {
		t.Parallel()
		task := &domain.Task{ExecutionProfile: model.ExecutionProfileHTTPClient}
		result := policyTaskTypeForTask(task, policy.TaskTypeAlgorithmPractice)
		assert.Equal(t, policy.TaskTypeAPIJSON, result)
	})

	t.Run("returns InterviewPractice for InterviewRealistic profile", func(t *testing.T) {
		t.Parallel()
		task := &domain.Task{ExecutionProfile: model.ExecutionProfileInterviewRealistic}
		result := policyTaskTypeForTask(task, policy.TaskTypeAlgorithmPractice)
		assert.Equal(t, policy.TaskTypeInterviewPractice, result)
	})

	t.Run("returns fallback for Pure profile", func(t *testing.T) {
		t.Parallel()
		task := &domain.Task{ExecutionProfile: model.ExecutionProfilePure}
		result := policyTaskTypeForTask(task, policy.TaskTypeAlgorithmPractice)
		assert.Equal(t, policy.TaskTypeAlgorithmPractice, result)
	})

	t.Run("returns fallback for unknown profile", func(t *testing.T) {
		t.Parallel()
		// Use an unmapped profile value (100 is not a valid ExecutionProfile)
		task := &domain.Task{ExecutionProfile: model.ExecutionProfile(100)}
		result := policyTaskTypeForTask(task, policy.TaskTypeAlgorithmPractice)
		assert.Equal(t, policy.TaskTypeAlgorithmPractice, result)
	})
}

func TestPolicyLanguageForTask(t *testing.T) {
	t.Parallel()

	t.Run("returns LanguageGo for Go", func(t *testing.T) {
		t.Parallel()
		result := policyLanguageForTask(model.ProgrammingLanguageGo)
		assert.Equal(t, policy.LanguageGo, result)
	})

	t.Run("returns LanguageGo for unknown language", func(t *testing.T) {
		t.Parallel()
		result := policyLanguageForTask(model.ProgrammingLanguageUnknown)
		assert.Equal(t, policy.LanguageGo, result)
	})
}
