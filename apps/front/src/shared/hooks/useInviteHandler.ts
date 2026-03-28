import { useState, useRef, useEffect, useCallback } from 'react';
import { codeRoomApi } from '@/features/CodeRoom/api/codeRoomApi';
import { getStoredGuestName, hasStoredGuestName, setStoredGuestName } from '@/features/CodeRoom/lib/guestIdentity';
import { CodeRoom } from '@/entities/CodeRoom/model/types';

interface UseInviteHandlerOptions {
  /** Whether the user is authenticated */
  isAuthenticated: boolean;
  /** Whether auth is still loading */
  isLoading: boolean;
}

interface UseInviteHandlerReturn {
  /** Redirect target if invite processed successfully */
  redirectTo: string | null;
  /** Whether invite is being processed */
  isProcessing: boolean;
  /** Whether guest name is needed */
  needsGuestName: boolean;
  /** Get current stored guest name */
  getGuestName: () => string | undefined;
  /** Set guest name and continue processing */
  setGuestName: (name: string) => void;
  /** Cancel guest name entry */
  cancelGuestName: () => void;
}

/**
 * Hook for handling invite code processing.
 * Used by both InviteHandler and RootPageWithInvite to avoid code duplication.
 */
export function useInviteHandler(
  options: UseInviteHandlerOptions,
  inviteCode: string | null,
  fallbackRedirect: string,
): UseInviteHandlerReturn {
  const { isAuthenticated, isLoading } = options;

  const [redirectTo, setRedirectTo] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [needsGuestName, setNeedsGuestName] = useState(false);
  const processedInviteRef = useRef<string | null>(null);

  const processInvite = useCallback(
    async (code: string, guestName?: string) => {
      setIsProcessing(true);
      processedInviteRef.current = code;

      try {
        const room: CodeRoom = await codeRoomApi.joinRoomByInviteCode(code, guestName);
        setRedirectTo(`/code-rooms/${room.id}`);
      } catch (e) {
        console.error('Failed to join room by invite:', e);
        processedInviteRef.current = null;
        // On error, fallback to default route
        setRedirectTo(fallbackRedirect);
      } finally {
        setIsProcessing(false);
      }
    },
    [fallbackRedirect],
  );

  useEffect(() => {
    if (isLoading || isProcessing || !inviteCode || redirectTo) {
      return;
    }

    if (processedInviteRef.current === inviteCode) {
      return;
    }

    // Check if guest name is needed
    if (!isAuthenticated && !hasStoredGuestName()) {
      setNeedsGuestName(true);
      return;
    }

    // Process the invite - get guest name at execution time, not render time
    const guestName = !isAuthenticated ? getStoredGuestName() : undefined;
    processInvite(inviteCode, guestName);
  }, [inviteCode, isAuthenticated, isLoading, isProcessing, redirectTo, processInvite]);

  const setGuestNameHandler = (name: string) => {
    setNeedsGuestName(false);
    setStoredGuestName(name);
    if (inviteCode) {
      void processInvite(inviteCode, name);
    }
  };

  const cancelGuestNameHandler = () => {
    setNeedsGuestName(false);
    processedInviteRef.current = null;
  };

  return {
    redirectTo,
    isProcessing,
    needsGuestName,
    getGuestName: getStoredGuestName,
    setGuestName: setGuestNameHandler,
    cancelGuestName: cancelGuestNameHandler,
  };
}
