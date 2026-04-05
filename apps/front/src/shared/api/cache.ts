export function createCache<K, V>() {
  const cache = new Map<K, V>()
  const inFlight = new Map<K, Promise<V>>()

  return {
    get: (key: K) => cache.get(key),
    set: (key: K, value: V) => cache.set(key, value),
    has: (key: K) => cache.has(key),
    delete: (key: K) => cache.delete(key),
    clear: () => cache.clear(),
    getInFlight: (key: K) => inFlight.get(key),
    setInFlight: (key: K, promise: Promise<V>) => inFlight.set(key, promise),
    deleteInFlight: (key: K) => inFlight.delete(key),
  }
}
