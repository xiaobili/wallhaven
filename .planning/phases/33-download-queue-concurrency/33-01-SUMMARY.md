---
phase: 33-download-queue-concurrency
plan: 01
subsystem: main-process
tags: [queue, download, concurrency, ipc]
requires: []
provides: [DownloadQueue, executeDownload]
affects: [electron/main/ipc/handlers/download.handler.ts, electron/main/ipc/handlers/download-queue.ts]
tech-stack:
  added: []
  patterns:
    - "Callback-based dependency injection avoids circular imports"
    - "Singleton accessor pattern for cross-module queue access"
    - "Live setting read on each dequeue cycle (no caching)"
key-files:
  created:
    - path: electron/main/ipc/handlers/download-queue.ts
      role: "DownloadQueue class + QueuedDownload interface + singleton accessors"
  modified:
    - path: electron/main/ipc/handlers/download.handler.ts
      role: "Extracted executeDownload() + DownloadQueue instance creation"
decisions:
  - "Queue uses callback injection (getActiveCount, onDequeue) instead of direct imports to avoid circular dependency"
  - "Singleton accessors (setQueueInstance/getQueueInstance) enable cross-module queue access without module-level circular imports"
  - "store.get('appSettings') read fresh on each processQueue() call — no caching, live DL-03 propagation"
metrics:
  duration: ~15 minutes
  completed: 2026-05-01
---

# Phase 33 Plan 01: Queue Infrastructure — DownloadQueue class and executeDownload extraction

**One-liner:** FIFO DownloadQueue class with singleton accessors and extracted executeDownload function, enabling concurrent download gating via maxConcurrentDownloads setting.

---

## Tasks

| # | Name                           | Type | Commit    | Status |
|---|--------------------------------|------|-----------|--------|
| 1 | Create DownloadQueue class     | auto | `bdf7943` | Done   |
| 2 | Extract executeDownload()      | auto | `e3d612e` | Done   |

---

## Summary

### Task 1: Create DownloadQueue class

Created `electron/main/ipc/handlers/download-queue.ts` with:

- **QueuedDownload interface** (`taskId`, `url`, `filename`, `saveDir`) — the payload for queue items
- **DownloadQueue class** with:
  - `enqueue(item)` — adds to FIFO, emits `'waiting'` progress event, calls `processQueue()`
  - `has(taskId)` — dedup check (prevents duplicate enqueue per RESEARCH.md Pitfall 4)
  - `processQueue()` — reads `maxConcurrentDownloads` fresh from electron-store, starts tasks while `activeDownloads.size < maxConcurrent`, updates position of remaining waiting items
  - `remove(taskId)` — splices from queue, returns boolean (caller handles state notification)
  - `clear()` — resets entire queue (for app shutdown)
- **Singleton accessors** (`setQueueInstance`/`getQueueInstance`) — enables cross-module queue access for Plan 02 settings propagation

The constructor takes `getActiveCount: () => number` and `onDequeue: (item: QueuedDownload) => Promise<void>` callbacks. This avoids any import from `download.handler.ts`, eliminating circular dependency risk.

### Task 2: Extract executeDownload() and create queue instance

Modified `electron/main/ipc/handlers/download.handler.ts`:

- **`executeDownload()` extracted** — The ~215-line download execution body (lines 247-461 of the original) is now a standalone exported async function with signature `(taskId, url, filename, saveDir) => Promise<{ filePath, size }>`.
  - On success: returns `{ filePath, size }` (no IPC wrapping)
  - On file-already-exists: sends `'completed'` progress event, returns immediately
  - On CanceledError (external abort): re-throws without side effects (pause/cancel handler manages state)
  - On other errors: calls `cleanupDownload()`, sends `'failed'` progress event, then re-throws
  - On aborted check after pipeline: throws regular Error (caller handles via catch)

- **DownloadQueue instance created** with:
  - `getActiveCount: () => activeDownloads.size` — reads running tasks count directly
  - `onDequeue` — calls `executeDownload()` wrapped in try/finally that triggers `processQueue()` after completion/failure
  - `setQueueInstance(downloadQueue)` called after creation

- **START handler simplified** — now wraps `executeDownload()` call in try/catch and formats IPC response. CanceledError returns `{ cancelled: true }`, other errors return `{ error: message }`.

All existing handlers (PAUSE, CANCEL, RESUME, GET_PENDING_DOWNLOADS) remain unchanged - they will be modified in Plan 02.

---

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed import path for store in download-queue.ts**
- **Found during:** TypeScript compilation (Task 2)
- **Issue:** The plan specified `import { store } from '../index'` but from `electron/main/ipc/handlers/download-queue.ts` the correct relative path to `electron/main/index.ts` is `../../index` (two levels up, not one).
- **Fix:** Changed to `import { store } from '../../index'`
- **Files modified:** `electron/main/ipc/handlers/download-queue.ts`
- **Commit:** `e3d612e`

**2. [Rule 3 - Blocking] Fixed type assertion for store.get('appSettings')**
- **Found during:** TypeScript compilation (Task 2)
- **Issue:** `store.get('appSettings')` returns `null` type in strict mode, causing `as { maxConcurrentDownloads?: number } | undefined` to fail with "Conversion of type 'null' to type ... may be a mistake."
- **Fix:** Added intermediate `unknown` cast: `store.get('appSettings') as unknown as { maxConcurrentDownloads?: number } | undefined`
- **Files modified:** `electron/main/ipc/handlers/download-queue.ts`
- **Commit:** `e3d612e`

---

## Key Files

### Created

- **`electron/main/ipc/handlers/download-queue.ts`** (192 lines)
  - DownloadsQueue class with all required methods + singleton accessors
  - Approaches the pattern from RESEARCH.md (Section: Pattern 1) with added singleton accessors for cross-module use

### Modified

- **`electron/main/ipc/handlers/download.handler.ts`** (937 lines, +36 net)
  - Added: `import { DownloadQueue, setQueueInstance, type QueuedDownload }` at line 12
  - Added: `export async function executeDownload()` at line 182 (~150 lines of extracted logic)
  - Added: `const downloadQueue = new DownloadQueue(...)` + `setQueueInstance(downloadQueue)` at line 381
  - Simplified: START handler (lines 460-497) now calls `executeDownload()` instead of inline code

---

## Verification

```bash
# TS type check
npx vue-tsc --noEmit -p tsconfig.electron.json  # passes with zero errors

# Pattern checks
grep -c 'export class DownloadQueue' electron/main/ipc/handlers/download-queue.ts  # 1
grep -c 'export async function executeDownload' electron/main/ipc/handlers/download.handler.ts  # 1
grep -c 'new DownloadQueue' electron/main/ipc/handlers/download.handler.ts  # 1
grep -c 'setQueueInstance' electron/main/ipc/handlers/download.handler.ts  # 2 (import + call)
grep -c "store\.get.*appSettings" electron/main/ipc/handlers/download-queue.ts  # 1
grep -c "executeDownload(" electron/main/ipc/handlers/download.handler.ts  # 3 (def + callback + handler)
grep "import.*store.*from.*index" electron/main/ipc/handlers/download-queue.ts  # ../../index
grep "import.*DownloadQueue.*download-queue" electron/main/ipc/handlers/download.handler.ts  # present
```

No stub content found. No new threat surface introduced.

---

## Self-Check: PASSED

- [x] download-queue.ts exists (192 lines >= 80 min)
- [x] download.handler.ts modified with executeDownload extraction
- [x] class DownloadQueue exported with all 5 methods
- [x] export async function executeDownload exists
- [x] DownloadQueue instance created with activeDownloads.size callback
- [x] setQueueInstance called after creation
- [x] START handler calls executeDownload() instead of inline code
- [x] Zero circular dependencies — download-queue.ts does NOT import from download.handler.ts
- [x] TypeScript compilation passes (vue-tsc --noEmit)
- [x] Both commits exist in git log
- [x] No unexpected file deletions
