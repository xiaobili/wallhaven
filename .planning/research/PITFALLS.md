# Pitfalls Research: Concurrent Download + Retry Backoff

**Domain:** Electron wallpaper downloader — adding concurrent download control and automatic retry with exponential backoff to an existing sequential download system
**Researched:** 2026-05-01
**Confidence:** HIGH (based on codebase analysis + well-known distributed systems and concurrency patterns)

---

## Critical Pitfalls

### Pitfall 1: Semaphore Implemented Only in Renderer (Window-Scoped Illusion)

**What goes wrong:**
The concurrency limit appears to work during testing but fails when the user has multiple windows open, or when the main process receives concurrent IPC calls faster than the renderer can throttle. Downloads exceed the configured `maxConcurrentDownloads` limit, causing excessive network connections and file handle contention.

**Why it happens:**
The existing architecture has download initiated from the renderer (Vue composable) but the actual HTTP download happens in the main process. If the concurrency semaphore is implemented only in `useDownload` composable (renderer-side), it has no effect on:

1. The main process `activeDownloads` Map — which accepts any incoming IPC call
2. Windows that share the same main process but have separate composable instances
3. Programmatic calls from the main process itself (e.g., retry logic that re-invokes `start-download-task`)

The `useDownload` composable is instantiated per-component. Each `DownloadWallpaper.vue`, `OnlineWallpaper.vue`, and `FavoritesPage.vue` has its own composable instance. A per-instance semaphore is not a system-wide semaphore.

**How to avoid:**
Make the concurrency semaphore authoritative in the main process, not the renderer. The main process should:

1. Read `maxConcurrentDownloads` setting (already in `electron-store`)
2. Track the count of currently active downloads that are actually streaming data
3. Queue incoming `start-download-task` requests when at capacity
4. Dequeue and process the next task when a download completes, fails, or pauses

The renderer sends "enqueue" commands, not "start immediately" commands. The main process decides when to actually execute.

**Warning signs:**
- QA test: Open 3 app windows, start 2 downloads in each with `maxConcurrentDownloads = 3`. If more than 3 downloads run simultaneously, the semaphore is renderer-only and broken
- Code review: Semaphore logic lives in `useDownload.ts` instead of `download.handler.ts`
- No `activeDownloadCount` tracking in the main process handler

**Phase to address:**
Phase 1 — Queue Infrastructure (must be in main process from the start; retrofitting later is a rewrite)

---

### Pitfall 2: Retry Retriggers on Transient Errors After Permanent Failure

**What goes wrong:**
A download fails with a 404 (Not Found) or 403 (Forbidden) — a permanent, non-retriable error. The retry logic retries anyway, wasting bandwidth, filling logs, and delaying other downloads. After all retries are exhausted, it still shows "retrying..." to the user instead of a clear permanent failure.

**Why it happens:**
Developers implement retry as "catch any error, apply backoff, retry" without distinguishing between:

- **Transient errors** — network timeout, DNS resolution failure, ECONNRESET, 429 Too Many Requests, 503 Service Unavailable — worth retrying
- **Permanent errors** — 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 413 Payload Too Large — retrying will always fail

Without error classification, every error gets the same retry treatment.

**How to avoid:**
Implement explicit error classification before the retry decision:

```typescript
// Transient — worth retrying
const TRANSIENT_ERRORS = new Set([
  'ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND',
  'ERR_NETWORK', 'ERR_CONNECTION_RESET', 'ERR_CONNECTION_REFUSED',
])

const HTTP_TRANSIENT_CODES = new Set([408, 429, 500, 502, 503, 504])

function isRetriable(error: unknown): boolean {
  const axiosError = error as any
  // Network-level transient errors
  if (axiosError.code && TRANSIENT_ERRORS.has(axiosError.code)) return true
  // HTTP-level transient errors
  if (axiosError.response?.status && HTTP_TRANSIENT_CODES.has(axiosError.response.status)) return true
  // Everything else is permanent
  return false
}
```

Do NOT retry on: 400, 401, 403, 404, 413, 415, or client-side abort (user-initiated pause/cancel).

**Warning signs:**
- Retry logic uses a single `catch` block without error classification
- User reports "I keep getting retried on a deleted wallpaper" (404 loop)
- Unit test: no test cases for different HTTP status codes in retry path

**Phase to address:**
Phase 2 — Retry with Backoff (must include error classification as a core part of the feature, not an afterthought)

---

### Pitfall 3: Retry and User Pause/Cancel Race — Reanimated Zombie Downloads

**What goes wrong:**
User clicks "Cancel" on a download that is currently in its retry backoff waiting period. The cancel IPC arrives, sets state to cancelled, and removes the task. But the retry timer was already scheduled (`setTimeout`), so the retry callback fires, re-invokes `start-download-task`, and a cancelled download comes back to life — a "zombie download."

Similarly, user clicks "Pause" during backoff wait; the pause sets state to paused, but the retry fires, overwrites paused state back to downloading.

**Why it happens:**
Retry timers (setTimeout) and IPC cancellation are asynchronous and uncoordinated. The timer closure captures the task ID but does not check the current task state before executing.

```typescript
// Dangerous pattern:
setTimeout(() => {
  // This fires regardless of whether user cancelled during the wait
  startDownload(taskId) // Might resurrect a cancelled download!
}, backoffDelay)
```

**How to avoid:**
Every retry attempt MUST check the current task state before executing:

```typescript
async function retryDownload(taskId: string): Promise<void> {
  // Check if task still exists and is still in 'failed' state
  const task = findTask(taskId)
  if (!task || task.state !== 'failed') {
    // User cancelled or paused during backoff — do nothing
    console.log('[Retry] Skipping — task no longer in failed state:', taskId, 'current state:', task?.state)
    return
  }

  // Only then attempt the retry
  await startDownload(taskId)
}
```

Additionally, use an abort-friendly retry mechanism:

```typescript
// Store retry controllers so cancel/pause can abort waiting retries
const retryTimers = new Map<string, { timer: ReturnType<typeof setTimeout>, cancelled: boolean }>()

function scheduleRetry(taskId: string, delay: number): void {
  // Cancel any existing retry timer for this task
  cancelRetryTimer(taskId)

  const retryEntry = { timer: null as any, cancelled: false }

  retryEntry.timer = setTimeout(() => {
    if (retryEntry.cancelled) return // Abort check
    retryTimers.delete(taskId)
    attemptRetry(taskId)
  }, delay)

  retryTimers.set(taskId, retryEntry)
}

function cancelRetryTimer(taskId: string): void {
  const existing = retryTimers.get(taskId)
  if (existing) {
    existing.cancelled = true
    clearTimeout(existing.timer)
    retryTimers.delete(taskId)
  }
}
```

Call `cancelRetryTimer(taskId)` in both pause and cancel flows.

**Warning signs:**
- QA test: Start download, wait for failure, immediately cancel during backoff wait. If download restarts, zombie bug is present
- No `retryTimers` Map or equivalent cancellation mechanism
- Retry logic directly calls `startDownload` without checking task state

**Phase to address:**
Phase 2 — Retry with Backoff (zombie prevention must be built into the retry infra, not patched later)

---

### Pitfall 4: Unbounded Queue Growth with Storm Retry

**What goes wrong:**
Multiple downloads fail simultaneously (e.g., network outage). Each enters retry backoff with its own independent timer. When the network comes back, all timers fire in close succession, causing a "retry storm" — N simultaneous download attempts that overwhelm both the network connection and the concurrency semaphore.

Worse: if each retry also fails (still transient), the retries compound. With exponential backoff capped at e.g. 30 seconds, after 5 minutes of outage, when network recovers, there could be dozens of downloads all retrying within seconds of each other.

**Why it happens:**
Each download's retry timer is independent. There is no system-wide coordination. The concurrency semaphore only throttles initial starts, not retry re-starts.

**How to avoid:**
1. **Retry MUST go through the same queue as initial downloads.** Do not bypass the concurrency semaphore. A retry is just "re-enqueue this task."
2. **Add jitter to backoff timing.** Exponential backoff without jitter causes synchronized retries (the "thundering herd" problem):
   ```typescript
   // Full jitter strategy — most resilient for multiple concurrent retries
   function calculateBackoff(attempt: number, baseMs: number, maxMs: number): number {
     const exponential = Math.min(baseMs * Math.pow(2, attempt), maxMs)
     // Full jitter: random(0, exponential)
     return Math.random() * exponential
   }
   ```
3. **Cap the total number of retry-in-flight tasks.** If too many tasks are in retry-waiting state, throttle new task creation at the addTask level.

**Warning signs:**
- Retry timer fires and directly calls `start-download-task` IPC without going through the queue
- All backoff timers use the same base delay with no jitter
- After a network recovery, logs show a burst of download starts within a 1-second window

**Phase to address:**
Phase 1 — Queue Infrastructure (retry must respect the queue) + Phase 2 — Retry with Backoff (jitter and capping)

---

### Pitfall 5: Progress Persistence Corruption Under Concurrent Writes

**What goes wrong:**
With N downloads running concurrently, each download writes its own `.download.json` state file (throttled to every 5 seconds or 10MB). Two or more downloads write their state files simultaneously. On the filesystem level, these atomic writes target different files, so there is no collision in the traditional sense.

However, the *completed* race is more subtle: when a download completes, it deletes its `.download.json` state file via `fs.unlinkSync`. If the main process crashes at the exact moment between the state file deletion and the `activeDownloads.delete(taskId)`, the app restarts and sees the state file still present. Since the download actually completed (the `.download` temp file was renamed to the final file), the state file points to a temp file that no longer exists.

This is an *existing* race in the single-download case too, but concurrency makes it more likely because:
1. More filesystem operations happening simultaneously
2. Higher total I/O pressure
3. More state files to scan on restart

**Why it happens:**
The completion sequence is not transactional:
```
1. fs.renameSync(tempPath, filePath)       // Move temp to final
2. fs.unlinkSync(statePath)                  // Delete state file
3. activeDownloads.delete(taskId)            // Remove from memory
```

If crash happens between step 1 and step 2, the app restarts with a stale state file pointing to a non-existent temp file.

**How to avoid:**
This is already partially handled — `get-pending-downloads` checks `if (!fs.existsSync(tempPath))` and deletes orphaned state files. Verify this is robustly tested:

1. Make sure the orphan cleanup logic is tested specifically for the completion race case (not just the general cleanup case)
2. Consider a write-ahead approach: delete the state file *before* renaming the temp file:
   ```
   1a. Write completion marker (optional)
   2a. fs.unlinkSync(statePath)          // Delete state BEFORE rename
   3a. fs.renameSync(tempPath, filePath)  // Now rename
   ```
   This way, if a crash occurs, the state file is gone, and no stale reference exists. The temp file (if rename didn't happen) will be cleaned up by `cleanupOrphanFiles` based on its age.

**Warning signs:**
- After app crash, user sees "resumable download" entries that have no corresponding `.download` file
- Restart logs show "state file deleted (temp missing)" warnings
- QA test: Kill the main process during concurrent downloads, restart, check for orphaned state files

**Phase to address:**
Phase 1 — Queue Infrastructure (during completion flow review, fix the state file ordering)

---

### Pitfall 6: `BrowserWindow.getAllWindows()[0]` Hardcode Breaks with Multiple Windows

**What goes wrong:**
The main process download handler sends progress updates via:
```typescript
const windows = BrowserWindow.getAllWindows()
if (windows.length > 0) {
  windows[0].webContents.send('download-progress', ...)
}
```

This always sends to the first window in the list. If the user has multiple windows open (which is possible in Electron), only the first window receives progress updates. The second window sees stale download progress or no progress at all.

With concurrent downloads, this becomes more problematic because:
1. The user might open `DownloadWallpaper.vue` in a second window to monitor progress
2. Progress data for different downloads might arrive interleaved, and only one window gets the updates
3. If the first window is minimized or on another virtual desktop, the user watching the second window sees no activity

**Why it happens:**
The original single-window assumption ("we only have one main window"). Electron's `BrowserWindow.getAllWindows()` returns an array; `[0]` assumes the first window is always the right target.

**How to avoid:**
Use `webContents.send` to all interested windows, or better, use the sender's `BrowserWindow.fromWebContents()` pattern:

```typescript
// Option A: Broadcast to all windows
const windows = BrowserWindow.getAllWindows()
for (const win of windows) {
  win.webContents.send('download-progress', data)
}

// Option B: Use sender's window (requires event reference in handler)
ipcMain.handle('start-download-task', (event, params) => {
  const senderWindow = BrowserWindow.fromWebContents(event.sender)
  // Store sender window for this download
  // Later, send progress to that specific window
})
```

Option A is simpler and works well for an app where download state is global (showing the same download list in any window is correct behavior). If download state should be per-window, use Option B.

**Warning signs:**
- `windows[0]` pattern exists anywhere in handler code
- QA test: Open second window, start download in first window, check if progress updates in second window
- Progress data received only in one specific window

**Phase to address:**
Phase 1 — Queue Infrastructure (fix the progress broadcast as part of refactoring the main process download handler)

---

### Pitfall 7: IPC Serialization Overhead with High-Frequency Progress Updates

**What goes wrong:**
With N concurrent downloads each sending progress events every 100ms, the IPC channel `download-progress` carries N x 10 events per second. Each event includes a full `DownloadProgressData` object that Electron serializes/deserializes via structured clone. At N=10 (max concurrency), this is 100 IPC events/second for progress alone.

Symptoms:
- UI thread jank from too many rapid reactive updates
- CPU usage from constant structured clone serialization
- Download progress bars appear to "stutter" because Vue's reactivity batching is overwhelmed

**Why it happens:**
The existing progress interval (100ms) was reasonable for a single download. With N concurrent downloads, the total IPC frequency scales linearly. The renderer's `handleProgress` callback fires for every event, each triggering Vue reactive updates, DOM mutations, and potentially store writes.

**How to avoid:**

1. **Batch progress updates on the renderer side** — collect incoming events over a short window (e.g., 200-300ms) and apply them in a single reactive batch:
   ```typescript
   private progressBuffer = new Map<string, DownloadProgressData>()
   private batchTimer: ReturnType<typeof setInterval> | null = null

   handleProgress(data: DownloadProgressData): void {
     this.progressBuffer.set(data.taskId, data)
     if (!this.batchTimer) {
       this.batchTimer = setInterval(() => this.flushProgress(), 200)
     }
   }

   private flushProgress(): void {
     // Apply all buffered updates in one batch
     for (const [taskId, data] of this.progressBuffer) {
       store.updateProgress(data)
     }
     this.progressBuffer.clear()
   }
   ```

2. **Reduce main-process sending frequency** — instead of N independent 100ms intervals, have a single tick that sends aggregated updates:
   ```typescript
   // Single timer in main process instead of per-download data handlers
   setInterval(() => {
     const batch = Array.from(activeDownloads.entries()).map(([id, dl]) => ({
       taskId: id,
       offset: dl.downloadedSize,
       speed: dl.currentSpeed,
       // ... computed from the active download state
     }))
     win.webContents.send('download-progress-batch', batch)
   }, 200)
   ```

3. **Throttle UI updates** in the download store — debounce rapid progress changes when the view is not visible (document.hidden check).

**Warning signs:**
- Profile shows high CPU in structuredClone during download activity
- Vue devtools show excessive reactive updates on `downloadingList`
- Download progress bars visually jitter or jump instead of smooth

**Phase to address:**
Phase 1 — Queue Infrastructure (reduce IPC frequency as part of refactoring the progress reporting)

---

### Pitfall 8: Race Between `restorePendingDownloads` and New Download Starts

**What goes wrong:**
On app startup, `restorePendingDownloads` restores paused downloads from the previous session and iterates them. If the user immediately starts a new download (or multiple new downloads), the restored tasks and new tasks compete for the concurrency semaphore. Since restoration happens in a synchronous loop (`for (const pending of pendingDownloads)`), all restored tasks get added to the `downloadingList` as 'paused' — but the code does not automatically resume them.

The problem is more subtle: the restoration pushes items into the reactive array. If the user's `maxConcurrentDownloads` is 3, and there are 5 restored paused tasks, the queue now has up to 5 + new tasks. The concurrency semaphore must handle this scenario — should all 5 show as 'paused' (waiting manual resume), or should it auto-resume up to the limit?

**Why it happens:**
The current restoration code restores tasks as 'paused' and expects the user to manually resume them. With concurrency, this becomes confusing:
1. Restored tasks take slots in the download list
2. New tasks added by the user wait in 'waiting' state
3. The user must manually resume each paused task to free the concurrency slot
4. No clear mapping between paused count and concurrency limit

**How to avoid:**
Define a clear policy for restored tasks:

- **Conservative approach:** Auto-enqueue up to `maxConcurrentDownloads` restored tasks as 'downloading', leave the rest as 'paused' in the queue. This matches user expectation ("I had downloads running, they should resume").
- **Simpler approach:** All restored tasks start as 'waiting' in the queue, not 'paused'. The concurrency semaphore picks them up automatically as slots open.

Either way, the restoration must be queued through the same semaphore, not added directly to the download list:

```typescript
async restorePendingDownloads(): Promise<void> {
  const result = await downloadService.getPendingDownloads()
  if (!result.success || !result.data) return

  for (const pending of result.data) {
    // Add to queue as 'waiting' — semaphore decides when to resume
    addTask({ ... }) // This adds as waiting
    // Do NOT call resumeDownload here — let the queue handle it
  }
}
```

**Warning signs:**
- Startup code calls `resumeDownload()` directly on restored tasks (bypasses queue)
- Restored tasks show as 'paused' but auto-resume unpredictably
- User confusion: "I had 5 downloads running, now only 2 resumed"

**Phase to address:**
Phase 1 — Queue Infrastructure (restoration must respect the queue)

---

### Pitfall 9: Error Feedback Explosion — N Concurrent Downloads Fail Simultaneously

**What goes wrong:**
When a network outage occurs, all N active downloads fail within milliseconds of each other. Each failure triggers:
1. An IPC `download-progress` message with `state: 'failed'`
2. The renderer's `handleProgress` shows a `showError()` toast/alert per failure
3. Each failed download starts its retry backoff timer

The user sees N simultaneous error toasts (e.g., 10 error messages at once), which is overwhelming and dismisses the usefulness of error notifications. The screen gets spammed.

**Why it happens:**
The current `handleProgress` in `useDownload.ts` unconditionally calls `showError()` for every failure:
```typescript
if (error) {
  // ...
  showError(`下载失败: ${error}`)
  return
}
```

With concurrent downloads, N simultaneous failures mean N simultaneous error messages.

**How to avoid:**
1. **Debounce/aggregate error notifications:** Instead of showing an alert per failure, collect failures within a short window and show a single summary:
   ```typescript
   private failureBuffer: string[] = []
   private failureTimer: ReturnType<typeof setTimeout> | null = null

   private reportFailure(taskId: string, error: string): void {
     this.failureBuffer.push(`${taskId}: ${error}`)
     if (!this.failureTimer) {
       this.failureTimer = setTimeout(() => {
         const count = this.failureBuffer.length
         if (count === 1) {
           showError(this.failureBuffer[0])
         } else {
           showError(`${count} 个下载任务失败`)
         }
         this.failureBuffer = []
         this.failureTimer = null
       }, 500) // 500ms aggregation window
     }
   }
   ```

2. **Silence error notifications when retry is active.** If a download will be automatically retried, don't show an error toast. Only surface the error after all retries are exhausted.
3. **Show a status badge** (e.g., "3 downloads failed, retrying...") instead of individual toasts.

**Warning signs:**
- QA test: Simulate network disconnect with 5 active downloads. If 5 toasts appear, this pitfall is active
- Retry logic shows error toast on every retry attempt (user sees "failed" -> "retrying" -> "failed" repeatedly)
- No batch/aggregate error display in the download UI

**Phase to address:**
Phase 2 — Retry with Backoff (suppress errors during retry) + Phase 3 — UX Polish (aggregated error display)

---

## Technical Debt Patterns

### Debt 1: `useDownload` Duplicates Store Logic

`useDownload.composable.ts` duplicates `addTask` logic that already exists in the download store. The composable's `startDownload` and `resumeDownload` directly mutate store state (e.g., `task.state = 'downloading'`) rather than going through store methods like `store.resumeDownload()`. This bypasses the store's state management and makes future changes like adding a concurrency-aware queue harder.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Direct mutation of `task.state` in composable | Quick implementation, fewer abstraction layers | Queue/semaphore logic must be duplicated in both composable and store; state transitions are scattered | Never — always use store methods for state mutations |
| `startDownload` and `resumeDownload` have overlapping but slightly different logic | Handles both new and resume cases | Adding a unified queue means refactoring both methods; likely to miss one path | Temporary only, with a TODO to consolidate |

### Debt 2: Error Message Format Inconsistency

The main process sends errors as both strings (`{ error: "message" }` in start/download) and objects (`{ error: { code: "RESUME_FAILED", message: "..." } }` in resume). The renderer handles both but inconsistently — `result.error?.message` works for objects but returns `undefined` for plain strings. This is a latent bug that concurrency will expose more frequently.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| `result.error?.message || result.error` in catch blocks | Quick fix that covers both formats | Masked `undefined` errors; makes error classification (`isRetriable`) harder | Never — standardize error format first |

### Debt 3: Hardcoded 60-Second Timeout

`timeout: 60000` in `download.handler.ts` is hardcoded with no configuration. With concurrent downloads, aggressive timeout behavior is more likely (N connections competing for bandwidth), causing spurious timeouts on slow connections. Each timeout triggers error → retry, wasting a retry attempt.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Hardcoded 60s timeout | Simple implementation | Users with slow connections see retries for downloads that would succeed given more time | Acceptable for MVP if retry count is high enough to absorb spurious timeouts |

---

## Integration Gotchas

### Existing Pause/Resume vs. New Queue

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Pause during concurrent download | Calling `abortController.abort()` directly decrements the active count but does not signal the queue to start the next waiting task | Pause must trigger queue dequeue: abort download → mark state as paused → call `processQueue()` to start next waiting task |
| Resume from pause (user-initiated) | Calling `resumeDownload()` directly starts the HTTP Range request, bypassing the concurrency semaphore | Resume should enqueue the task as 'waiting' and let the semaphore decide when it starts (respecting `maxConcurrentDownloads`) |
| Cancel with retry active | `cancelDownload` removes the task from `downloadingList` but the retry timer is still running (zombie) | Cancel MUST call `cancelRetryTimer(taskId)` before removing the task |
| Concurrent + pause all | User sets concurrency to 1 while 5 downloads are active — all 5 must be paused first, then 1 resumed. Naive implementation would instantly kill 4 connections with AbortController | Lowering concurrency should gracefully pause excess active downloads (complete current chunks, then pause) |

### Retry with Existing Error Handling

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Retry triggering error toast | Each retry failure shows a `showError()` toast, filling the UI with noise | Suppress error display during retry attempts; only surface after all retries exhausted |
| Retry with `RESUME_FILE_NOT_FOUND` | Retrying a download where the temp file was deleted will keep failing with the same error | `RESUME_FILE_NOT_FOUND` is a permanent error — do NOT retry. Add to non-retriable error codes |
| Retry with `RESUME_INVALID_OFFSET` | Same logic — retry will always fail because offset data is corrupt | Permanent error — do NOT retry |
| Retry overwriting `paused` state | If user pauses during retry backoff wait, retry timer fires and changes state back to 'downloading' | Always check `task.state === 'failed'` before retrying; pause changes state to 'paused', which blocks retry |

### Settings Change (`maxConcurrentDownloads`) With Active Downloads

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| User reduces concurrency from 5 to 2 while 5 are active | No action taken; 5 continue running (setting has no effect until next download start) | Gracefully pause the excess (5 - 2 = 3) active downloads to respect the new limit |
| User increases concurrency from 2 to 8 while queue has waiting downloads | No action taken; waiting downloads stay waiting until next completion | Immediately process the queue up to the new limit (start additional downloads) |
| Settings save triggers queue re-evaluation | Settings change only persisted but queue never re-evaluated | Settings service should emit a queue-re-evaluation event when `maxConcurrentDownloads` changes |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Per-download 100ms progress IPC timer | High IPC message count, UI thread jank with N concurrent downloads | Batch progress updates server-side, send aggregated batch every 200-300ms | At 3+ concurrent downloads on the current 100ms-per-download cadence (30+ msgs/s) |
| All downloads share one 60s timeout | Spurious timeout failures when bandwidth is shared among N downloads | Make timeout configurable per-download based on file size or use dynamic timeout | When bandwidth < (N x avg_file_size / 60) |
| `JSON.parse`/`stringify` on every state persist | Write amplification on every progress tick (throttled to 5s/10MB currently, but state file contains full PendingDownload object) | Use binary or append-only state format; batch persists | At 10 concurrent downloads each persisting a 1KB JSON state file every 5 seconds — minor but cumulative on low-end storage (e.g., Raspberry Pi SD card running Electron via ARM) |
| `downloadingList.find()` O(N) on every progress event | Current code uses `Array.find` to locate the task for each progress update. With concurrent downloads, each progress event scans the entire list | Use a `Map<string, DownloadItem>` for O(1) lookup instead of array search | At 50+ queued items in the download list (mostly finished/paused) |
| `BrowserWindow.getAllWindows()` on every progress tick | Each progress event iterates all windows and sends to `[0]`. With N downloads at 100ms, this is Nx10 getAllWindows() calls/second | Cache the window reference, or use `webContents.send` without getAllWindows | Not a bottleneck at typical scale but unnecessary work |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Retry does not re-validate URL before re-requesting | If download URL contains a signed token (expiring URL), retry after expiry sends a stale token. Server returns 403/401, which triggers permanent error. This is correct behavior (fail fast) but could catch developers off-guard | Document that retry is URL-based and any URL with time-limited auth will fail on retry. This is a known limitation, not a bug |
| Concurrent downloads writing to same filename | Two concurrent downloads of the same wallpaper (different task IDs) write to different `filename_N.ext` incremental files | Current code already adds incremental counters (`_1`, `_2`) in the start-download handler. Verify this works correctly when both downloads start simultaneously (race on `fs.existsSync` check) |
| State file path traversal via filename | If the wallpaper filename contains `../` or path separators, the state file path calculation `tempPath + '.json'` could write outside the download directory | Sanitize filenames at the addTask level; reject filenames containing `..`, `/`, `\`, or null bytes |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Batch download with no progress visibility | User adds 10 wallpapers to download — all 10 show "waiting" state with no indication of when they'll start | Show queue position ("#3 of 8 waiting") and estimated wait time based on current speed and concurrency |
| Retry spinning forever without feedback | Download shows "failed" briefly, then "downloading" again with no indication it's a retry. User doesn't know whether progress is real progress or a retry | Show retry state explicitly: "下载失败，30秒后重试 (2/3)" with a countdown; when retrying, show "重新连接中..." not "downloading" |
| Concurrency slider feels broken | User sets maxConcurrentDownloads to 5 but sees only 2 active because other 3 are somehow blocked | Show active count / limit clearly: "2/5 下载中" in the header. Immediate visual feedback when slider changes |
| App restart resumes all paused tasks at once | User had 10 paused downloads and set concurrency to 3. On restart, they expect 3 to resume. But if restoration logic is wrong, all 10 show as paused with none auto-resuming | Auto-resume up to `min(restored_count, maxConcurrentDownloads)` tasks on startup. Clearly label the rest as "pending — awaiting slot" |
| Network recovery after failure — stale retry indicators | Downloads are retrying with increasing backoff (1s, 2s, 4s...). Network recovers. User has to wait for the current backoff timer to expire (up to cap) before retry fires | Consider a "resume all" button that resets backoff timers and immediately retries all failed downloads. Or detect network recovery (if Electron offers net.online) and trigger immediate retry |
| Drag slider to 1 while 5 are active | 4 downloads abruptly fail/stop without explanation | Graceful: complete the current chunk for the 4 to-be-paused downloads, then pause them. Show a brief toast: "并发数已调整，已暂停 4 个下载任务" |

---

## "Looks Done But Isn't" Checklist

- [ ] **Concurrency slider:** Slider changes value in settings but the main process never re-reads `maxConcurrentDownloads` — the semaphore still uses the old value. Verify that changing settings triggers a queue re-evaluation.
- [ ] **Retry display:** The download shows "downloading" state during retry, indistinguishable from a first attempt. The user cannot tell the difference between progress and a retry. Verify that retry state is visually distinct.
- [ ] **Retry cancel during backoff:** User sees download in "failed — retrying in 10s" and clicks cancel. The cancel IPC runs but the retry timer fires and re-downloads. Verify that cancelling during backoff actually prevents the retry.
- [ ] **Concurrent download count accuracy:** The `totalActive` computed property in the store counts anything with `state === 'downloading'`. But with retry, a task might show 'downloading' while actually waiting for backoff timer. Verify that the active count reflects *actually active HTTP connections* not just tasks in retry state.
- [ ] **Persistence crash recovery:** After writing test (start N concurrent downloads, kill process, restart). Verify that: (a) no orphan state files remain, (b) no ".download" temp files are left without corresponding state, (c) restored count matches reality.
- [ ] **Error aggregation on network fail:** Start 5 downloads, disconnect network. Verify that 1 aggregated error toast appears instead of 5 individual toasts.
- [ ] **Progress IPC frequency:** With `maxConcurrentDownloads` set to 10, verify that the IPC channel carries no more than ~30 events/second total (not 10x10=100).
- [ ] **Settings change during active downloads:** Change concurrency from 3 to 1 while 3 downloads are running. Verify that exactly 2 are paused and 1 continues.
- [ ] **Retry jitter:** Start 5 downloads that all fail simultaneously. Verify that retry timers fire at different times (not all at the same second).

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Zombie download (retry after cancel) | LOW | Clear retry timer on cancel/pause. Already-firing retry checks task state before proceeding. At worst, user cancels again. Code fix in one file. |
| Progress persistence corruption | MEDIUM | State file already has orphan detection in `get-pending-downloads`. Add ordering fix (delete state before rename) to prevent the race. Existing orphan cleanup handles historical corruption. |
| Error toast explosion on network fail | LOW | Add aggregation buffer to `handleProgress`. Fix is localized to `useDownload.ts`. |
| Semaphore bypassed by direct IPC | HIGH | Requires moving queue logic to main process. This is a structural change — if not done in Phase 1, recovery requires a rewrite of the download handler. |
| Retry storm after network recovery | MEDIUM | Add jitter to backoff, cap retry concurrency. Fix is in the retry scheduling logic. If not done upfront, existing timers will need to be cancelled and rescheduled with jitter. |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Semaphore only in renderer (P1) | Phase 1 — Queue Infrastructure | Queue lives in main process `download.handler.ts`; renderer sends "enqueue" not "start" |
| Retry on permanent errors (P2) | Phase 2 — Retry with Backoff | Error classification unit test: verify 403, 404, 401 are not retried; ECONNRESET, 503 are retried |
| Zombie downloads (P3) | Phase 2 — Retry with Backoff | Retry timer cancellation on cancel/pause; state check before retry execution |
| Retry storm / unbounded queue (P4) | Phase 1 (queue) + Phase 2 (jitter) | Jitter in backoff calculation; retry goes through queue (not direct IPC); max retry-in-flight cap |
| Progress persistence corruption (P5) | Phase 1 — Queue Infrastructure | State file deleted before temp file rename; orphan cleanup correctly handles stale state files |
| `windows[0]` hardcode (P6) | Phase 1 — Queue Infrastructure | Progress broadcast to all windows; verified with multi-window test |
| IPC serialization overhead (P7) | Phase 1 — Queue Infrastructure | IPC frequency reduced; batch updates on renderer side; <30 events/sec at max concurrency |
| Restore race with new starts (P8) | Phase 1 — Queue Infrastructure | Restored tasks go through queue; auto-resume up to concurrency limit |
| Error feedback explosion (P9) | Phase 2 (retry) + Phase 3 (UX) | Aggregated error display; errors suppressed during active retry |
| Settings change during active downloads | Phase 1 — Queue Infrastructure | Queue re-evaluated when `maxConcurrentDownloads` changes; excess downloads gracefully paused |
| `useDownload` duplicating store state mutations | Phase 1 — Queue Infrastructure | All state mutations go through store methods; composable only orchestrates |

---

## Sources

- Existing codebase analysis: `electron/main/ipc/handlers/download.handler.ts`, `src/composables/download/useDownload.ts`, `src/stores/modules/download/index.ts`, `src/services/download.service.ts`
- AWS Architecture Blog — "Exponential Backoff and Jitter": well-known distributed systems pattern (retry storm, jitter)
- Electron IPC documentation — `webContents.send` and `BrowserWindow.getAllWindows` behavior under multiple windows
- Node.js `fs` module — atomic write patterns (state file write-vs-rename ordering)
- Axios error handling — `CanceledError` vs network errors vs HTTP errors classification
- Vue 3 reactivity batching — `triggerRef` and reactive array mutation performance under high-frequency updates
- *Personal experience / known patterns in Electron download managers*

---
*Pitfalls research for: v4.0 多线程下载与重试退避机制*
*Researched: 2026-05-01*
