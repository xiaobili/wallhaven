# Phase 34: 错误分类与重试退避 — Context

**Gathered:** 2026-05-01
**Status:** Ready for planning
**Mode:** `--auto` (all decisions auto-selected)

<domain>
## Phase Boundary

Automatic retry of transient download failures with exponential backoff + full jitter, slot-holding to prevent starvation. Pure main-process phase — no type changes, no renderer UI changes (those are Phase 35).

**Requirements:** DL-05, DL-06, DL-07, DL-08, DL-09
- DL-05: Auto-retry on transient errors (ECONNRESET, ETIMEDOUT, 5xx, 429)
- DL-06: Permanent errors (404, 403, 401) fail immediately
- DL-07: Exponential backoff with full jitter (base doubling + random, capped 30s)
- DL-08: Max 3 retries, then permanent failure
- DL-09: Retry holds queue slot — no extra concurrent connections

**Out of scope (deferred):**
- 'retrying' state in type union and progress events — Phase 35
- Retry countdown UI — Phase 35
- Error toast suppression during retry — Phase 35
- Configurable max retries (DL-NEXT) — future
- Manual retry button — future

</domain>

<decisions>
## Implementation Decisions

### D-01: Retry loop lives in main process

A new `executeWithRetry()` async wrapper around `executeDownload()`. The retry loop is **not** in the renderer and **not** in the queue class itself — it wraps the dequeue callback.

```typescript
async function executeWithRetry(
  taskId: string, url: string, filename: string, saveDir: string, offset?: number
): Promise<{ filePath: string; size: number }>
```

The queue's `onDequeue` callback calls `executeWithRetry` instead of `executeDownload` directly.

### D-02: Error classification utility

A pure function `classifyDownloadError(error: any): { isRetriable: boolean; reason: string }` added to `download.handler.ts`.

| Category | Errors | Retriable |
|----------|--------|-----------|
| Network (Node.js) | `ECONNRESET`, `ETIMEDOUT`, `ENOTFOUND`, `ECONNREFUSED`, `ERR_NETWORK`, `ERR_CONNECTION_RESET` | Yes |
| Network (generic) | `ENETUNREACH`, `EADDRNOTAVAIL`, `EPIPE` | Yes |
| HTTP transient | 408, 429, 500, 502, 503, 504 | Yes |
| HTTP permanent | 400, 401, 403, 404, 405, 413, 415 | No |
| User-initiated | `CanceledError` / `ERR_CANCELED` | No |
| Resume errors | `RESUME_FILE_NOT_FOUND`, `RESUME_INVALID_OFFSET`, `RESUME_STATE_CORRUPTED` | No |
| Unknown | Anything else | Yes (conservative — retry in case it's transient) |

### D-03: Backoff formula — exponential with full jitter

```typescript
const BACKOFF_BASE_MS = 2_000    // 2 seconds base
const BACKOFF_MAX_MS  = 30_000   // 30 seconds cap
const MAX_RETRIES     = 3

function calculateBackoff(attempt: number): number {
  // attempt is 1-based (1 = first retry)
  const exponential = Math.min(BACKOFF_BASE_MS * Math.pow(2, attempt - 1), BACKOFF_MAX_MS)
  // Full jitter: random(0, exponential) — prevents thundering herd (Pitfall 4)
  return Math.random() * exponential
}
```

Example retry delays: attempt 1 → 0–2s, attempt 2 → 0–4s, attempt 3 → 0–8s (jitter spreads concurrent retries).

### D-04: Slot-holding via activeDownloads persistence (DL-09)

The `ActiveDownload` interface gains an optional `retryCount` field:

```typescript
interface ActiveDownload {
  // ... existing fields unchanged ...
  retryCount?: number  // How many retries have been attempted
}
```

When a transient failure occurs with retries remaining:
- **No** `cleanupDownload(taskId)` called — entry stays in `activeDownloads`
- **No** 'failed' progress event emitted
- The queue's `processQueue()` sees `activeDownloads.size` still includes this task → slot is held

Only after all retries exhausted or permanent error does `cleanupDownload(taskId)` run, freeing the slot.

### D-05: Retry timer management

A `retryTimers` Map in `download.handler.ts`:

```typescript
const retryTimers = new Map<string, ReturnType<typeof setTimeout>>()
```

Two utility functions:
- `scheduleRetryTimer(taskId, delay, callback)` — sets setTimeout, stores reference
- `cancelRetryTimer(taskId)` — clears timer, removes from Map, called by PAUSE/CANCEL

### D-06: Retry flow — executeWithRetry loop

```
executeWithRetry(taskId, ...):
  for attempt = 1 to MAX_RETRIES:
    try:
      return await executeDownload(taskId, ...)  ← preserves temp file, passes offset
    catch (error):
      if CanceledError → re-throw
      if !isRetriable(error) → re-throw
      
      entry = activeDownloads.get(taskId)
      if !entry → throw (was removed during wait — pause/cancel)
      
      entry.retryCount = attempt
      delay = calculateBackoff(attempt)
      emit log
      await waitWithBackoff(taskId, delay)  ← timer stored in retryTimers
      // Timer fires → next iteration of loop
  
  // All retries exhausted:
  cleanupDownload(taskId)
  emit 'failed' progress with retry-exhausted message
  throw final error
```

The `waitWithBackoff` function returns a Promise that resolves after the delay. If `cancelRetryTimer` is called during the wait, the timer is cleared and the promise rejects (or we check `activeDownloads.has(taskId)` after the wait).

### D-07: PAUSE handler changes

Add `cancelRetryTimer(taskId)` at handler entry. If a retry-waiting task is paused:
1. Cancel retry timer (no more retry will fire)
2. Write state file from temp file (enable future resume)
3. `cleanupDownload(taskId, true)` — remove from activeDownloads, preserve temp file
4. Emit 'paused' progress event
5. `processQueue()` — slot is now free

### D-08: CANCEL handler changes

Add `cancelRetryTimer(taskId)` at handler entry. If a retry-waiting task is cancelled:
1. Cancel retry timer
2. `cleanupDownload(taskId)` — delete temp file, remove from activeDownloads
3. Emit cancelled/removed progress event
4. `processQueue()` — slot is now free

### D-09: No type changes in Phase 34

The `'retrying'` state on `DownloadState`, `DownloadProgressData`, and any `retryCount`/`retryDelay` fields are **deferred to Phase 35**. During retry in Phase 34, no progress event is emitted — the renderer sees no update until the download either succeeds or permanently fails.

This means: no changes to `src/types/index.ts`, `src/shared/types/ipc.ts`, `src/composables/download/useDownload.ts`, or `src/stores/modules/download/index.ts`.

### D-10: Modified executeDownload catch block

When a retriable error occurs and retries remain (checked via `activeDownloads.get(taskId)?.retryCount < MAX_RETRIES`):
- **Skip** the `cleanupDownload(taskId)` call
- **Skip** the 'failed' progress event emission
- **Skip** the throw — instead, just re-throw the original error so `executeWithRetry` can catch and handle it

When the error is permanent or retries exhausted:
- Existing behavior unchanged — cleanup, emit 'failed', re-throw

### D-11: Resume downloads and retry

A resumed download (with offset) may also fail with a transient error. The retry mechanism applies the same way — `executeDownload` is called with offset, and if it fails transiently, the retry loop re-attempts from the same offset. The temp file still exists, so the Range request can continue from the current offset.

### D-12: Error toast suppression

Since no 'failed' progress event is emitted during retry, the renderer's `handleProgress` never hits the `if (error)` branch that calls `showError()`. No changes needed in the renderer for Phase 34.

### D-13: Configuration constants in download.handler.ts

```
BACKOFF_BASE_MS = 2000
BACKOFF_MAX_MS  = 30000
MAX_RETRIES     = 3
```

These are module-level constants in `download.handler.ts`. Future phases can lift them to settings (DL-NEXT).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Planning
- `.planning/PROJECT.md` — Core value, constraints, scope
- `.planning/REQUIREMENTS.md` — DL-05 through DL-09 detailed specs
- `.planning/ROADMAP.md` — Phase dependencies, success criteria
- `.planning/STATE.md` — Current state, accumulated context

### Prior Phase Context
- `.planning/phases/33-download-queue-concurrency/33-CONTEXT.md` — Queue architecture, slot model (MUST READ)
- `.planning/phases/33-download-queue-concurrency/33-VERIFICATION.md` — Verified DL-01–DL-04, existing patterns

### Codebase Maps
- `.planning/codebase/ARCHITECTURE.md` — Download flow, IPC patterns
- `.planning/codebase/INTEGRATIONS.md` — IPC channel list, download flow diagram

### Key Source Files

#### Must Modify
- `electron/main/ipc/handlers/download.handler.ts` — Add `executeWithRetry`, `classifyDownloadError`, `calculateBackoff`, `retryTimers`, `cancelRetryTimer`, modify `executeDownload` catch block, modify PAUSE/CANCEL handlers, change `onDequeue` to use `executeWithRetry`

#### Reference (read-only)
- `electron/main/ipc/handlers/download-queue.ts` — Queue class, singleton accessors, processQueue behavior
- `src/types/index.ts:180` — `DownloadState` type (no changes in Phase 34)
- `src/shared/types/ipc.ts:172` — `DownloadProgressData` type (no changes in Phase 34)
- `src/composables/download/useDownload.ts:83` — `handleProgress` (no changes in Phase 34)
- `src/stores/modules/download/index.ts` — Download store, task state management (no changes)
- `.planning/research/PITFALLS.md` — Pitfalls P2 (permanent error retry), P3 (zombie), P4 (retry storm), P9 (error toast explosion)

</canonical_refs>

<code_context>
## Existing Code Insights

### executeDownload catch block (download.handler.ts:410-434)
```typescript
} catch (error: any) {
    if (error.name === 'CanceledError' || error.code === 'ERR_CANCELED') {
      throw error
    }
    logHandler('executeDownload', `Download failed: ${taskId}: ${error.message}`, 'error')
    cleanupDownload(taskId)                     // ← MUST NOT call for retriable errors
    const windows = BrowserWindow.getAllWindows()
    if (windows.length > 0) {
      windows[0].webContents.send('download-progress', {  // ← MUST NOT emit for retriable errors
        taskId, progress: 0, offset: 0, speed: 0,
        state: 'failed', error: error.message || '下载失败',
      })
    }
    throw error
}
```

### onDequeue callback (download.handler.ts:440-447)
```typescript
const downloadQueue = new DownloadQueue(
  () => activeDownloads.size,
  async (item: QueuedDownload) => {
    try {
      await executeDownload(item.taskId, item.url, item.filename, item.saveDir, item.offset)
    } finally {
      downloadQueue.processQueue()  // ← Slot freed on any completion/failure
    }
  },
)
```
Will change to:
```typescript
async (item: QueuedDownload) => {
    await executeWithRetry(item.taskId, item.url, item.filename, item.saveDir, item.offset)
}
```
The `processQueue()` call moves to `executeWithRetry`'s error path (after retries exhausted), while success path relies on the queue's existing processQueue-after-onDequeue behavior.

### PAUSE handler (download.handler.ts:544)
- Currently: checks queue first, then activeDownloads, aborts, writes state file, cleanup, processQueue
- Need to add: `cancelRetryTimer(taskId)` before activeDownloads lookup

### CANCEL handler (download.handler.ts:620)
- Currently: checks queue first, then activeDownloads, aborts, cleanup, processQueue  
- Need to add: `cancelRetryTimer(taskId)` before activeDownloads lookup

### ActiveDownload interface (download.handler.ts:34-44)
```typescript
interface ActiveDownload {
  abortController: AbortController
  tempPath: string
  saveDir: string
  filename: string
  totalSize: number
  downloadedSize: number
  lastPersistTime: number
  lastPersistOffset: number
}
```
Need to add: `retryCount?: number`
</code_context>

<specifics>
## Specific Ideas

1. **executeWithRetry uses a for loop, not recursion** — cleaner control flow, no stack concerns, easy to add logging per attempt.
2. **waitWithBackoff creates a Promise with setTimeout** — the Promise is stored in retryTimers so PAUSE/CANCEL can reject it by clearing the timer.
3. **Backoff timer fires → check if entry still exists** — after await, verify `activeDownloads.has(taskId)` before proceeding (handles edge case where task was removed during timer tick).
4. **No new IPC channels** — Phase 34 does not emit 'retrying' state. Only existing 'failed' (for permanent) and 'completed' (for success) events are used.
5. **Error message for exhausted retries** — `"下载失败 — 已重试 3 次: ${originalError}"`. This is the 'failed' error field that Phase 35's UI will format.
</specifics>

<deferred>
## Deferred Ideas

1. **'retrying' state and UI display** — Phase 35
2. **Error toast suppression during retry** — Phase 35 (handled implicitly in Phase 34 by not emitting 'failed')
3. **Configurable max retries in settings** — DL-NEXT
4. **"Resume all" button to reset backoff timers** — future
5. **Manual retry button for permanently failed downloads** — future
</deferred>

---

*Phase: 34-错误分类与重试退避*
*Context gathered: 2026-05-01 (--auto mode)*
