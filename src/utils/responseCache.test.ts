import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ResponseCache } from './responseCache';

describe('ResponseCache', () => {
  let cache: ResponseCache;

  beforeEach(() => {
    cache = new ResponseCache({ ttlMs: 1000, maxEntries: 5 });
  });

  describe('getOrFetch', () => {
    it('calls fetch function on cache miss', async () => {
      const fetchFn = vi.fn().mockResolvedValue({ data: 'test' });
      const result = await cache.getOrFetch('key1', fetchFn);
      expect(result).toEqual({ data: 'test' });
      expect(fetchFn).toHaveBeenCalledTimes(1);
    });

    it('returns cached value on cache hit', async () => {
      const fetchFn = vi.fn().mockResolvedValue({ data: 'test' });
      await cache.getOrFetch('key1', fetchFn);
      const result = await cache.getOrFetch('key1', fetchFn);
      expect(result).toEqual({ data: 'test' });
      expect(fetchFn).toHaveBeenCalledTimes(1); // Not called again
    });

    it('re-fetches after TTL expires', async () => {
      const fetchFn = vi.fn()
        .mockResolvedValueOnce({ data: 'old' })
        .mockResolvedValueOnce({ data: 'new' });

      // Use a very short TTL
      const shortCache = new ResponseCache({ ttlMs: 10 });
      await shortCache.getOrFetch('key1', fetchFn);

      // Wait for TTL to expire
      await new Promise(r => setTimeout(r, 20));

      const result = await shortCache.getOrFetch('key1', fetchFn);
      expect(result).toEqual({ data: 'new' });
      expect(fetchFn).toHaveBeenCalledTimes(2);
    });

    it('supports per-call TTL override', async () => {
      const fetchFn = vi.fn()
        .mockResolvedValueOnce('v1')
        .mockResolvedValueOnce('v2');

      await cache.getOrFetch('key1', fetchFn, 10); // 10ms TTL
      await new Promise(r => setTimeout(r, 20));
      const result = await cache.getOrFetch('key1', fetchFn);
      expect(result).toBe('v2');
    });
  });

  describe('set and get', () => {
    it('stores and retrieves values', () => {
      cache.set('k', 42);
      expect(cache.get<number>('k')).toBe(42);
    });

    it('returns undefined for missing keys', () => {
      expect(cache.get('missing')).toBeUndefined();
    });

    it('returns undefined for expired entries', async () => {
      const shortCache = new ResponseCache({ ttlMs: 10 });
      shortCache.set('k', 'val');
      await new Promise(r => setTimeout(r, 20));
      expect(shortCache.get('k')).toBeUndefined();
    });
  });

  describe('has', () => {
    it('returns true for valid entries', () => {
      cache.set('k', 'val');
      expect(cache.has('k')).toBe(true);
    });

    it('returns false for missing entries', () => {
      expect(cache.has('nope')).toBe(false);
    });
  });

  describe('invalidation', () => {
    it('invalidates a specific key', () => {
      cache.set('k1', 'v1');
      cache.set('k2', 'v2');
      cache.invalidate('k1');
      expect(cache.has('k1')).toBe(false);
      expect(cache.has('k2')).toBe(true);
    });

    it('invalidates by prefix', () => {
      cache.set('/projects/1/pipelines', 'p1');
      cache.set('/projects/1/jobs', 'j1');
      cache.set('/projects/2/pipelines', 'p2');
      cache.invalidateByPrefix('/projects/1');
      expect(cache.has('/projects/1/pipelines')).toBe(false);
      expect(cache.has('/projects/1/jobs')).toBe(false);
      expect(cache.has('/projects/2/pipelines')).toBe(true);
    });

    it('clears all entries', () => {
      cache.set('a', 1);
      cache.set('b', 2);
      cache.clear();
      expect(cache.stats.size).toBe(0);
    });
  });

  describe('eviction', () => {
    it('evicts oldest entry when at capacity', () => {
      for (let i = 0; i < 5; i++) {
        cache.set(`key${i}`, i);
      }
      expect(cache.stats.size).toBe(5);
      cache.set('key5', 5); // Should evict key0
      expect(cache.has('key0')).toBe(false);
      expect(cache.has('key5')).toBe(true);
      expect(cache.stats.size).toBe(5);
    });
  });

  describe('stats', () => {
    it('reports correct stats', () => {
      expect(cache.stats).toEqual({
        size: 0,
        maxEntries: 5,
        ttlMs: 1000,
      });
    });
  });
});
