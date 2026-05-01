# Phase 33: 下载队列与并发控制 - Context

**Gathered:** 2026-05-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Add a download queue to the main process that enforces the `maxConcurrentDownloads` setting. Currently every `start-download-task` IPC call immediately starts an axios download — there is no concurrency gating. This phase introduces a FIFO queue between the IPC handler and the actual download execution.

**Requirements:** DL-01, DL-02, DL-03, DL-04
- DL-01: Follow maxConcurrentDownloads setting
- DL-02: Auto-queue excess downloads (state = 'waiting')
- DL-03: Live setting propagation (changing setting takes effect immediately)
- DL-04: Graceful concurrency reduction (active downloads not interrupted)

**Out of scope (deferred to future):**
- Persistent download queue (DL-NEXT) — queue resets on app restart
- Retry logic with backoff — Phase 34
- UI retry state display — Phase 35
- Download speed limiting

</domain>

<decisions>
## Implementation Decisions

### Queue Architecture

- **D-01:** Create a `DownloadQueue` class in a new file `electron/main/ipc/handlers/download-queue.ts`
  - Separate from the 900-line `download.handler.ts` to keep concerns isolated
  - Encapsulates queue state, concurrency tracking, and dequeue logic

- **D-02:** In-memory FIFO queue (not persisted)
  - Queue resets on app restart — consistent with existing `activeDownloads` Map behavior
  - Persistent queue is tracked as DL-NEXT for future iteration

- **D-03:** Queue holds `QueuedDownload` items with the parameters needed to start
  ```typescript
  interface QueuedDownload {
    taskId: string
    url: string
    filename: string
    saveDir: string
  }
  ```

### Concurrency Model

- **D-04:** Active + queued tracking uses separate collections
  - `Queue<T>` (array-based) for waiting tasks
  - Existing `activeDownloads` Map for running tasks (unchanged)
  - `activeDownloads.size` is the active count

- **D-05:** `maxConcurrentDownloads` read from electron-store on each dequeue
  - Import `store` from `electron/main/index.ts` (already exported)
  - No need for IPC round-trip — main process has direct store access
  - Setting is read on every dequeue attempt → live propagation (DL-03)

- **D-06:** Dequeue happens after:
  1. A new task is added to the queue (try to start immediately)
  2. An active download completes/fails
  3. An active download is paused or cancelled (slot freed)
  - Flow: check `activeDownloads.size < maxConcurrentDownloads` → if true, dequeue head item → start actual download → on completion, dequeue again

- **D-07:** Graceful concurrency reduction (DL-04)
  - When setting drops from N to M (M < N), the active M tasks continue
  - No interruption of active downloads
  - Queue only starts new tasks when `activeDownloads.size < maxConcurrentDownloads`
  - This implicitly handles reduction — no active task is disturbed

### Integration with Existing Handlers

- **D-08:** `START_DOWNLOAD_TASK` handler changes
  - Add task to queue instead of starting download directly
  - Call `downloadQueue.enqueue()` which adds to FIFO and attempts to start
  - Return immediately (don't wait for download to complete)
  - The handler still returns `{ success: true }` to confirm enqueue

- **D-09:** `PAUSE_DOWNLOAD_TASK` handler changes
  - If task is waiting in queue → remove from queue entirely (like cancel)
  - If task is active → pause as before (abortController.abort), then dequeue next
  - Paused downloads go through user-initiated resume (Phase 7 resume handler), which re-enqueues

- **D-10:** `CANCEL_DOWNLOAD_TASK` handler changes
  - If task is waiting in queue → remove from queue
  - If task is active → cancel as before + dequeue next

- **D-11:** `RESUME_DOWNLOAD_TASK` handler changes
  - Enqueue the resume instead of starting directly
  - Queue handles concurrency gating

### No New IPC Channels

- **D-12:** Existing `download-progress` channel with state `'waiting'` is sufficient
  - ProgressData state union already includes `'waiting'`
  - No new IPC channel definitions needed
  - Renderer already handles `'waiting'` state (added in Phase 3)

### Queue Processing

- **D-13:** FIFO ordering — first enqueued, first started
- **D-14:** On queue dequeue, extract the task params and call the existing download execution function (refactored to be reusable from both direct-start and queue-start paths)

### Settings Import

- **D-15:** Import `store` from `electron/main/index.ts` in `download-queue.ts`
  ```typescript
  import { store } from '../index'
  ```
  - Existing pattern — store is already exported from main index
  - Read value: `store.get('appSettings')?.maxConcurrentDownloads ?? 3`

### Claude's Discretion

- Exact implementation of the `Queue<T>` class (array-based is fine)
- Error handling details for queue operations
- Logging strategy for queue state changes
- Whether to extract the download execution logic into a shared function or use the queue class as orchestrator
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Planning
- `.planning/PROJECT.md` — Core value, constraints, scope
- `.planning/REQUIREMENTS.md` — DL-01 through DL-04 detailed specs
- `.planning/ROADMAP.md` — Phase dependencies, success criteria
- `.planning/STATE.md` — Current state, accumulated context

### Prior Phase Context
- `.planning/phases/07-main-process-implementation/07-CONTEXT.md` — Active download tracking, IPC handler patterns (MUST READ for handler structure)
- `.planning/phases/08-renderer-integration/08-CONTEXT.md` — Download store integration, progress callback flow

### Codebase Maps
- `.planning/codebase/ARCHITECTURE.md` — Download flow, IPC patterns, store structure
- `.planning/codebase/INTEGRATIONS.md` — IPC channel list, download flow diagram
- `.planning/codebase/STACK.md` — Technology stack

### Key Source Files

#### Must Modify
- `electron/main/ipc/handlers/download.handler.ts` — Add queue integration in START/PAUSE/CANCEL/RESUME handlers
- `electron/main/ipc/handlers/index.ts` — Import and register new queue module export (if needed)

#### Must Create
- `electron/main/ipc/handlers/download-queue.ts` — DownloadQueue class

#### Reference (read-only)
- `electron/main/index.ts:13-26` — Store export
- `src/stores/modules/download/index.ts:45-63` — addDownloadTask and how 'waiting' state is set
- `src/services/download.service.ts:132-150` — startDownload service method
- `src/types/index.ts:222` — AppSettings.maxConcurrentDownloads type
- `src/stores/modules/wallpaper/index.ts:12` — Default maxConcurrentDownloads = 3
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

#### Existing activeDownloads Map
```typescript
// electron/main/ipc/handlers/download.handler.ts:45
const activeDownloads = new Map<string, ActiveDownload>()
```
Directly usable for active count: `activeDownloads.size`

#### Store Export
```typescript
// electron/main/index.ts:26
export { store }
```
Already exported — importable by the new queue module for reading `maxConcurrentDownloads`.

#### Existing 'waiting' State Type
```typescript
// src/services/download.service.ts
interface DownloadProgressData {
  state: 'downloading' | 'paused' | 'waiting' | 'completed' | 'failed'
}
```
`'waiting'` already in the union — no type changes needed.

### Established Patterns

- **Handler registration pattern:** Each handler file exports `register*Handlers()` function, called from `electron/main/ipc/handlers/index.ts:registerAllHandlers()`
- **Progress notification:** `BrowserWindow.getAllWindows()[0].webContents.send('download-progress', data)` — used throughout download handler
- **IPC response format:** `{ success: boolean, data?: T, error?: { code, message } }`

### Integration Points

- **START_DOWNLOAD_TASK handler** (~/download.handler.ts:232) — Entry point that currently starts download immediately; will enqueue instead
- **PAUSE_DOWNLOAD_TASK handler** (~/download.handler.ts:467) — Must dequeue next after pausing
- **CANCEL_DOWNLOAD_TASK handler** (~/download.handler.ts:534) — Must handle queue removal and dequeue next
- **RESUME_DOWNLOAD_TASK handler** (~/download.handler.ts:577) — Must enqueue resume task

### Key Download Execution Flow

```
START_DOWNLOAD_TASK IPC → activeDownloads.set() → axios GET → stream → progress → rename → complete
```

This entire block (lines ~247-461) contains the download execution logic that needs to be extracted into a callable function so both direct-starts and queue-starts can use it.
</code_context>

<specifics>
## Specific Ideas

- The queue should be minimalist — just FIFO array + concurrency check. Avoid premature optimization.
- Start count tracking: `startNext()` checks `activeDownloads.size < maxConcurrentDownloads && queue.length > 0`, then dequeues and calls the download function.
- When `activeDownloads.size >= maxConcurrentDownloads`, tasks remain in queue.
- When an active download completes/fails/is cancelled, it calls `startNext()` automatically.
</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.
</deferred>

---

*Phase: 33-下载队列与并发控制*
*Context gathered: 2026-05-01*
