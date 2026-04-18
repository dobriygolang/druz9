package arena

import (
	"context"
	"time"

	"api/internal/model"
	schema "api/internal/realtime/schema"

	klog "github.com/go-kratos/kratos/v2/log"
	"github.com/google/uuid"
)

func (h *Hub) ensureMatchLoaded(matchID string) {
	if h.service == nil {
		return
	}

	h.mu.Lock()
	room := h.matches[matchID]
	alreadyLoaded := room != nil && room.match != nil
	h.mu.Unlock()
	if alreadyLoaded {
		return
	}

	parsedMatchID, err := uuid.Parse(matchID)
	if err != nil {
		return
	}
	ctx, cancel := context.WithTimeout(h.ctx, 5*time.Second)
	defer cancel()

	match, err := h.service.GetMatch(ctx, parsedMatchID)
	if err != nil || match == nil {
		return
	}
	h.PublishMatch(dtoFromArenaMatch(match), dtoCodesFromArenaMatch(match))
}

func dtoFromArenaMatch(match *model.ArenaMatch) *schema.ArenaMatch {
	if match == nil {
		return nil
	}
	item := &schema.ArenaMatch{
		ID:                match.ID.String(),
		TaskID:            match.TaskID.String(),
		TaskTitle:         arenaTaskTitle(match),
		TaskStatement:     arenaTaskStatement(match),
		StarterCode:       arenaStarterCode(match),
		Topic:             match.Topic,
		Difficulty:        match.Difficulty.String(),
		Status:            match.Status.String(),
		DurationSeconds:   match.DurationSeconds,
		ObfuscateOpponent: match.ObfuscateOpponent,
		WinnerReason:      match.WinnerReason.String(),
		CreatedAt:         match.CreatedAt.UTC().Format(time.RFC3339Nano),
		Players:           make([]*schema.ArenaPlayer, 0, len(match.Players)),
	}
	if match.WinnerUserID != nil {
		item.WinnerUserID = match.WinnerUserID.String()
	}
	if match.StartedAt != nil && !match.StartedAt.IsZero() {
		item.StartedAt = match.StartedAt.UTC().Format(time.RFC3339Nano)
	}
	if match.FinishedAt != nil && !match.FinishedAt.IsZero() {
		item.FinishedAt = match.FinishedAt.UTC().Format(time.RFC3339Nano)
	}
	for _, player := range match.Players {
		if player == nil {
			continue
		}
		realtimePlayer := &schema.ArenaPlayer{
			UserID:         player.UserID.String(),
			DisplayName:    player.DisplayName,
			Side:           player.Side.String(),
			IsCreator:      player.IsCreator,
			SuspicionCount: player.SuspicionCount,
			BestRuntimeMs:  player.BestRuntimeMs,
			IsWinner:       player.IsWinner,
			JoinedAt:       player.JoinedAt.UTC().Format(time.RFC3339Nano),
		}
		if player.FreezeUntil != nil && !player.FreezeUntil.IsZero() {
			realtimePlayer.FreezeUntil = player.FreezeUntil.UTC().Format(time.RFC3339Nano)
		}
		if player.AcceptedAt != nil && !player.AcceptedAt.IsZero() {
			realtimePlayer.AcceptedAt = player.AcceptedAt.UTC().Format(time.RFC3339Nano)
		}
		item.Players = append(item.Players, realtimePlayer)
	}
	return item
}

func arenaTaskTitle(match *model.ArenaMatch) string {
	if match == nil || match.Task == nil {
		return ""
	}
	return match.Task.Title
}

func arenaTaskStatement(match *model.ArenaMatch) string {
	if match == nil || match.Task == nil {
		return ""
	}
	return match.Task.Statement
}

func arenaStarterCode(match *model.ArenaMatch) string {
	if match == nil || match.Task == nil {
		return ""
	}
	return match.Task.StarterCode
}

func dtoCodesFromArenaMatch(match *model.ArenaMatch) []*schema.ArenaPlayerCode {
	if match == nil {
		return nil
	}
	result := make([]*schema.ArenaPlayerCode, 0, len(match.Players))
	for _, player := range match.Players {
		if player == nil {
			continue
		}
		result = append(result, &schema.ArenaPlayerCode{
			UserID:      player.UserID.String(),
			DisplayName: player.DisplayName,
			Code:        player.CurrentCode,
		})
	}
	return result
}

func cloneArenaCodes(source map[string]*schema.ArenaPlayerCode) map[string]*schema.ArenaPlayerCode {
	result := make(map[string]*schema.ArenaPlayerCode, len(source))
	for userID, code := range source {
		if code == nil {
			continue
		}
		item := *code
		result[userID] = &item
	}
	return result
}

func (h *Hub) snapshotLoop() {
	ticker := time.NewTicker(arenaSnapshotFlushInterval)
	defer ticker.Stop()

	for {
		select {
		case <-h.stopCh:
			return
		case <-ticker.C:
		}

		type snapshot struct {
			matchID string
			codes   map[string]*schema.ArenaPlayerCode
		}

		var pending []snapshot

		h.mu.Lock()
		for matchID, room := range h.matches {
			if !room.dirty {
				continue
			}
			pending = append(pending, snapshot{
				matchID: matchID,
				codes:   cloneArenaCodes(room.codes),
			})
			room.dirty = false
		}
		h.mu.Unlock()

		for _, item := range pending {
			h.flushSnapshot(item.matchID, item.codes)
		}
	}
}

func (h *Hub) flushSnapshot(matchID string, codes map[string]*schema.ArenaPlayerCode) {
	if h.service == nil {
		return
	}
	parsedMatchID, err := uuid.Parse(matchID)
	if err != nil {
		return
	}

	codesMap := make(map[uuid.UUID]string, len(codes))
	for userID, code := range codes {
		if code == nil {
			continue
		}
		parsedUserID, parseErr := uuid.Parse(userID)
		if parseErr != nil {
			continue
		}
		codesMap[parsedUserID] = code.Code
	}

	if len(codesMap) > 0 {
		ctx, cancel := context.WithTimeout(h.ctx, 5*time.Second)
		defer cancel()

		if err := h.service.SavePlayerCodes(ctx, parsedMatchID, codesMap); err != nil {
			klog.Errorf("arena flush snapshot match=%s: %v", matchID, err)
		}
	}
}

func obfuscateCode(value string) string {
	runes := []rune(value)
	for i, r := range runes {
		switch {
		case r == '\n' || r == '\r' || r == '\t' || r == ' ':
			continue
		default:
			runes[i] = '•'
		}
	}
	return string(runes)
}
