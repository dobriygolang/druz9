type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

const memoryCache = new Map<string, CacheEntry<unknown>>();
const STORAGE_PREFIX = 'druz9:api-cache:';

function now() {
  return Date.now();
}

function storageKey(key: string) {
  return `${STORAGE_PREFIX}${key}`;
}

export function getCachedValue<T>(key: string): T | null {
  const inMemory = memoryCache.get(key) as CacheEntry<T> | undefined;
  if (inMemory && inMemory.expiresAt > now()) {
    return inMemory.value;
  }

  if (typeof window === 'undefined') {
    return null;
  }

  const raw = window.sessionStorage.getItem(storageKey(key));
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as CacheEntry<T>;
    if (parsed.expiresAt <= now()) {
      window.sessionStorage.removeItem(storageKey(key));
      return null;
    }
    memoryCache.set(key, parsed as CacheEntry<unknown>);
    return parsed.value;
  } catch {
    window.sessionStorage.removeItem(storageKey(key));
    return null;
  }
}

export function setCachedValue<T>(key: string, value: T, ttlMs: number) {
  const entry: CacheEntry<T> = {
    value,
    expiresAt: now() + ttlMs,
  };
  memoryCache.set(key, entry as CacheEntry<unknown>);

  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.sessionStorage.setItem(storageKey(key), JSON.stringify(entry));
  } catch {
    // Ignore storage quota errors.
  }
}

export function invalidateCachedValue(key: string) {
  memoryCache.delete(key);
  if (typeof window !== 'undefined') {
    window.sessionStorage.removeItem(storageKey(key));
  }
}

export function invalidateCachedPrefix(prefix: string) {
  for (const key of Array.from(memoryCache.keys())) {
    if (key.startsWith(prefix)) {
      memoryCache.delete(key);
    }
  }

  if (typeof window === 'undefined') {
    return;
  }

  for (let index = window.sessionStorage.length - 1; index >= 0; index -= 1) {
    const key = window.sessionStorage.key(index);
    if (key?.startsWith(storageKey(prefix))) {
      window.sessionStorage.removeItem(key);
    }
  }
}
