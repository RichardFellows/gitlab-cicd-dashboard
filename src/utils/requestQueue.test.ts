import { describe, it, expect } from 'vitest';
import { RequestQueue } from './requestQueue';

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe('RequestQueue', () => {
  it('executes requests up to the concurrency limit', async () => {
    const queue = new RequestQueue({ concurrency: 2 });
    const running: number[] = [];
    const maxConcurrent: number[] = [];

    const task = async (id: number) => {
      running.push(id);
      maxConcurrent.push(running.length);
      await delay(50);
      running.splice(running.indexOf(id), 1);
      return id;
    };

    const results = await Promise.all([
      queue.add(() => task(1)),
      queue.add(() => task(2)),
      queue.add(() => task(3)),
      queue.add(() => task(4)),
    ]);

    expect(results).toEqual([1, 2, 3, 4]);
    // At no point should more than 2 tasks have been running
    expect(Math.max(...maxConcurrent)).toBeLessThanOrEqual(2);
  });

  it('defaults to concurrency of 6', async () => {
    const queue = new RequestQueue();
    // Enqueue 8 tasks, check only 6 start immediately
    let started = 0;
    const deferred: { resolve: () => void }[] = [];
    const makeTask = () =>
      new Promise<void>((resolve) => {
        started++;
        deferred.push({ resolve });
      });

    const promises = [];
    for (let i = 0; i < 8; i++) {
      promises.push(queue.add(makeTask).catch(() => {/* cleared */}));
    }

    expect(started).toBe(6);
    expect(queue.activeCount).toBe(6);
    expect(queue.pendingCount).toBe(2);

    queue.clear();
    deferred.forEach((d) => d.resolve());
    await Promise.all(promises);
  });

  it('propagates rejections', async () => {
    const queue = new RequestQueue({ concurrency: 1 });
    const err = new Error('boom');

    await expect(
      queue.add(() => Promise.reject(err))
    ).rejects.toThrow('boom');
  });

  it('clear() rejects pending items', async () => {
    const queue = new RequestQueue({ concurrency: 1 });

    // Block the queue with a long-running task
    const blocker = queue.add(() => delay(500));

    const pending = queue.add(() => Promise.resolve('nope'));
    queue.clear();

    await expect(pending).rejects.toThrow('Queue cleared');

    // Blocker should still resolve
    await blocker;
  });

  it('reports activeCount and pendingCount', async () => {
    const queue = new RequestQueue({ concurrency: 1 });
    const deferred: { resolve: () => void }[] = [];

    const makeTask = () =>
      new Promise<void>((resolve) => {
        deferred.push({ resolve });
      });

    const p1 = queue.add(makeTask);
    const p2 = queue.add(makeTask).catch(() => {/* cleared */});
    const p3 = queue.add(makeTask).catch(() => {/* cleared */});

    expect(queue.activeCount).toBe(1);
    expect(queue.pendingCount).toBe(2);

    // Clear pending tasks, then resolve the active one
    queue.clear();
    deferred[0].resolve();
    await Promise.all([p1, p2, p3]);
  });

  it('handles an empty queue gracefully', () => {
    const queue = new RequestQueue({ concurrency: 2 });
    expect(queue.activeCount).toBe(0);
    expect(queue.pendingCount).toBe(0);
    queue.clear(); // no-op
  });
});
