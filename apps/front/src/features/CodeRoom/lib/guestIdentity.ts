const GUEST_NAME_KEY = 'code_room_guest_name';
const GUEST_CODE_ROOM_SESSION_KEY = 'code_room_guest_session';
const GUEST_ID_KEY = 'code_room_guest_id';
const FORCE_GUEST_MODE_KEY = 'code_room_force_guest_mode';

const isTruthyFlag = (value: string | null) => {
  if (!value) {
    return false;
  }
  const normalized = value.trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes';
};

export function isGuestModeForced() {
  if (typeof window === 'undefined') {
    return false;
  }
  return isTruthyFlag(window.sessionStorage.getItem(FORCE_GUEST_MODE_KEY));
}

export function setGuestModeForced(enabled: boolean) {
  if (typeof window === 'undefined') {
    return;
  }
  if (enabled) {
    window.sessionStorage.setItem(FORCE_GUEST_MODE_KEY, 'true');
    return;
  }
  window.sessionStorage.removeItem(FORCE_GUEST_MODE_KEY);
}

export function clearForcedGuestMode() {
  setGuestModeForced(false);
}

export function syncForcedGuestModeFromUrl() {
  if (typeof window === 'undefined') {
    return false;
  }

  const params = new URLSearchParams(window.location.search);
  const rawValue = params.get('guest');
  if (rawValue == null) {
    return isGuestModeForced();
  }

  const shouldForceGuest = isTruthyFlag(rawValue);
  setGuestModeForced(shouldForceGuest);
  return shouldForceGuest;
}

export function getStoredGuestName() {
  if (typeof window === 'undefined') {
    return '';
  }
  return window.localStorage.getItem(GUEST_NAME_KEY)?.trim() || '';
}

export function setStoredGuestName(name: string) {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.setItem(GUEST_NAME_KEY, name.trim());
}

export function hasStoredGuestName() {
  return Boolean(getStoredGuestName());
}

export function getStoredGuestId() {
  if (typeof window === 'undefined') {
    return '';
  }
  const existing = window.localStorage.getItem(GUEST_ID_KEY)?.trim();
  if (existing) {
    return existing;
  }
  const next = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  window.localStorage.setItem(GUEST_ID_KEY, next);
  return next;
}

export function hasGuestCodeRoomSession() {
  if (typeof window === 'undefined') {
    return false;
  }
  return window.sessionStorage.getItem(GUEST_CODE_ROOM_SESSION_KEY) === 'true';
}

export function markGuestCodeRoomSession() {
  if (typeof window === 'undefined') {
    return;
  }
  window.sessionStorage.setItem(GUEST_CODE_ROOM_SESSION_KEY, 'true');
}

export function clearGuestCodeRoomSession() {
  if (typeof window === 'undefined') {
    return;
  }
  window.sessionStorage.removeItem(GUEST_CODE_ROOM_SESSION_KEY);
}
