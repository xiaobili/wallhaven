# Phase 33: 下载队列与并发控制 - Research

**Researched:** 2026-05-01
**Domain:** Electron main-process download queue and concurrency enforcement
**Confidence:** HIGH

## Summary

This phase introduces a FIFO download queue in the Electron main process that enforces the `maxConcurrentDownloads` setting. Currently, every `start-download-task` IPC call immediately starts an axios download -- there is no concurrency gating. The solution is a `DownloadQueue` class in a new file `electron/main/ipc/handlers/download-queue.ts` that mediates all download starts. The queue reads `maxConcurrentDownloads` from electron-store on each dequeue attempt (live setting propagation), works with the existing `activeDownloads` Map for active count tracking, and integrates with all four existing IPC handlers (start, pause, cancel, resume). No new IPC channels are needed -- the existing `'waiting'` state in `DownloadProgressData` is sufficient.

**Primary recommendation:** Create a ~60-line `DownloadQueue` class with `enqueue()`, `dequeueNext()`, `remove(taskId)`, and `processQueue()` methods. Refactor the download execution logic in `download.handler.ts` into a callable function `executeDownload()` that both the direct handler path and the queue path can invoke. Modify the four IPC handlers: START (enqueue instead of direct-start), PAUSE (if queued: remove; if active: abort + dequeueNext), CANCEL (if queued: remove; if active: abort + dequeueNext), RESUME (enqueue instead of direct-start). All of Phase 33's requirements (DL-01 through DL-04) are satisfied by this single architectural change.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Create a `DownloadQueue` class in a new file `electron/main/ipc/handlers/download-queue.ts`
- **D-02:** In-memory FIFO queue (not persisted) -- queue resets on app restart
- **D-03:** Queue holds `QueuedDownload` items with `{ taskId, url, filename, saveDir }`
- **D-04:** Active + queued tracking uses separate collections: `Queue<T>` for waiting, existing `activeDownloads` Map for running
- **D-05:** `maxConcurrentDownloads` read from electron-store on each dequeue -- import `store` from `electron/main/index.ts`
- **D-06:** Dequeue triggers: task added, active download completes/fails, active download paused/cancelled
- **D-07:** Graceful concurrency reduction (DL-04): setting drops from N to M, M active continue; queue only starts new at new limit
- **D-08:** `START_DOWNLOAD_TASK` handler enqueues instead of starting directly
- **D-09:** `PAUSE_DOWNLOAD_TASK` handler removes from queue if waiting; aborts + dequeues next if active
- **D-10:** `CANCEL_DOWNLOAD_TASK` handler removes from queue if waiting; cancels + dequeues next if active
- **D-11:** `RESUME_DOWNLOAD_TASK` handler enqueues instead of starting directly
- **D-12:** No new IPC channels -- existing `'waiting'` state is sufficient
- **D-13:** FIFO ordering -- first enqueued, first started
- **D-14:** Refactor existing download execution into reusable function for both direct and queue paths
- **D-15:** Import `store` from `electron/main/index.ts` -- `store.get('appSettings')?.maxConcurrentDownloads ?? 3`

### Claude's Discretion

- Exact implementation of the `Queue<T>` class (array-based is fine)
- Error handling details for queue operations
- Logging strategy for queue state changes
- Whether to extract the download execution logic into a shared function or use the queue class as orchestrator

### Deferred Ideas (OUT OF SCOPE)

None -- discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DL-01 | Follow maxConcurrentDownloads setting | DownloadQueue reads setting on each dequeue (D-05). `processQueue()` checks `activeDownloads.size < maxConcurrentDownloads` before starting next task. |
| DL-02 | Auto-queue excess downloads (state='waiting') | `enqueue()` adds to FIFO array and emits `'waiting'` progress event. `processQueue()` is called after enqueue to attempt immediate start if under limit. |
| DL-03 | Live setting propagation | `processQueue()` reads `store.get('appSettings')?.maxConcurrentDownloads ?? 3` on every invocation -- no caching. `DEQUEUE_EVENT` or direct call from settings change triggers re-evaluation. |
| DL-04 | Graceful concurrency reduction | `processQueue()` only starts new tasks when `activeDownloads.size < maxConcurrentDownloads`. Active downloads are never interrupted. Reduction from 5 to 2 means 3 complete normally; queue won't start next until active drops below 2. |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Download queue state | Main process (API) | -- | Existing `activeDownloads` Map is already in main process. Queue must be colocated to prevent multi-window bypass. |
| Concurrency limit read | Main process (API) | -- | `electron-store` is main-process only. IPC round-trip for a synchronous setting read is unnecessary overhead. |
| Download execution | Main process (API) | -- | Axios HTTP download, file I/O, AbortController -- all Node.js APIs only accessible from main process. |
| Queue state notification | Main process (API) | Renderer (Browser) | Main process sends `download-progress` with state `'waiting'`. Renderer receives and updates UI. |
| State visualization | Renderer (Browser) | -- | Vue store and template bindings render the download list. No queue logic in renderer. |
| Settings change | Renderer (Browser) | Main process | User changes `maxConcurrentDownloads` in SettingPage.vue. Setting save triggers queue re-evaluation in main process. |

## Standard Stack

This phase introduces **zero new dependencies**. All concurrency logic uses native TypeScript/Node.js APIs.

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js `Promise` | native | Async queue processing, promise-based semaphore | No external lib needed. Native Promise API handles all async patterns. |
| `electron-store` | 11.0.2 | Read `maxConcurrentDownloads` setting | Already in project. Direct synchronous read via `store.get()`. |

### No New Packages
Do not install `p-queue`, `p-limit`, `async-mutex`, or any queue library. The DownloadQueue class is trivially simple (~60 lines) and using a library adds a dependency for no benefit.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Native array Queue<T> | `p-queue` library | p-queue adds features (priority, concurrency per-request) we don't need. Array-based FIFO is simpler and zero dependencies. |
| Main-process queue | Renderer-side semaphore in useDownload composable | Renderer semaphore bypassable by multiple windows or direct IPC calls. Main-process queue is authoritative. |
| Event-based dequeue trigger | Dedicated IPC channel for queue state | Existing `download-progress` channel with `'waiting'` state works -- no channel changes needed. |

## Architecture Patterns

### System Architecture Diagram

```
Before (current):
  START_DOWNLOAD_TASK IPC → activeDownloads.set() → axios GET → stream → complete
  
  maxConcurrentDownloads setting: UNUSED

After (Phase 33):
  START_DOWNLOAD_TASK IPC
       │
       ▼
  DownloadQueue.enqueue()
       │
       ▼
  processQueue()
       │
       ├── activeDownloads.size < maxConcurrentDownloads?
       │       │
       │       YES ──→ executeDownload() → axios GET → stream → complete
       │       │                                            │
       │       │                                    on complete/fail
       │       │                                            │
       │       │                                     processQueue()
       │       │                                      (dequeue next)
       │       │
       │       NO ──→ emit 'waiting' progress event
       │               (task stays in queue)
       │
  PAUSE/CANCEL IPC
       │
       ├── task in queue? → queue.remove(taskId)
       │
       └── task active? → abortController.abort()
                           cleanup()
                           processQueue()  ← slot freed

  RESUME_DOWNLOAD_TASK IPC → DownloadQueue.enqueue()
                               │
                               └── processQueue() as above

  maxConcurrentDownloads change (from renderer settings save)
       │
       └── triggers processQueue() re-evaluation
```

### Recommended Project Structure

No structural changes -- only new files and modifications:

```
electron/main/ipc/handlers/
├── download-queue.ts      # NEW: DownloadQueue class
├── download.handler.ts    # MODIFY: extract execution, integrate queue
└── index.ts               # MODIFY: if queue needs module-level init (probably not)
```

### Pattern 1: DownloadQueue Semaphore Class

**What:** A minimalist FIFO queue that gates concurrent download execution using a promise-based semaphore pattern.

**When to use:** Single-resource concurrency gating where `maxConcurrentDownloads` is the only constraint.

**Key design:**
- `_queue: QueuedDownload[]` -- FIFO array for waiting tasks
- `processQueue()` -- core method called on every state change
- Reads `maxConcurrentDownloads` fresh from electron-store each time (no caching)
- Emits `'waiting'` progress event for queued tasks via existing `download-progress` channel

**Example:**
```typescript
// electron/main/ipc/handlers/download-queue.ts
import { BrowserWindow } from 'electron'
import { store } from '../index'  // D-15

interface QueuedDownload {
  taskId: string
  url: string
  filename: string
  saveDir: string
}

/**
 * DownloadQueue: FIFO queue that enforces maxConcurrentDownloads.
 * All state transitions (enqueue, complete, fail, pause, cancel) call processQueue()
 * which reads the concurrency setting fresh from electron-store each time (DL-03).
 */
export class DownloadQueue {
  private _queue: QueuedDownload[] = []
  private _activeCount: () => number  // Callback to read activeDownloads.size

  constructor(getActiveCount: () => number) {
    this._activeCount = getActiveCount
  }

  get length(): number { return this._queue.length }
  get isWaiting(): boolean { return this._queue.length > 0 }

  /**
   * Add a task to the queue and try to start it.
   * If under the concurrency limit, starts immediately.
   * If at capacity, stays queued and emits 'waiting' state.
   */
  enqueue(item: QueuedDownload): void {
    this._queue.push(item)
    this.processQueue()
  }

  /**
   * Core logic: read maxConcurrentDownloads, check capacity, start next.
   * Called after every state change that could free a slot.
   */
  processQueue(): void {
    const maxConcurrent = store.get('appSettings')?.maxConcurrentDownloads ?? 3

    while (this._activeCount() < maxConcurrent && this._queue.length > 0) {
      const next = this._queue.shift()!
      this._executeDownload(next)
    }
  }

  /**
   * Remove a queued task by taskId (used by pause/cancel for waiting tasks).
   * Returns true if found and removed, false if not in queue.
   */
  remove(taskId: string): boolean {
    const idx = this._queue.findIndex((item) => item.taskId === taskId)
    if (idx !== -1) {
      this._queue.splice(idx, 1)
      return true
    }
    return false
  }

  /**
   * Start the actual download by calling the extracted execution function.
   * On completion/failure, call processQueue() to start the next task.
   */
  private async _executeDownload(item: QueuedDownload): Promise<void> {
    try {
      await executeDownload(item.taskId, item.url, item.filename, item.saveDir)
    } finally {
      this.processQueue()  // Slot freed -- try to start next
    }
  }
}
```

### Pattern 2: Download Execution Extraction

**What:** Extract the actual HTTP download logic from the IPC handler into a standalone `executeDownload()` function so both direct-start (from queue) and pause/cancel paths share the same code.

**Where:** Can live in `download.handler.ts` (exported) or in `download-queue.ts` (if preferred). The CONTEXT.md leaves this to discretion.

**Recommended approach:** Keep `executeDownload()` in `download.handler.ts` and export it, since it uses `activeDownloads` Map, `cleanupDownload()`, and progress notification -- all of which are already in that module. The queue imports and calls it.

```typescript
// electron/main/ipc/handlers/download.handler.ts

/**
 * Execute a download from start to finish.
 * Extracted from the START_DOWNLOAD_TASK handler so both
 * the direct handler path and the queue can use it.
 * 
 * @returns The final file path on success
 * @throws On failure (caller handles error and processQueue)
 */
export async function executeDownload(
  taskId: string,
  url: string,
  filename: string,
  saveDir: string,
): Promise<{ filePath: string }> {
  // [lines 247-461 from current START_DOWNLOAD_TASK handler, extracted]
  // Returns { filePath } on success
  // Throws on network/IO error
  // AbortController.abort() causes CanceledError (handled by caller)
}
```

### Anti-Patterns to Avoid

- **Queue in renderer process:** A download queue in `useDownload.ts` composable is per-component-instance and can be bypassed by multiple windows, direct IPC calls, or programmatic retry from the main process. The queue MUST be in the main process alongside the `activeDownloads` Map.
- **Caching maxConcurrentDownloads:** Reading the setting once and storing it locally means DL-03 (live propagation) is broken. Read it fresh on every `processQueue()` call.
- **Async queue processing with promises that can't be aborted:** The queue should not hold unresolved promises for queued tasks -- only start the download when a slot is available. The `enqueue()` method adds to the array and returns immediately (the IPC handler does not await the download).
- **Direct mutation of renderer state from main process through IPC replies:** The IPC `handle` return should be minimal. Progress is communicated through `download-progress` events, not through the handler's return value.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Concurrency semaphore | Custom `Promise` mutex with resolve/release tracking | Native `processQueue()` pattern checking `activeDownloads.size` | The queue is not a general-purpose semaphore -- it's a FIFO array gated by a simple size check. `activeDownloads` already tracks running tasks. No need for acquire/release with resolution tracking. |
| Queue persistence | JSON serialization of queue state | In-memory only (D-02) | Deferred to DL-NEXT. Queue resets on restart, consistent with existing non-persistent `activeDownloads`. |
| IPC channel for queue state | New IPC channel name for 'waiting' state | Existing `download-progress` channel | The `'waiting'` state is already in the `DownloadProgressData` type union. No type changes, no preload changes, no service layer changes needed. |

**Key insight:** This phase is 95% about integration and 5% about new code. The queue class is trivially simple. The complexity comes from correctly hooking into four IPC handlers that each have different state management needs.

## Common Pitfalls

### Pitfall 1: Queue Does Not Dequeue on Completion/Failure
**What goes wrong:** Tasks pile up in the queue because `processQueue()` is only called on `enqueue()`. When a download completes, the slot is freed but no one starts the next waiting task.

**Why it happens:** The existing completion code at line ~406 (`activeDownloads.delete(taskId)`) does not trigger any queue processing.

**How to avoid:** Call `downloadQueue.processQueue()` in a `finally` block after every `executeDownload()` call, and also in the PAUSE and CANCEL handlers after aborting an active download.

**Warning signs:** User sets concurrency to 1, starts 3 downloads -- first finishes, second stays in 'waiting' forever.

### Pitfall 2: IPC Handler Returns Before Download Completes
**What goes wrong:** The IPC handler contract changes. Currently `START_DOWNLOAD_TASK` returns `{ success: true, filePath }` only after the download fully completes. With a queue, the handler returns immediately after enqueueing, but the renderer's `startDownload()` in `useDownload.ts` checks `result.success`.

**Why it happens:** The `ipcMain.handle()` returns when the handler function returns. If we enqueue and return immediately, the renderer receives `{ success: true }` before any download has actually started.

**How to avoid:** Change the START_DOWNLOAD_TASK handler to return `{ success: true, enqueued: true }` (or just `{ success: true }` with a different semantic meaning). The renderer's `handleProgress` for the `'waiting'` state will handle the visual feedback. The `useDownload.ts` `startDownload()` method must be updated to NOT treat the early return as a download completion -- progress events handle completion now.

**Warning signs:** `startDownload()` in useDownload.ts sets `task.state = 'downloading'` before the IPC call, but the queue may keep it in 'waiting' state if at capacity. The renderer shows 'downloading' but main process shows 'waiting'.

### Pitfall 3: Pause/Cancel Race with Queue Removal
**What goes wrong:** User clicks pause. The task is in the queue (waiting). Pause handler calls `queue.remove(taskId)` and returns success. But between the `findIndex` and `splice`, the queue's `processQueue()` dequeues that task and starts executing it -- now the handler tries to remove a task that's no longer in the queue AND is now active.

**Why it happens:** The queue's `processQueue()` runs asynchronously (in some implementations) or can be called from multiple paths.

**How to avoid:** Call `queue.remove()` first (which returns boolean). If the task was in the queue, no further action is needed. If NOT in the queue (returns false), it might be running -- check `activeDownloads.get(taskId)` and abort accordingly. The `remove()` and `processQueue()` can interleave, so consider a simple lock or check the order: remove before processQueue in pause/cancel handlers.

**Warning signs:** User rapidly pauses and resumes the same task -- task shows as both 'paused' and 'downloading'.

### Pitfall 4: RESUME Enqueues But Already Active
**What goes wrong:** User clicks resume on a paused download. The handler calls `downloadQueue.enqueue()` which adds to the queue. But the download is also restored in `restorePendingDownloads` during startup, or the user double-clicks resume. The task gets enqueued twice.

**Why it happens:** No deduplication check in `enqueue()`.

**How to avoid:** Add a `has(taskId): boolean` method to the queue and check before enqueuing. Also check that the task is not already in `activeDownloads`. The `processQueue()` should also check for duplicate execution.

## Code Examples

### DownloadQueue Full Implementation

```typescript
// electron/main/ipc/handlers/download-queue.ts
import { BrowserWindow } from 'electron'
import { store } from '../index'
import { logHandler } from './base'
import { executeDownload } from './download.handler'

export interface QueuedDownload {
  taskId: string
  url: string
  filename: string
  saveDir: string
}

/**
 * FIFO download queue that enforces maxConcurrentDownloads.
 * Reads concurrency setting fresh from electron-store on each dequeue.
 */
export class DownloadQueue {
  private _queue: QueuedDownload[] = []
  private _getActiveCount: () => number

  constructor(getActiveCount: () => number) {
    this._getActiveCount = getActiveCount
  }

  get length(): number {
    return this._queue.length
  }

  /** Check if a task is in the queue */
  has(taskId: string): boolean {
    return this._queue.some((item) => item.taskId === taskId)
  }

  /** Add task and attempt to start */
  enqueue(item: QueuedDownload): void {
    if (this.has(item.taskId)) {
      logHandler('download-queue', `Task already queued: ${item.taskId}`, 'warn')
      return
    }

    this._queue.push(item)

    // Emit 'waiting' progress event so renderer shows queue state
    this._emitProgress(item.taskId, 'waiting', 0)

    this.processQueue()
  }

  /** Core dequeue logic -- reads maxConcurrentDownloads fresh each call */
  processQueue(): void {
    const maxConcurrent = store.get('appSettings')?.maxConcurrentDownloads ?? 3
    const activeCount = this._getActiveCount()

    logHandler(
      'download-queue',
      `processQueue: active=${activeCount}, max=${maxConcurrent}, queued=${this._queue.length}`,
      'info',
    )

    while (this._getActiveCount() < maxConcurrent && this._queue.length > 0) {
      const next = this._queue.shift()!
      logHandler('download-queue', `Starting queued task: ${next.taskId}`, 'info')

      // Fire and forget -- progress events communicate state to renderer
      this._executeDownload(next).catch((err) => {
        logHandler('download-queue', `Queue task failed: ${next.taskId}: ${err.message}`, 'error')
      })
    }

    // Update waiting tasks with queue position
    this._queue.forEach((item, index) => {
      // Emit progress with queue position info
      this._emitProgress(item.taskId, 'waiting', 0, undefined, index + 1)
    })
  }

  /** Remove a queued task by ID. Returns true if found and removed. */
  remove(taskId: string): boolean {
    const idx = this._queue.findIndex((item) => item.taskId === taskId)
    if (idx !== -1) {
      this._queue.splice(idx, 1)
      logHandler('download-queue', `Removed queued task: ${taskId}`, 'info')

      // Notify renderer the task is gone from queue (pause/cancel)
      this._emitProgress(taskId, 'paused', 0)
      return true
    }
    return false
  }

  /** Clear entire queue (app shutdown) */
  clear(): void {
    this._queue = []
    logHandler('download-queue', 'Queue cleared', 'info')
  }

  /**
   * Execute a download and process the queue on completion.
   * This MUST be called as fire-and-forget -- don't await it from IPC handlers.
   */
  private async _executeDownload(item: QueuedDownload): Promise<void> {
    try {
      await executeDownload(item.taskId, item.url, item.filename, item.saveDir)
    } catch (error: any) {
      // Error already handled in executeDownload (progress event sent)
      // Queue slot is freed
    } finally {
      this.processQueue()
    }
  }

  /** Emit progress event to all windows */
  private _emitProgress(
    taskId: string,
    state: 'waiting' | 'downloading' | 'paused',
    progress: number,
    offset?: number,
    queuePosition?: number,
  ): void {
    const windows = BrowserWindow.getAllWindows()
    for (const win of windows) {
      win.webContents.send('download-progress', {
        taskId,
        state,
        progress,
        offset: offset ?? 0,
        speed: 0,
        queuePosition, // Optional: show "#2 of 5 waiting"
      })
    }
  }
}
```

### IPC Handler Integration (download.handler.ts changes)

```typescript
// electron/main/ipc/handlers/download.handler.ts
// At top of file, import the queue
import { DownloadQueue } from './download-queue'
import { logHandler } from './base'

const activeDownloads = new Map<string, ActiveDownload>()

// Create a single queue instance for the app lifecycle
const downloadQueue = new DownloadQueue(() => activeDownloads.size)

// --- START_DOWNLOAD_TASK handler ---
ipcMain.handle(IPC_CHANNELS.START_DOWNLOAD_TASK, async (_event, params) => {
  const { taskId, url, filename, saveDir } = params

  // Enqueue instead of direct-start
  downloadQueue.enqueue({ taskId, url, filename, saveDir })

  // Return immediately -- download progress events update the renderer
  return { success: true, taskId }
})

// --- PAUSE_DOWNLOAD_TASK handler ---
ipcMain.handle(IPC_CHANNELS.PAUSE_DOWNLOAD_TASK, async (_event, taskId: string) => {
  // 1. Try to remove from queue first
  if (downloadQueue.remove(taskId)) {
    return { success: true, state: 'removed_from_queue' }
  }

  // 2. Not in queue -- must be active
  const download = activeDownloads.get(taskId)
  if (!download) {
    return { success: false, error: 'Download task not found' }
  }

  // 3. Abort, persist state, cleanup
  download.abortController.abort()
  // ... existing pause logic ...

  // 4. Slot freed -- start next queued task
  downloadQueue.processQueue()

  return { success: true }
})

// --- CANCEL_DOWNLOAD_TASK handler ---
ipcMain.handle(IPC_CHANNELS.CANCEL_DOWNLOAD_TASK, async (_event, taskId: string) => {
  // 1. Try to remove from queue first
  if (downloadQueue.remove(taskId)) {
    return { success: true }
  }

  // 2. Not in queue -- cancel active download
  const download = activeDownloads.get(taskId)
  if (!download) {
    return { success: false, error: 'Download task not found' }
  }

  download.abortController.abort()
  cleanupDownload(taskId)

  // 3. Slot freed -- start next queued task
  downloadQueue.processQueue()

  return { success: true }
})

// --- RESUME_DOWNLOAD_TASK handler ---
ipcMain.handle(IPC_CHANNELS.RESUME_DOWNLOAD_TASK, async (_event, params) => {
  // ... validation ...

  // Enqueue the resume -- queue handles concurrency gating
  downloadQueue.enqueue({
    taskId: params.taskId,
    url: params.url,
    filename: params.filename,
    saveDir: params.saveDir,
  })

  return { success: true, taskId: params.taskId }
})
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| START handler immediately starts axios download | START handler enqueues, queue decides when to start | Phase 33 | Download may start immediately or wait; renderer must handle 'waiting' state |
| Pause/Cancel only deals with activeDownloads | Pause/Cancel must check queue first, then active if not found | Phase 33 | Correctly handles tasks that haven't started yet |
| Resume starts new Range request immediately | Resume goes through queue, respects concurrency | Phase 33 | Resume may wait if at capacity |
| maxConcurrentDownloads has no effect | Read on every dequeue from electron-store | Phase 33 | Setting actually limits parallel work |

**Deprecated/outdated:**
- The assumption that `start-download-task` IPC means "start immediately" is replaced by "enqueue this task."
- The `useDownload.ts` `startDownload()` method must NOT treat immediate return as "download started" -- the 'downloading' state is set when the queue actually starts the download, not when the IPC returns.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `store.get('appSettings')?.maxConcurrentDownloads` returns the current value when settings change via the renderer's `storeSet` IPC | Standard Stack | If electron-store has a stale in-memory cache, DL-03 breaks. Verified by existing pattern -- `storeSet` calls `store.set()` which updates the in-memory store. The queue reads via `store.get()` which always returns the latest value. |
| A2 | The `executeDownload()` function extracted from the START handler will work identically when called from both the IPC handler path and the queue path | Architecture Patterns | If `executeDownload()` relies on `_event` (the IPC event object), it will fail when called from the queue (no event). Need to ensure the function only uses the params it receives, not the event. Current code at line 232 does not use `_event` -- it's typed as `_event` (unused). |

## Open Questions (RESOLVED)

1. **Should the START_DOWNLOAD_TASK handler's early return change the renderer-side flow?** -- **RESOLVED:** Emit a `'downloading'` progress event from `executeDownload()` at the start, remove optimistic `task.state = 'downloading'` from `useDownload.ts:startDownload()`. Main process is source of truth.
   - What we know: Currently `useDownload.ts:startDownload()` calls `task.state = 'downloading'` **before** the IPC call. With the queue, the task may stay in 'waiting'.
   - What's unclear: Whether to move the `state = 'downloading'` transition into the progress handler (so the main process controls state transitions) or keep the optimistic 'downloading' state and let the queue's 'waiting' event override it.
   - Recommendation: The safer approach is to emit a `'downloading'` progress event from `executeDownload()` at the start, and let the `useDownload.ts` `handleProgress` manage state transitions. Remove the manual `task.state = 'downloading'` from `useDownload.ts:startDownload()`. The main process is now the source of truth for download state.

2. **How does the change from synchronous IPC return to fire-and-forget affect the renderer's download flow?** -- **RESOLVED:** IPC return treated as "enqueue confirmed" only. `download-progress` event with `state: 'completed'` remains the canonical completion signal. Callers of `startDownload()` must not rely on IPC return for completion status.
   - What we know: Currently the renderer calls `await startDownload(taskId)` and receives `{ success: true, filePath }` after the download completes.
   - What's unclear: Does any code rely on the IPC return value for the task completion status (versus the `download-progress` event)?
   - Recommendation: Check all callers of `startDownload()` in OnlineWallpaper.vue and FavoritesPage.vue. The `download-progress` event with `state: 'completed'` is the canonical completion signal. The IPC return should be treated as "enqueue confirmed" only.

3. **What is the processQueue trigger for settings changes?** -- **RESOLVED:** Option (a) -- modify the store-set handler in `store.handler.ts` to check if 'appSettings' changed and call `downloadQueue.processQueue()`. Implemented in Plan 02 Task 2.
   - What we know: Settings page calls `storeSet('appSettings', {..., maxConcurrentDownloads: N })` which triggers an IPC to electron-store.
   - What's unclear: Who calls `downloadQueue.processQueue()` when the setting changes?
   - Recommendation: The simplest approach is that every `processQueue()` call already reads the latest setting (no caching). But for the case where the user RAISES the limit (e.g., 3 to 5), no slot-freeing event occurs. The queue needs an explicit trigger. Options: (a) Add a `store-set` handler hook that checks if 'appSettings' changed and calls `processQueue()`, (b) Have the renderer settings page send a notification IPC after saving, (c) Use a polling interval. Option (a) is cleanest -- modify the store-set handler in store.handler.ts to check for settings changes.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | DownloadQueue runtime | yes | 20+ (bundled with Electron 41) | -- |
| electron-store | Reading maxConcurrentDownloads | yes | 11.0.2 | -- |
| AbortController | Pause/cancel signal | yes | native (Node 20+) | -- |
| BrowserWindow | Progress notifications | yes | Electron 41 API | -- |

**Missing dependencies with no fallback:** None -- all dependencies are existing project runtime.

## Validation Architecture

> Skipped -- `workflow.nyquist_validation` is explicitly `false` in `.planning/config.json`.

## Security Domain

> `security_enforcement` is not set in config. Skipping -- no security-sensitive changes in this phase. The queue adds no new IPC channels, no new file system access, and no new external API calls.

## Sources

### Primary (HIGH confidence)
- Codebase analysis: `electron/main/ipc/handlers/download.handler.ts` (900 lines) -- current download flow, activeDownloads Map, IPC handler signatures
- Codebase analysis: `src/composables/download/useDownload.ts` (462 lines) -- renderer-side download orchestration
- Codebase analysis: `src/stores/modules/download/index.ts` (162 lines) -- download state management, 'waiting' default state
- Codebase analysis: `src/shared/types/ipc.ts` (389 lines) -- IPC_CHANNELS constants, DownloadProgressData with 'waiting' state
- Codebase analysis: `electron/main/index.ts` (244 lines) -- store export pattern
- Codebase analysis: `electron/main/ipc/handlers/cache.handler.ts` -- `BrowserWindow.getAllWindows()` iteration pattern

### Secondary (MEDIUM confidence)
- Prior research: `.planning/research/SUMMARY.md` -- phase ordering rationale, queue location decision
- Prior research: `.planning/research/PITFALLS.md` -- concurrent download pitfalls, renderer-only semaphore trap
- Prior research: `.planning/phases/07-main-process-implementation/07-CONTEXT.md` -- handler structure and active download tracking

### Tertiary (LOW confidence)
- None -- all findings are directly verified against the codebase.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- zero new dependencies, verified against codebase
- Architecture: HIGH -- all patterns verified against existing codebase patterns
- Pitfalls: HIGH -- based on codebase analysis of existing 11 `BrowserWindow.getAllWindows()` calls, 4 handler signatures, and known concurrent download failure modes

**Research date:** 2026-05-01
**Valid until:** 2026-06-01 (stable stack -- no moving dependencies)
