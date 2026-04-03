import { useEffect, useState } from 'react';
import { CodeRoom } from '@/entities/CodeRoom/model/types';
import { codeRoomApi } from '@/features/CodeRoom/api/codeRoomApi';
import { getStoredGuestName } from '@/features/CodeRoom/lib/guestIdentity';
import { User } from '@/entities/User/model/types';

export function useRoomLoader({
  roomId,
  user,
  onRoomLoaded,
}: {
  roomId?: string;
  user: User | null | undefined;
  onRoomLoaded: (room: CodeRoom) => void;
}) {
  const [isRoomLoading, setIsRoomLoading] = useState(true);
  const [roomLoadError, setRoomLoadError] = useState('');
  const [needsGuestName, setNeedsGuestName] = useState(false);

  useEffect(() => {
    if (!roomId) {
      return;
    }

    let cancelled = false;

    const loadRoom = async () => {
      setIsRoomLoading(true);
      setRoomLoadError('');

      if (!user) {
        const guestName = getStoredGuestName();
        if (!guestName) {
          setNeedsGuestName(true);
          setIsRoomLoading(false);
          return;
        }

        for (let attempt = 0; attempt < 3; attempt += 1) {
          try {
            const nextRoom = await codeRoomApi.joinRoom(roomId, { guestName });
            if (cancelled) {
              return;
            }
            onRoomLoaded(nextRoom);
            setIsRoomLoading(false);
            return;
          } catch (error) {
            if (cancelled) {
              return;
            }
            console.error('Failed to join room:', error);
            if (attempt < 2) {
              await new Promise((resolve) => window.setTimeout(resolve, 500 * (attempt + 1)));
            }
          }
        }
      }

      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          const nextRoom = await codeRoomApi.getRoom(roomId);
          if (cancelled) {
            return;
          }
          onRoomLoaded(nextRoom);
          setIsRoomLoading(false);
          return;
        } catch (error) {
          if (cancelled) {
            return;
          }
          console.error('Failed to load room:', error);
          if (attempt < 2) {
            await new Promise((resolve) => window.setTimeout(resolve, 500 * (attempt + 1)));
          }
        }
      }

      if (!cancelled) {
        setRoomLoadError('Не удалось загрузить комнату. Попробуйте еще раз.');
        setIsRoomLoading(false);
      }
    };

    void loadRoom();

    return () => {
      cancelled = true;
    };
  }, [onRoomLoaded, roomId, user]);

  return {
    isRoomLoading,
    roomLoadError,
    needsGuestName,
    setNeedsGuestName,
    setIsRoomLoading,
    setRoomLoadError,
  };
}
