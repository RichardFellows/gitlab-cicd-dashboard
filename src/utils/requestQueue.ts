/**
 * API request queuing / throttling utility.
 *
 * Limits the number of concurrent fetch calls to avoid hammering the
 * GitLab API and hitting rate-limit responses (429).
 *
 * Usage:
 *   const queue = new RequestQueue({ concurrency: 6 });
 *   const data = await queue.add(() => fetch(url));
 */

interface QueueItem<T> {
  fn: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
}

export interface RequestQueueOptions {
  /** Maximum concurrent requests (default 6) */
  concurrency?: number;
}

export class RequestQueue {
  private concurrency: number;
  private running = 0;
  private queue: QueueItem<unknown>[] = [];

  constructor(options: RequestQueueOptions = {}) {
    this.concurrency = options.concurrency ?? 6;
  }

  /**
   * Enqueue a request function. Returns a promise that resolves when the
   * request completes, respecting the concurrency limit.
   */
  add<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push({ fn, resolve, reject } as QueueItem<unknown>);
      this.flush();
    });
  }

  /** Number of requests currently in flight. */
  get activeCount(): number {
    return this.running;
  }

  /** Number of requests waiting in the queue. */
  get pendingCount(): number {
    return this.queue.length;
  }

  /** Discard all pending (not yet started) requests. */
  clear(): void {
    for (const item of this.queue) {
      item.reject(new Error('Queue cleared'));
    }
    this.queue = [];
  }

  private flush(): void {
    while (this.running < this.concurrency && this.queue.length > 0) {
      const item = this.queue.shift()!;
      this.running++;
      item
        .fn()
        .then((value) => item.resolve(value))
        .catch((err) => item.reject(err))
        .finally(() => {
          this.running--;
          this.flush();
        });
    }
  }
}

/** Shared singleton for API requests. */
export const apiQueue = new RequestQueue({ concurrency: 6 });

export default RequestQueue;
