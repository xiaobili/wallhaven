# Architecture Research: Concurrent Download Control + Retry Backoff

**Domain:** Electron download manager with queue and retry
**Researched:** 2026-05-01
**Confidence:** HIGH

## Overview

This document describes the new components and data flow changes needed to add true concurrent download control and retry-with-backoff to the existing layered Electron app. The architecture extends the existing `Client -> Repository -> Service -> Composable -> View` pattern without restructuring any existing layers.

**Key principle:** The queue and retry logic live at the **Service Layer** (renderer side), not in the main process handler. This keeps the handler thin (stateless execution), maintains Vue reactivity for UI state, and fits the existing pattern where the service orchestrates workflows.

---

## Current Architecture (Baseline)

### Existing Download Data Flow

```
useDownload.startDownload(id)
  -> downloadService.startDownload(id, url, filename)
    -> electronClient.startDownloadTask({taskId, url, filename, saveDir})
      -> IPC invoke('start-download-task')
        -> handler: axios stream download
          -> webContents.send('download-progress', {state, progress, ...})
            -> electronClient.onDownloadProgress(callback)
              -> downloadService.progressCallbacks.forEach(cb)
                -> useDownload.handleProgress(data)
                  -> store.updateProgress() / store.completeDownload()
```

### What Exists Today

| Aspect | Current State |
|--------|---------------|
| `maxConcurrentDownloads` setting | Stored in `AppSettings`, default 3, but **not enforced anywhere** |
| Download initiation | Every `startDownload` call immediately invokes IPC -- no queue |
| Failure handling | Error shown to user, task marked `failed`, temp file kept |
| Retry | **None** -- user must manually retry |
| Active download tracking | `Map<string, ActiveDownload>` in `download.handler.ts` (main process) |
| Progress subscription | `Set<ProgressCallback>` in `DownloadService` (renderer) |

---

## New Components

Two new classes at the Service Layer, plus supporting types:

```
src/services/download/
├── download.service.ts         (MODIFIED -- integrate queue + retry)
├── download.queue.ts           (NEW -- concurrent download queue)
├── retry.scheduler.ts          (NEW -- retry with exponential backoff)
└── types.ts                    (NEW -- queue/retry internal types)
```

### 1. DownloadQueue

**File:** `src/services/download/download.queue.ts`

**Purpose:** Ensure no more than N downloads run concurrently. Manages a FIFO waitlist of tasks waiting for a slot.

```
class DownloadQueue {
  private maxConcurrent: number
  private activeCount: number
  private waitingQueue: string[]   // taskId FIFO

  enqueue(taskId: string): 'immediate' | 'queued'
    // Returns 'immediate' if slot available, 'queued' if added to waitlist

  dequeue(): string | null
    // Pops next waiting taskId, increments activeCount

  release(taskId: string): string | null
    // Decrements activeCount, calls dequeue(), returns next taskId or null

  cancel(taskId: string): void
    // Removes from waitingQueue if present

  setConcurrency(n: number): void
    // Dynamic change -- if increasing, dequeue() to fill new slots

  getStatus(): QueueStatus
    // { activeCount, waitingCount, maxConcurrent }

  isActive(taskId: string): boolean
    // Whether taskId holds a slot (active or was active and retrying)
}
```

**Why not `p-queue` or `es-toolkit Semaphore`:** A generic promise queue wraps functions. Our queue needs to coordinate with `DownloadItem` state in the Pinia store, hold slots during retry countdown (without consuming CPU), and support dynamic concurrency changes. A custom queue with explicit `enqueue`/`release` is cleaner than wrapping semaphore acquire/release around IPC calls.

**Behavior:**
- `enqueue()` checks `activeCount < maxConcurrent`. If yes, returns `'immediate'` (caller should start download). If no, pushes to `waitingQueue` and returns `'queued'`.
- When a download completes or fails permanently, the caller calls `release()`, which pops the next task from the waitlist and returns its `taskId`. The caller is responsible for starting that task.
- When a download fails and will retry, the **slot is held** (activeCount is NOT decremented). This prevents retries from being starved by new tasks.

**Edge cases:**
- `maxConcurrent` changes from 3 to 5 while 3 are active: `setConcurrency` immediately dequeues 2 waiting tasks.
- `maxConcurrent` changes from 5 to 2 while 4 are active: no active tasks are killed; new tasks remain queued until active drops below 2.
- User cancels a waiting task: removed from `waitingQueue`, never started.
- All slots full, user adds 10 tasks: 10 queued, 3 active (or whatever maxConcurrent is).

### 2. RetryScheduler

**File:** `src/services/download/retry.scheduler.ts`

**Purpose:** Manage per-task retry state, calculate exponential backoff delays, schedule and cancel retries.

```
class RetryScheduler {
  private retryCounts: Map<string, number>
  private scheduledTimers: Map<string, ReturnType<typeof setTimeout>>

  shouldRetry(taskId: string, errorCategory: ErrorCategory): boolean
    // Returns true if retryCount < maxRetries AND errorCategory is retryable

  schedule(taskId: string): Promise<void>
    // Increments retryCount, returns a promise that resolves after backoff delay
    // The caller awaits this, then retries the download

  cancel(taskId: string): void
    // Clears the scheduled timer, removes retry state

  reset(taskId: string): void
    // Clears retry count on successful download

  getRetryInfo(taskId: string): { attempt: number; nextDelayMs: number } | null

  getConfig(): RetryConfig
  updateConfig(config: Partial<RetryConfig>): void
}
```

**Backoff formula:**
```
delay = min(baseDelay * 2^attempt + jitter, maxDelay)

Where:
  baseDelay = 2000ms (2 seconds)
  maxDelay  = 30000ms (30 seconds)
  jitter    = random between 0 and delay * 0.2 (20% jitter)
  attempt   = 0, 1, 2, ... (first retry is attempt 0, second is attempt 1)
```

**Resulting delays (without jitter):**
| Retry | Delay  | Cumulative |
|-------|--------|------------|
| 1st   | 2s     | 2s         |
| 2nd   | 4s     | 6s         |
| 3rd   | 8s     | 14s        |
| 4th   | 16s    | 30s        |
| 5th   | 30s    | 60s        |

Max retries defaults to **3** (configurable). After max retries, task is marked permanently failed.

**Why not `p-retry`:** `p-retry` wraps a function in retry logic. Our retry needs to:
- Hold a queue slot during the backoff countdown
- Use `resumeDownload` (not `startDownload`) to leverage Range headers
- Let the user cancel a retry mid-countdown
- Integrate with existing progress callback flow

These don't map well to `p-retry`'s function-wrapper API. A dedicated scheduler is simpler.

---

## Modified Existing Files

### 1. `src/services/download.service.ts` -- MODIFIED

**Changes:**
- Import and instantiate `DownloadQueue` and `RetryScheduler`
- Modify `startDownload()` to go through queue
- Add `retryFailedTask()` method
- Expose queue status and retry info

```typescript
class DownloadServiceImpl {
  private queue = new DownloadQueue()
  private retry = new RetryScheduler()

  async startDownload(taskId: string, url: string, filename: string): Promise<IpcResponse<string>> {
    const result = this.queue.enqueue(taskId)

    if (result === 'queued') {
      // Task is waiting -- update store state to 'waiting'
      // (caller handles this via return value or callback)
      return { success: true, data: 'queued' }
    }

    // Slot available -- proceed with actual download
    return this.executeDownload(taskId, url, filename)
  }

  private async executeDownload(taskId: string, url: string, filename: string): Promise<IpcResponse<string>> {
    // ... existing startDownload logic (get path, call IPC) ...
  }

  onTaskCompleted(taskId: string): void {
    this.retry.reset(taskId)
    const nextTaskId = this.queue.release(taskId)
    if (nextTaskId) {
      this.startNextQueuedTask(nextTaskId)
    }
  }

  onTaskFailed(taskId: string, errorCategory: ErrorCategory): void {
    if (this.retry.shouldRetry(taskId, errorCategory)) {
      // Hold queue slot, schedule retry
      this.retry.schedule(taskId).then(() => {
        // Backoff delay elapsed, resume download
        return this.resumeDownload(taskId, /* pending info */)
      })
    } else {
      // Permanent failure -- release slot
      this.retry.reset(taskId)
      const nextTaskId = this.queue.release(taskId)
      if (nextTaskId) this.startNextQueuedTask(nextTaskId)
    }
  }

  getQueueStatus(): QueueStatus {
    return this.queue.getStatus()
  }

  getRetryInfo(taskId: string): { attempt: number; nextDelayMs: number } | null {
    return this.retry.getRetryInfo(taskId)
  }
}
```

### 2. `src/composables/download/useDownload.ts` -- MODIFIED

**Changes:**
- Progress handler distinguishes terminal failure vs. retryable failure
- Exposes queue status and retry info to views
- Handles `state: 'retrying'` in progress callback
- `startDownload()` returns queue status info, not just boolean

**New progress state handling:**

```typescript
const handleProgress = (data: DownloadProgressData): void => {
  const { taskId, state, error, errorCategory } = data

  if (state === 'failed') {
    // Notify service -- it decides whether to retry
    downloadService.onTaskFailed(taskId, errorCategory || 'network')
    // If retry was scheduled, the slot is held
    // (no immediate UI error -- retry state will be shown)
    return
  }

  if (state === 'completed') {
    downloadService.onTaskCompleted(taskId)
  }

  // ... existing progress handling ...
}
```

### 3. `src/stores/modules/download/index.ts` -- MODIFIED

**Changes:**
- Add `'retrying'` to `DownloadItem.state` union
- (Optionally) add queue position tracking

### 4. `src/composables/settings/useSettings.ts` -- MODIFIED

**Changes:**
- When `maxConcurrentDownloads` changes, propagate to `DownloadService.queue.setConcurrency(n)`

### 5. `electron/main/ipc/handlers/download.handler.ts` -- MINIMAL CHANGE

**Changes:**
- Add `errorCategory` to failed progress data so renderer can decide retry eligibility

```typescript
function categorizeError(error: any): ErrorCategory {
  if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED') {
    return 'network'
  }
  if (error.response?.status === 429) return 'rate_limit'
  if (error.response?.status && error.response.status >= 500) return 'server'
  if (error.response?.status && error.response.status < 500) return 'permanent'
  return 'network'
}

// In the catch block:
windows[0].webContents.send('download-progress', {
  taskId,
  state: 'failed',
  error: error.message,
  errorCategory: categorizeError(error),  // NEW
})
```

### 6. `src/shared/types/ipc.ts` and `src/types/index.ts` -- MODIFIED

**Changes:**
- Add `'retrying'` to `DownloadProgressData.state` and `DownloadItem.state`
- Add `errorCategory` field to `DownloadProgressData`
- Add `RetryConfig`, `QueueStatus`, `ErrorCategory` types

---

## Type Definitions

### New types in `src/services/download/types.ts`

```typescript
export type ErrorCategory = 'network' | 'server' | 'rate_limit' | 'permanent'

export interface RetryConfig {
  maxRetries: number       // default: 3
  baseDelayMs: number      // default: 2000
  maxDelayMs: number       // default: 30000
  jitterFactor: number     // default: 0.2
}

export interface QueueStatus {
  activeCount: number
  waitingCount: number
  maxConcurrent: number
  isIdle: boolean
}

export type EnqueueResult = 'immediate' | 'queued'
```

### Type extensions in `src/shared/types/ipc.ts`

```typescript
// Extend DownloadProgressData
export interface DownloadProgressData {
  taskId: string
  progress: number
  offset: number
  speed: number
  state: 'downloading' | 'paused' | 'waiting' | 'retrying' | 'completed' | 'failed'
  filePath?: string
  error?: string
  errorCategory?: ErrorCategory  // NEW: for retry decision
  totalSize?: number
  resumeNotSupported?: boolean
}
```

### Type extensions in `src/types/index.ts`

```typescript
// Extend DownloadState
export type DownloadState = 'downloading' | 'paused' | 'waiting' | 'retrying' | 'completed' | 'failed'
```

---

## Data Flow Diagrams

### Happy Path: Download with Queue

```
User clicks download (wallpaper X)
  │
  ├─ useDownload.addTask({...}) -> store.downloadingList.push('waiting')
  │
  ├─ useDownload.startDownload(id)
  │    └─ downloadService.startDownload(id, url, filename)
  │         └─ queue.enqueue(id)
  │              ├─ Slot available? -> 'immediate'
  │              └─ executeDownload(id, url, filename)
  │                   └─ electronClient.startDownloadTask(...)
  │                        └─ IPC -> handler -> axios stream
  │
  ├─ Progress: state='downloading', progress=37%
  │    └─ store.updateProgress(id, 37, ...)
  │
  ├─ Progress: state='completed'
  │    └─ downloadService.onTaskCompleted(id)
  │         ├─ retry.reset(id)
  │         └─ queue.release(id)
  │              └─ dequeue() -> start next waiting task
  │
  └─ store.completeDownload(id, filePath)
```

### Queue Full: User adds 4th download (maxConcurrent=3)

```
User clicks download (wallpaper W)   [active: A, B, C]
  │
  ├─ useDownload.addTask({...}) -> store: W.state='waiting'
  │
  ├─ useDownload.startDownload(W.id)
  │    └─ downloadService.startDownload(W.id, ...)
  │         └─ queue.enqueue(W.id) -> 'queued'
  │              └─ store: W.state='waiting' (stays waiting)
  │
  ├─ (C completes)
  │    └─ queue.release(C.id)
  │         └─ dequeue() -> W.id
  │              └─ downloadService.executeDownload(W.id, ...)
  │                   └─ store: W.state='downloading'
  │
  └─ (Active: A, B, W)
```

### Retry Flow: Download Fails, Retry Succeeds

```
Progress: state='failed', errorCategory='network'
  │
  ├─ useDownload.handleProgress()
  │    └─ downloadService.onTaskFailed(id, 'network')
  │         ├─ retry.shouldRetry(id, 'network') -> true (attempt 0 of 3)
  │         ├─ Slot is HELD (activeCount unchanged)
  │         ├─ retry.schedule(id)
  │         │    └─ delay = min(2000 * 2^0, 30000) = 2000ms
  │         │    └─ await setTimeout(2000)
  │         │         └─ downloadService.resumeDownload(id, pending)
  │         │              └─ electronClient.resumeDownloadTask(...)
  │         │                   └─ IPC -> handler -> Range request
  │         │
  │         ├─ Progress: state='downloading' (resumed from offset)
  │         ├─ Progress: state='completed'
  │         │    └─ downloadService.onTaskCompleted(id)
  │         │         ├─ retry.reset(id)
  │         │         └─ queue.release(id) -> start next waiting
  │         └─ store.completeDownload(id, filePath)
```

### Retry Flow: Max Retries Exceeded

```
Progress: state='failed', attempt=3 (of 3 max)
  │
  ├─ retry.shouldRetry(id, 'network') -> false
  │
  ├─ downloadService.onTaskFailed(id, 'network')
  │    ├─ retry.reset(id)
  │    ├─ queue.release(id) -> start next waiting
  │    └─ store: task.state='failed' (permanent)
  │
  └─ useDownload.showError('下载失败，已重试3次')
```

### Retry Cancellation: User Cancels During Backoff

```
User clicks cancel on retrying task
  │
  ├─ useDownload.cancelDownload(id)
  │    └─ downloadService.cancelDownload(id)
  │         ├─ retry.cancel(id)     // clears timer
  │         ├─ queue.cancel(id)     // releases slot
  │         └─ electronClient.cancelDownloadTask(id)  // cleanup temp files
  │
  └─ store: remove task from downloadingList
```

---

## Architectural Patterns

### Pattern 1: Service-Level Coordination with Event Feedback

The queue and retry logic live in the service layer because:
1. The service already owns the download lifecycle (start/pause/cancel/resume)
2. The service already has progress callback subscriptions
3. The composable already delegates to the service
4. If the renderer is destroyed (app quit), the main process retains temp files for next launch

```
Composable -> Service (orchestrates queue + retry + IPC) -> Handler (executes downloads)
```

### Pattern 2: Slot-Holding During Retry

When a download fails and will retry, the queue slot is **not released**. This prevents:
- New tasks starting while a retry is pending
- Retry connection being delayed by other tasks
- Starvation (retries always get priority over new tasks because they hold their slot)

```
Active slots = [A, B, C]  (maxConcurrent=3)
  C fails, retry scheduled in 2s
Active slots = [A, B, C]  (C still holds slot, waiting=[D, E])
  2s later: C resumes downloading
Active slots = [A, B, C]  (still 3 active + 2 waiting)
  C completes → slot released → D dequeued
Active slots = [A, B, D]
```

### Pattern 3: Error Categorization for Retry Eligibility

Not all errors should trigger retry. The handler categorizes errors so the renderer decides:

| Category | HTTP / Error | Retry? | Rationale |
|----------|-------------|--------|-----------|
| `network` | ECONNRESET, ETIMEDOUT, ECONNREFUSED | Yes | Transient, likely temporary |
| `server` | 500, 502, 503 | Yes | Server overload, may recover |
| `rate_limit` | 429 | Yes | After longer delay |
| `permanent` | 404, 403, 401, file system error | No | Will never succeed |

---

## Anti-Patterns to Avoid

### 1. Queue in the Main Process Handler

**What:** Adding queue/semaphore logic to `download.handler.ts` to control concurrency at the handler level.

**Why wrong:**
- Handler becomes stateful (currently it only tracks active downloads for pause/cancel)
- Queue status requires new IPC channels to communicate to renderer
- Breaks the pattern where handler is a thin execution layer
- Retry state management would require additional IPC round-trips

**Instead:** Queue lives in the service layer; handler remains stateless (execute a single download, report progress).

### 2. Promise-Queue Library (`p-queue`, `es-toolkit Semaphore`)

**What:** Wrapping download initiation with `p-queue.add(() => startDownload(...))`.

**Why wrong:**
- Generic promise queues run functions and return promises, but our queue needs to:
  - Track `DownloadItem.state` synchronously (waiting vs downloading)
  - Hold slots during retry countdown (not actively running a function)
  - Support cancellation mid-waitlist (remove from queue)
  - Report queue position to UI
- Wrapping around IPC calls loses the state visibility the composable needs

**Instead:** Custom queue with explicit `enqueue`/`release` methods that the service calls directly.

### 3. Retry Wrapper Around IPC (`p-retry`)

**What:** `pRetry(() => electronClient.startDownloadTask(...))`.

**Why wrong:**
- The IPC call returns immediately (the download runs async in the main process and reports progress via events)
- Retry needs to happen when the progress event says `state: 'failed'`, not when the IPC promise rejects
- Need to retry with `resumeDownload` (Range headers), not `startDownload` from scratch

**Instead:** Event-driven retry: listen for failure events, schedule backoff, then call `resumeDownload`.

### 4. Wrapping Active Downloads Map in Handler with Semaphore

**What:** Using a semaphore inside `download.handler.ts` to limit concurrent downloads at the main process level.

**Why wrong:** The handler already has `activeDownloads: Map<string, ActiveDownload>`. Adding a semaphore here means the renderer sends a download request, the handler rejects it (or queues it), and the renderer needs another IPC call to check if it was queued. This doubles the IPC load and moves queue state management across the process boundary.

**Instead:** The renderer service layer decides which downloads to submit based on its local queue state. The handler always executes what it receives.

---

## Integration Points with Existing Layers

| Layer | Change | Type |
|-------|--------|------|
| **View** | (none) | Views continue to use composable interface unchanged |
| **Composable** | `useDownload` receives queue status + retry info; handles `retrying` state | MODIFY |
| **Service** | New `DownloadQueue` + `RetryScheduler` instances; modified start/fail flow | MODIFY + ADD |
| **Repository** | No changes needed | UNCHANGED |
| **Client** | No changes needed | UNCHANGED |
| **Handler** | Add `errorCategory` to failed progress; minimal change | MINIMAL MODIFY |
| **Store** | Add `retrying` state to DownloadItem state union | MODIFY |
| **Types** | Add errorCategory, retrying state, queue status, retry config | MODIFY |

### New Internal Dependencies

```
download.queue.ts       (standalone, no dependencies on other layers)
retry.scheduler.ts      (standalone, no dependencies on other layers)
download.service.ts     imports DownloadQueue + RetryScheduler
useDownload.ts          calls service.onTaskCompleted / onTaskFailed
download.handler.ts     adds errorCategory to progress message
```

---

## Suggested Build Order

### Phase 1: DownloadQueue

**Files:** `src/services/download/download.queue.ts`

**Why first:**
- Standalone component with no dependencies on other new code
- Queue must exist before retry logic can hold slots
- Enables parallel work on retry scheduler

**Verification:**
- Unit test: enqueue 5 tasks with maxConcurrent=3, verify only 3 are active
- Unit test: release completes one, verify next queued task starts
- Unit test: cancel a queued task, verify it never starts
- Unit test: dynamic concurrency increase fills new slots
- Unit test: cancel a task not in queue is no-op

### Phase 2: Wire Queue into Service

**Files:** `src/services/download.service.ts` (modified), `src/composables/download/useDownload.ts` (modified)

**Why second:**
- Replaces current immediate-start behavior
- Compotable starts using queue state
- The `maxConcurrentDownloads` setting actually works

**Verification:**
- Set maxConcurrent=1, add 3 downloads, verify they run sequentially
- Set maxConcurrent=5, add 10, verify 5 run at a time
- Change maxConcurrent from 3 to 1 while 3 active, verify no new tasks start

### Phase 3: RetryScheduler

**Files:** `src/services/download/retry.scheduler.ts`

**Why third:**
- Depends on queue concept (slot-holding) but not on the queue class itself
- Can be tested in isolation

**Verification:**
- Unit test: schedule retry, verify delay is calculated correctly (2s, 4s, 8s, ...)
- Unit test: cancel mid-delay, verify retry callback is NOT called
- Unit test: reset clears retry count
- Unit test: max retries exceeded, shouldRetry returns false

### Phase 4: Wire Retry into Download Flow

**Files:** `src/services/download.service.ts` (modified), `electron/main/ipc/handlers/download.handler.ts` (modified), `src/shared/types/ipc.ts` (modified), `src/types/index.ts` (modified)

**Why fourth:**
- Depends on both queue and retry scheduler existing
- Error categorization in handler is straightforward
- Type changes are mechanical

**Verification:**
- Simulate network error during download, verify retry fires after delay
- Simulate 3 consecutive failures, verify task is permanently failed
- Simulate 404, verify no retry (errorCategory=permanent)
- Cancel during retry countdown, verify cleanup

### Phase 5: Settings Propagation

**Files:** `src/composables/settings/useSettings.ts` (modified)

**Why last:**
- Depends on queue existing to accept `setConcurrency`
- Mechanical change: watch maxConcurrentDownloads, call `downloadService.setQueueConcurrency(n)`

**Verification:**
- Change maxConcurrent from 3 to 5 in settings, verify more tasks run
- Change from 5 to 1 while 3 active, verify no crash

---

## Scaling Considerations

| Concern | At 10 active | At 50 active | At 200 active |
|---------|-------------|-------------|--------------|
| Queue lookup | FIFO array, O(1) dequeue | FIFO array, O(N) cancel | Needs Set+Queue for O(1) cancel |
| Retry timers | 3-5 timers | 10-15 timers | Timer pressure possible |
| Store reactivity | Pinia handles fine | Pinia handles fine | Consider virtual list |
| Main process connections | 3-5 axios streams | 5-10 streams | OS socket limits (~100/process) |

The queue uses a simple array-based FIFO. If the cancel operation becomes a bottleneck (removing arbitrary elements from an array), switch to a `Set` for O(1) lookup + `Array` for ordering, or use a doubly-linked list.

---

## Error Handling Strategy

| Scenario | Behavior |
|----------|----------|
| Network error during download | Categorized as `network`, retry with backoff |
| Download fails all retries | Task marked `failed`, user notified, temp file preserved |
| User cancels during retry countdown | Timer cleared, temp file deleted, slot released |
| Queue is full, user clicks download | Task added to `waiting` queue, store state shows `waiting` |
| Settings change while tasks queued | Queue dynamic concurrency takes effect immediately |
| App quit while tasks are running | Main process active downloads lost, temp files remain, next launch scans and restores pending downloads |

---

## Summary

The architecture adds two new components (`DownloadQueue`, `RetryScheduler`) to the existing service layer, modifies the download service and composable to use them, and makes minimal changes to the main process handler (error categorization only). The queue controls concurrency by mediating which tasks reach the IPC layer; the retry scheduler manages per-task backoff timing while holding queue slots to prevent starvation.

**Build order:** Queue -> Service wiring -> Retry scheduler -> Retry wiring -> Settings propagation.

---

## Sources

- [es-toolkit Semaphore](https://es-toolkit.dev/reference/promise/Semaphore.html) -- Reference for semaphore pattern
- [p-queue](https://app.unpkg.com/p-queue@9.0.0/files/dist/index.d.ts) -- Reference for queue API design
- [p-retry](https://raw.githubusercontent.com/sindresorhus/p-retry/main/readme.md) -- Reference for retry/backoff pattern
- [exponential-backoff (coveo)](https://www.npmjs.com/package/@hcengineering/retry) -- Reference for backoff formula with jitter
- [electron-dl-manager](https://www.npmjs.com/package/electron-dl-manager) -- Existing Electron download manager pattern (known concurrent download issue)

---

*Architecture research for: v4.0 concurrent download + retry backoff*
*Researched: 2026-05-01*
