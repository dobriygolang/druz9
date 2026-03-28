import {
  CodeRoom,
  CodeRoomMode,
  CodeRoomStatus,
  Participant,
  RoomMode,
  RoomStatus,
} from '@/entities/CodeRoom/model/types';

const normalizeRoomMode = (value: unknown): CodeRoomMode => {
  if (value === RoomMode.ROOM_MODE_DUEL || value === 'duel') {
    return 'duel';
  }
  return 'all';
};

const normalizeRoomStatus = (value: unknown): CodeRoomStatus => {
  if (value === RoomStatus.ROOM_STATUS_FINISHED || value === 'finished') {
    return 'finished';
  }
  if (value === RoomStatus.ROOM_STATUS_ACTIVE || value === 'active') {
    return 'active';
  }
  return 'waiting';
};

export function normalizeParticipant(participant: any): Participant {
  const userId = participant?.userId ?? participant?.user_id ?? null;
  const displayName = participant?.displayName ?? participant?.name ?? 'Гость';
  const joinedAt = participant?.joinedAt ?? participant?.joined_at ?? new Date().toISOString();

  return {
    id: participant?.id || userId || `${displayName}:${joinedAt}`,
    userId,
    displayName,
    isGuest: Boolean(participant?.isGuest ?? participant?.is_guest ?? !userId),
    role: participant?.role === 'creator' ? 'creator' : 'member',
    isReady: Boolean(participant?.isReady ?? participant?.is_ready),
    joinedAt,
    score: participant?.score,
  };
}

export function normalizeRoom(room: any): CodeRoom {
  if (!room) {
    throw new Error('Room is undefined');
  }

  const mode = normalizeRoomMode(room.mode ?? RoomMode.ROOM_MODE_ALL);

  return {
    ...room,
    title: room.title || `Комната ${String(room.id || '').slice(0, 8)}`,
    mode,
    status: normalizeRoomStatus(room.status ?? RoomStatus.ROOM_STATUS_WAITING),
    inviteCode: room.inviteCode || room.invite_code || '',
    creatorId: room.creatorId || room.creator_id || '',
    participants: (room.participants || []).map(normalizeParticipant),
    code: room.code || '',
    codeRevision: Number(room.codeRevision ?? room.code_revision ?? 0),
    task: room.task || '',
    taskId: room.taskId || room.task_id || '',
    language: 'go',
    maxParticipants: Number(room.maxParticipants || room.max_participants || (mode === 'duel' ? 2 : 10)),
    createdAt: room.createdAt || room.created_at || new Date().toISOString(),
    updatedAt: room.updatedAt || room.updated_at || new Date().toISOString(),
  };
}
