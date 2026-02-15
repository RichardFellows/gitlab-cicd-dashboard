/**
 * Simple in-memory response cache with TTL support.
 *
 * Designed for caching GitLab API responses to reduce redundant
 * requests during a single dashboard refresh cycle.
 *
 * Usage:
 *   const cache = new ResponseCache({ ttlMs: 60_000 });
 *   const data = await cache.getOrFetch('key', () => fetch(url));
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

export interface ResponseCacheOptions {
  /** Default time-to-live in milliseconds (default: 60_000 = 1 minute) */
  ttlMs?: number;
  /** Maximum number of entries (default: 500) */
  maxEntries?: number;
}

export class ResponseCache {
  private cache = new Map<string, CacheEntry<unknown>>();
  private ttlMs: number;
  private maxEntries: number;

  constructor(options: ResponseCacheOptions = {}) {
    this.ttlMs = options.ttlMs ?? 60_000;
    this.maxEntries = options.maxEntries ?? 500;
  }

  /**
   * Get a cached value or fetch it using the provided function.
   * @param key - Cache key (typically the API URL)
   * @param fetchFn - Function to call on cache miss
   * @param ttlMs - Optional per-call TTL override
   * @returns The cached or freshly fetched value
   */
  async getOrFetch<T>(key: string, fetchFn: () => Promise<T>, ttlMs?: number): Promise<T> {
    const existing = this.cache.get(key);
    if (existing && existing.expiresAt > Date.now()) {
      return existing.data as T;
    }

    const data = await fetchFn();
    this.set(key, data, ttlMs);
    return data;
  }

  /**
   * Manually set a cache entry.
   */
  set<T>(key: string, data: T, ttlMs?: number): void {
    // Evict oldest entries if at capacity
    if (this.cache.size >= this.maxEntries) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, {
      data,
      expiresAt: Date.now() + (ttlMs ?? this.ttlMs),
    });
  }

  /**
   * Get a cached value if it exists and hasn't expired.
   */
  get<T>(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry || entry.expiresAt <= Date.now()) {
      if (entry) this.cache.delete(key);
      return undefined;
    }
    return entry.data as T;
  }

  /**
   * Check if a key exists and hasn't expired.
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry || entry.expiresAt <= Date.now()) {
      if (entry) this.cache.delete(key);
      return false;
    }
    return true;
  }

  /**
   * Invalidate a specific key.
   */
  invalidate(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Invalidate all keys matching a prefix.
   */
  invalidateByPrefix(prefix: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear all cached entries.
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics.
   */
  get stats(): { size: number; maxEntries: number; ttlMs: number } {
    return {
      size: this.cache.size,
      maxEntries: this.maxEntries,
      ttlMs: this.ttlMs,
    };
  }
}

/** Shared singleton cache for API responses (1-minute TTL). */
export const apiCache = new ResponseCache({ ttlMs: 60_000, maxEntries: 500 });

export default ResponseCache;
