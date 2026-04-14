interface CacheOptions {
  /** Time-to-live in ms. Entries older than this are evicted on access. 0 = no expiry. */
  ttl?: number
}

export function createCache<K, V>(opts?: CacheOptions) {
  const ttl = opts?.ttl ?? 0
  const cache = new Map<K, { value: V; ts: number }>()
  const inFlight = new Map<K, Promise<V>>()

  function isExpired(entry: { ts: number }): boolean {
    return ttl > 0 && Date.now() - entry.ts > ttl
  }

  return {
    get: (key: K): V | undefined => {
      const entry = cache.get(key)
      if (!entry) return undefined
      if (isExpired(entry)) { cache.delete(key); return undefined }
      return entry.value
    },
    set: (key: K, value: V) => cache.set(key, { value, ts: Date.now() }),
    has: (key: K): boolean => {
      const entry = cache.get(key)
      if (!entry) return false
      if (isExpired(entry)) { cache.delete(key); return false }
      return true
    },
    delete: (key: K) => cache.delete(key),
    clear: () => { cache.clear(); inFlight.clear() },
    getInFlight: (key: K) => inFlight.get(key),
    setInFlight: (key: K, promise: Promise<V>) => inFlight.set(key, promise),
    deleteInFlight: (key: K) => inFlight.delete(key),
  }
}
