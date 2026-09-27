type QueryCacheEntry = {
  value: unknown;
  storedAt: number;
};

const queryCache = new Map<string, QueryCacheEntry>();
const MAX_ENTRIES = 48;
const DEFAULT_MAX_AGE_MS = 30 * 60 * 1_000;

export function readQueryCache<T>(key: string, maxAgeMs = DEFAULT_MAX_AGE_MS): T | undefined {
  const entry = queryCache.get(key);
  if (!entry) return undefined;
  if (Date.now() - entry.storedAt > maxAgeMs) {
    queryCache.delete(key);
    return undefined;
  }
  return entry.value as T;
}

export function writeQueryCache<T>(key: string, value: T): void {
  if (queryCache.size >= MAX_ENTRIES && !queryCache.has(key)) {
    const oldestKey = queryCache.keys().next().value as string | undefined;
    if (oldestKey) queryCache.delete(oldestKey);
  }
  queryCache.delete(key);
  queryCache.set(key, { value, storedAt: Date.now() });
}

export function clearQueryCache(): void {
  queryCache.clear();
}
