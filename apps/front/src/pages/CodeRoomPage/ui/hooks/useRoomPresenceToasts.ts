import { useEffect, useRef, useState } from 'react';
import { Participant } from '@/entities/CodeRoom/model/types';

export function useRoomPresenceToasts({
  uniqueParticipants,
  notificationsEnabled,
  isParticipantInRoom,
}: {
  uniqueParticipants: Participant[];
  notificationsEnabled: boolean;
  isParticipantInRoom: (participant: Participant) => boolean;
}) {
  const [leaveToasts, setLeaveToasts] = useState<Array<{ id: string; message: string }>>([]);
  const previousParticipantsRef = useRef<Participant[]>([]);
  const leaveBatchRef = useRef<string[]>([]);
  const leaveBatchTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const previous = previousParticipantsRef.current;
    previousParticipantsRef.current = uniqueParticipants;

    if (!notificationsEnabled || previous.length === 0) {
      return;
    }

    const previousById = new Map(previous.map((participant) => [participant.id, participant]));
    const currentById = new Map(uniqueParticipants.map((participant) => [participant.id, participant]));
    const leftNames: string[] = [];

    previousById.forEach((participant, id) => {
      if (participant.role === 'creator') {
        return;
      }

      const wasActive = isParticipantInRoom(participant);
      const current = currentById.get(id);
      const isNowActive = current ? isParticipantInRoom(current) : false;

      if (wasActive && !isNowActive) {
        leftNames.push(participant.displayName);
      }
    });

    if (leftNames.length === 0) {
      return;
    }

    leaveBatchRef.current.push(...leftNames);

    if (leaveBatchTimerRef.current !== null) {
      return;
    }

    leaveBatchTimerRef.current = window.setTimeout(() => {
      const batch = Array.from(new Set(leaveBatchRef.current));
      leaveBatchRef.current = [];
      leaveBatchTimerRef.current = null;

      if (batch.length === 0) {
        return;
      }

      const message = batch.length === 1
        ? `${batch[0]} покинул страницу`
        : batch.length === 2
          ? `${batch[0]} и ${batch[1]} покинули страницу`
          : `${batch[0]}, ${batch[1]} и еще ${batch.length - 2} покинули страницу`;

      const toastId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setLeaveToasts((current) => [...current.slice(-2), { id: toastId, message }]);
      window.setTimeout(() => {
        setLeaveToasts((current) => current.filter((toast) => toast.id !== toastId));
      }, 5200);
    }, 1200);
  }, [isParticipantInRoom, notificationsEnabled, uniqueParticipants]);

  useEffect(() => () => {
    if (leaveBatchTimerRef.current !== null) {
      window.clearTimeout(leaveBatchTimerRef.current);
    }
  }, []);

  return {
    leaveToasts,
    dismissToast: (id: string) => setLeaveToasts((current) => current.filter((toast) => toast.id !== id)),
  };
}
