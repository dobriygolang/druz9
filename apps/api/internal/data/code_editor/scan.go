package code_editor

import codeeditordomain "api/internal/domain/codeeditor"

func scanRoom(row scanner, room *codeeditordomain.Room) error {
	return row.Scan(
		&room.ID,
		&room.Mode,
		&room.Code,
		&room.CodeRevision,
		&room.Status,
		&room.CreatorID,
		&room.InviteCode,
		&room.Task,
		&room.TaskID,
		&room.DuelTopic,
		&room.WinnerUserID,
		&room.WinnerGuest,
		&room.StartedAt,
		&room.FinishedAt,
		&room.CreatedAt,
		&room.UpdatedAt,
	)
}

func scanParticipant(row scanner, participant *codeeditordomain.Participant) error {
	return row.Scan(
		&participant.UserID,
		&participant.Name,
		&participant.IsGuest,
		&participant.IsReady,
		&participant.IsWinner,
		&participant.JoinedAt,
	)
}

func scanSubmission(row scanner, submission *codeeditordomain.Submission) error {
	return row.Scan(
		&submission.ID,
		&submission.RoomID,
		&submission.UserID,
		&submission.GuestName,
		&submission.Output,
		&submission.Error,
		&submission.SubmittedAt,
		&submission.DurationMs,
		&submission.IsCorrect,
		&submission.PassedCount,
		&submission.TotalCount,
	)
}
