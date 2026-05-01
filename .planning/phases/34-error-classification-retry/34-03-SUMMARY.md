---
phase: 34-error-classification-retry
plan: 03
type: execute
completed_date: 2026-05-01
subsystem: download-engine
tags:
  - retry
  - download-queue
  - pause
  - cancel
  - integration
requires:
  - "34-02-PLAN (executeWithRetry function)"
  - "34-01-PLAN (cancelRetryTimer function)"
provides:
  - "Retry-enabled onDequeue callback"
  - "Retry-aware PAUSE handler"
  - "Retry-aware CANCEL handler"
affects:
  - electron/main/ipc/handlers/download.handler.ts
tech-stack:
  added: []
  patterns:
    - "onDequeue calls executeWithRetry instead of executeDownload"
    - "cancelRetryTimer at PAUSE/CANCEL handler entry"
key-files:
  created: []
  modified:
    - electron/main/ipc/handlers/download.handler.ts
decisions:
  - "D-07: PAUSE handler calls cancelRetryTimer at entry, writes state, preserves temp, emits paused"
  - "D-08: CANCEL handler calls cancelRetryTimer at entry, cleans up temp+state, emits cancelled"
  - "D-09 (slot-holding): Slot held during retry via activeDownloads persistence; PAUSE/CANCEL free slot explicitly"
metrics:
  duration: 5m
  completed_date: 2026-05-01
  tasks_total: 3
  tasks_completed: 3
  commits: 3
---

# Phase 34 Plan 03: Handler Integration Summary

**One-liner:** Wire retry infrastructure into the download queue's onDequeue callback and the PAUSE/CANCEL handlers, enabling automatic retry with backoff for queued downloads and safe cancellation of pending retry timers.

## What Was Built

### Task 1: onDequeue callback uses executeWithRetry (commit 21a7d8a)

Changed the `DownloadQueue`'s `onDequeue` callback to call `executeWithRetry` instead of `executeDownload`. This means every download started through the queue now benefits from automatic retry with exponential backoff + full jitter.

The `finally { downloadQueue.processQueue() }` block remains unchanged. It runs after `executeWithRetry` settles (success, retries exhausted, or unrecoverable error). Redundant `processQueue()` calls from PAUSE/CANCEL are idempotent.

### Task 2: cancelRetryTimer in PAUSE handler (commit 2a33a99)

Added `cancelRetryTimer(taskId)` call to the PAUSE handler, positioned after the queue-removal check and before the `activeDownloads.get(taskId)` lookup. This ensures:

- Tasks waiting in queue are handled first (no retry timer exists)
- Tasks in retry backoff have their timer cancelled before pause state is written
- Active downloads (no retry timer) see a harmless no-op
- After `cancelRetryTimer`, `waitWithBackoff`'s promise stays pending — acceptable because the PAUSE handler frees the `activeDownloads` slot and the queue shifts reference away

### Task 3: cancelRetryTimer in CANCEL handler (commit 06f0df2)

Same pattern as Task 2 applied to the CANCEL handler. `cancelRetryTimer(taskId)` is called after the queue-removal check and before `activeDownloads.get(taskId)`. This ensures retry-waiting tasks have their timer cleared before temp+state files are deleted and the cancelled event is emitted.

### State Transitions

| State transition | Timer | Slot |
|---|---|---|
| Download succeeds | N/A | Freed by executeDownload |
| Permanent error | N/A | Freed by cleanup in executeDownload |
| Retries exhausted | N/A | Freed by cleanup in executeWithRetry |
| PAUSE during backoff | Cancelled by PAUSE handler | Freed by PAUSE's cleanupDownload(true) |
| CANCEL during backoff | Cancelled by CANCEL handler | Freed by CANCEL's cleanupDownload() |
| PAUSE during active download | No-op (no timer) | Same existing pause behavior |
| CANCEL during active download | No-op (no timer) | Same existing cancel behavior |

## Verification Results

1. `git grep -c 'executeWithRetry' download.handler.ts` = 6 (in onDequeue callback + function definition + log messages)
2. `git grep -c 'cancelRetryTimer' download.handler.ts` = 5 (definition + PAUSE + CANCEL)
3. PAUSE handler: cancelRetryTimer at line 785, after queue-removal check at lines 780-782, before activeDownloads.get at line 788
4. CANCEL handler: cancelRetryTimer at line 864, after queue-removal check at lines 859-861, before activeDownloads.get at line 867
5. All handler code after activeDownloads.get is unchanged
6. TypeScript compilation passes (`npx vue-tsc --noEmit -p tsconfig.electron.json` — no errors)

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None.

## Threat Flags

No new security-relevant surface introduced. All changes are internal call rewiring within the existing handler file.

## Self-Check: PASSED

- [x] Task 1 committed (21a7d8a): executeWithRetry in onDequeue callback
- [x] Task 2 committed (2a33a99): cancelRetryTimer in PAUSE handler
- [x] Task 3 committed (06f0df2): cancelRetryTimer in CANCEL handler
- [x] File modified: electron/main/ipc/handlers/download.handler.ts
- [x] TypeScript compilation passes
- [x] All verification criteria from PLAN.md met
