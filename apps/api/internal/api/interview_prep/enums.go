package interview_prep

import (
	"api/internal/model"
	v1 "api/pkg/api/interview_prep/v1"
)

func mapCheckpointStatus(status model.InterviewPrepCheckpointStatus) v1.CheckpointStatus {
	switch status {
	case model.InterviewPrepCheckpointStatusActive:
		return v1.CheckpointStatus_CHECKPOINT_STATUS_ACTIVE
	case model.InterviewPrepCheckpointStatusPassed:
		return v1.CheckpointStatus_CHECKPOINT_STATUS_PASSED
	case model.InterviewPrepCheckpointStatusFailed:
		return v1.CheckpointStatus_CHECKPOINT_STATUS_FAILED
	case model.InterviewPrepCheckpointStatusExpired:
		return v1.CheckpointStatus_CHECKPOINT_STATUS_EXPIRED
	default:
		return v1.CheckpointStatus_CHECKPOINT_STATUS_UNSPECIFIED
	}
}
