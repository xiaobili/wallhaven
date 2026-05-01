# Stack Research: Concurrent Download Control and Retry-with-Backoff

## Target: v4.0 多线程下载与重试退避机制

---

## Feature Scope

This research covers stack additions/changes for exactly two new capabilities:

1. **Concurrent download control** — a semaphore/task-queue that limits parallel downloads to the user-configured `maxConcurrentDownloads` (integer 1-10, default 3)
2. **Automatic retry with exponential backoff** — failed downloads automatically retry with increasing delays

**Core constraint:** No external promise-concurrency or retry libraries unless absolutely necessary. Prefer native Promise patterns.

---

## Recommended Approach

### Concurrent Download Control: NATIVE PROMISE SEMAPHORE (No Library)

**Verdict:** Zero new dependencies. ~25 lines of TypeScript.

The existing `download.handler.ts` already tracks active downloads in a `Map<string, ActiveDownload>`. The missing piece is a queue that gates how many can be active simultaneously.

**Where it lives:** Main process (`download.handler.ts`), not renderer composable.

**Why main process, not renderer:**
- The `activeDownloads` Map in `download.handler.ts` is already the single source of truth for what is currently downloading
- IPC overhead adds latency and coordination complexity if the renderer must manage the queue
- A main-process queue remains correct even if multiple windows or IPC callers start downloads
- The existing handler already owns abort-controller lifecycle, failure notifications, and temp-file cleanup — a queue integrates naturally at the same architectural level

**Implementation pattern:**

```typescript
class DownloadQueue {
  private limit: number
  private running: number = 0
  private queue: Array<{
    taskId: string
    start: () => Promise<void>
  }> = []

  constructor(limit: number) {
    this.limit = limit
  }

  setLimit(limit: number): void {
    this.limit = limit
    this.drain()
  }

  enqueue(taskId: string, start: () => Promise<void>): void {
    this.queue.push({ taskId, start })
    this.drain()
  }

  /** Remove a queued task that hasn't started yet (e.g., user cancelled before it began) */
  dequeue(taskId: string): boolean {
    const index = this.queue.findIndex(t => t.taskId === taskId)
    if (index !== -1) {
      this.queue.splice(index, 1)
      return true
    }
    return false
  }

  private drain(): void {
    while (this.running < this.limit && this.queue.length > 0) {
      const task = this.queue.shift()!
      this.running++
      task.start().finally(() => {
        this.running--
        this.drain()
      })
    }
  }
}
```

This is the standard semaphore pattern using only native `Promise.prototype.finally()`. No `p-limit`, no `p-queue`, no `async-pool`.

**Integration with existing code:**
- `activeDownloads` Map continues to track what is currently downloading (content of the semaphore's running slots)
- The `DownloadQueue` sits alongside it in `download.handler.ts`, gating how many entries the Map contains at any given time
- `registerDownloadHandlers()` IPC handler for `start-download-task` enqueues via `downloadQueue.enqueue()` instead of proceeding immediately
- Pause/cancel calls `downloadQueue.dequeue()` to remove not-yet-started tasks from the queue, or aborts already-running ones (existing `abortController.abort()`)
- The `maxConcurrentDownloads` setting needs to be plumbed from renderer settings to the main process queue (a new IPC channel or piggyback on the existing settings-save IPC)

---

### Retry with Exponential Backoff: NATIVE WRAPPER (No Library)

**Verdict:** Zero new dependencies. ~40 lines of TypeScript.

`axios-retry` v4.5.0 (15.9M weekly downloads, stable) and `retry-axios` v4.0.3 (3.8M weekly downloads) are both well-maintained packages, but neither is necessary here because:

1. **Stream-based downloads** — The existing code uses `responseType: 'stream'` and attaches `data` event handlers for progress. `axios-retry` works at the axios interceptor level (request/response) and does not cleanly wrap the stream-handling lifecycle (re-attaching data handlers, re-piping to temp file). A retry requires re-creating the stream and re-attaching handlers — this is simpler as a loop than as interceptors.

2. **Range-request resume on retry** — When retrying a partial download, the new request needs `Range: bytes={offset}-`. This is already implemented in `resume-download-task`. A retry wrapper simply reuses the same offset logic already present in the codebase.

3. **Integration with existing state persistence** — The retry loop needs to update `ActiveDownload.totalSize`, `downloadedSize`, and persist state files. Without an abstraction layer, this is straightforward.

**Where it lives:** Main process, wrapping the existing axios download call inside `registerDownloadHandlers()`.

**Implementation pattern:**

```typescript
const MAX_RETRIES = 3
const BASE_DELAY_MS = 1000

/**
 * Classify errors as retryable vs non-retryable
 * Non-retryable: CanceledError (user abort), 4xx except 429
 * Retryable: network errors, 5xx, 429, timeout
 */
function isRetryableError(error: any): boolean {
  // User-initiated cancel — never retry
  if (error.name === 'CanceledError' || error.code === 'ERR_CANCELED') return false

  const status = error.response?.status
  if (status) {
    // 4xx except 429 are client errors — don't retry
    if (status >= 400 && status < 500 && status !== 429) return false
    // 429 (rate limit) and 5xx (server errors) — retry
    return status === 429 || status >= 500
  }

  // Network-level errors without response — retry
  return (
    error.code === 'ECONNABORTED' ||
    error.code === 'ETIMEDOUT' ||
    error.code === 'ECONNRESET' ||
    error.code === 'ERR_EMPTY_RESPONSE'
  )
}

/**
 * Calculate exponential backoff delay with full jitter
 * Formula: random() * (baseDelay * 2^(attempt-1))
 * Cap: 30 seconds
 */
function calculateBackoff(attempt: number): number {
  const exponentialDelay = BASE_DELAY_MS * Math.pow(2, attempt - 1)
  return Math.min(Math.random() * exponentialDelay, 30000)
}

/**
 * Wraps a download function with retry logic
 * The downloadFn should throw on failure, resolve on success
 */
async function downloadWithRetry(
  downloadFn: () => Promise<void>,
  onRetry: (attempt: number, delay: number) => void,
  maxRetries: number = MAX_RETRIES
): Promise<void> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await downloadFn()
      return  // success
    } catch (error) {
      if (attempt === maxRetries || !isRetryableError(error)) {
        throw error  // re-throw to caller for normal failure handling
      }

      const delay = calculateBackoff(attempt)
      onRetry(attempt, delay)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
}
```

**How it integrates:**
- The axios download + stream handling block inside `start-download-task` handler becomes the `downloadFn` callback passed to `downloadWithRetry()`
- On each retry, it re-issues the GET request with `Range: bytes={currentOffset}-`
- The progress `data` event handler is re-attached after each retry
- The temp file is opened in append mode (`{ flags: 'a' }`) on retry (same as existing resume logic)
- State file persists after each chunk (existing throttling logic unchanged)
- On non-retryable error or max retries exceeded, the existing failure path runs (clean temp file if needed, notify renderer via IPC)

---

## Summary of Stack Changes

| What | Change | Lines of Code | Dependencies Added |
|------|--------|---------------|-------------------|
| Concurrency semaphore | Add `DownloadQueue` class to `download.handler.ts` | ~25 | 0 |
| IPC plumbing for concurrency limit | Pass `maxConcurrentDownloads` setting to main process queue | ~10 (renderer) + ~5 (IPC) | 0 |
| Retry wrapper | Add `downloadWithRetry()` + helpers to `download.handler.ts` | ~40 | 0 |
| Retry progress state | Add `'retrying'` to `DownloadProgressData.state` type | ~2 | 0 |
| UI retry indicator | Show retry status in `DownloadWallpaper.vue` | ~15 | 0 |

**Total new code:** ~95-100 lines across 3-4 files
**Total new dependencies:** 0

---

## What NOT to Add

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `p-limit`, `p-queue`, `async-pool` | Concurrency semaphore is ~25 lines of native Promise; these add bundle bloat for trivial functionality | Native `Promise` + queue pattern in `download.handler.ts` |
| `axios-retry` | Stream-based downloads need custom retry lifecycle (re-pipe stream, re-attach handlers). axios-retry works at request level, not stream level. | Native retry wrapper in download handler |
| `retry-axios` | Same as axios-retry. Per-request raxConfig adds complexity with no benefit for stream-based downloads. | Native retry wrapper |
| `bottleneck` | Throttling library for rate-limited API calls. Download queue is simpler — no rate limiting needed, just parallelism control. | Native semaphore |
| `worker_threads` | Download I/O is non-blocking (Node.js streams + axios). No CPU-bound work that would justify thread overhead. | Main process async I/O |
| `async-mutex` | Mutex pattern for exclusive access. Downloads need shared semaphore, not mutual exclusion. | Native semaphore |

---

## Version Compatibility

Since zero new dependencies are added, there are no new version compatibility concerns. All APIs used are available in the project's existing Node.js version range.

| API | Node.js Minimum | Available in Node 20+ | Available in Electron 41 |
|----|----------------|----------------------|--------------------------|
| `Promise.prototype.finally()` | 10+ | Yes | Yes |
| `AbortController` | 15+ | Yes | Yes |
| `setTimeout` (promisified) | 0.x | Yes | Yes |
| `Math.random()` | 0.x | Yes | Yes |
| `Error.name` / `Error.code` | 0.x | Yes | Yes |

---

## Alternatives Considered

| Approach | Considered | Why Rejected |
|----------|-----------|--------------|
| **Renderer-side concurrency queue** — manage queue in `useDownload` composable, gate calls to `startDownload` | Multiple callers could bypass (direct IPC from any component). Race conditions with main process download state. IPC round-trip latency on every queue operation. | Main process queue is the single point of control. |
| **Batch pattern** — slice download list into batches, wait for each batch to complete | Inflexible with dynamic add/remove. Wasted slot capacity if tasks vary in duration (one long task blocks the whole batch). | Semaphore efficiently uses all slots. |
| **Retry via axios interceptors** — use `axios-retry` which wraps requests at interceptor level | Stream lifecycle (data handler, pipe, progress) is outside the interceptor scope. Interceptors can't re-pipe streams. | Native loop wrapper keeps stream lifecycle contained. |
| **Renderer-side retry** — catch `failed` progress event in composable, re-call `startDownload` | IPC round-trip per retry (~2-5ms each). Need to reconstruct offset state in renderer and pass it back. Temp file lifecycle complexity. | Main process retry has direct access to offset, temp path, and active download state. |

---

## Integration Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Download queue starts task but renderer still shows "waiting" | Low | Medium — user confusion | Send `state: 'downloading'` progress event when task dequeues, even before first byte |
| Retry loop exhausts on transient errors, user sees "failed" after 10+ seconds | Medium | Low — expected behavior | Consider reducing MAX_RETRIES to 2 for faster feedback, or add max total retry timeout |
| User changes maxConcurrentDownloads while 5 tasks are running | Low | Low — queue adapts gracefully | `setLimit()` calls `drain()` which starts/stops as needed |
| Settings IPC race — maxConcurrentDownloads updated before download queue receives new value | Low | Low — default 3 is safe | Queue reads limit before each `drain()`, always uses the latest value |

---

*Stack research for: v4.0 多线程下载与重试退避机制*
*Researched: 2026-05-01*
