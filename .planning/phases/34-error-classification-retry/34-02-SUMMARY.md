---
phase: 34-error-classification-retry
plan: 02
type: execute
completed_date: 2026-05-01
duration: 1m
tasks_total: 2
tasks_completed: 2
key_files:
  created: []
  modified:
    - electron/main/ipc/handlers/download.handler.ts
requirements:
  - DL-05
  - DL-06
  - DL-07
  - DL-08
depends_on:
  - 34-01-PLAN
key_decisions:
  - "D-06: Retry loop uses for loop (not recursion) for clean control flow"
  - "D-10: executeDownload catch block skips cleanup/emit for retriable errors"
  - "D-12: No 'failed' progress event during retry — suppresses error toast"
  - "DL-09: Retry holds queue slot via activeDownloads persistence (skip cleanup)"
---

# Phase 34 Plan 02: Retry Loop and Catch Block Modification

**One-liner:** Modified `executeDownload` catch block to branch on error classification (retriable skips cleanup/emit) and added `executeWithRetry` wrapper with exponential backoff retry loop, while preserving the existing `onDequeue` callback unchanged for Plan 03.

## Overview

Plan 02 implements the retry loop that wraps `executeDownload()` and modifies the `executeDownload` catch block to support retriable error handling. When a transient error occurs, the catch block skips cleanup and 'failed' emit (holding the queue slot via activeDownloads persistence), letting the error propagate to `executeWithRetry`. The retry loop manages up to MAX_RETRIES (3) attempts with exponential backoff + full jitter, and only performs permanent cleanup + failure notification after all retries are exhausted.

## Tasks Executed

### Task 1: Modify executeDownload catch block for retriable errors

- **Commit:** `d6c22f3`
- **Type:** auto
- **Description:** The catch block now classifies errors via `classifyDownloadError(error)`. When the error is retriable and `(entry.retryCount ?? 0) < MAX_RETRIES`, it logs a warning, skips `cleanupDownload()` (holding the queue slot per DL-09), skips the 'failed' progress event (no UI notification per D-12), and re-throws the error. Permanent errors and CanceledError follow the existing cleanup + emit + throw sequence unchanged.
- **Key changes:**
  - Added `classifyDownloadError` call to classify the error
  - Added retriable-error branch that skips `cleanupDownload(taskId)` and 'failed' emit
  - Preserved existing behavior for permanent errors and CanceledError
- **Acceptance criteria met:**
  - Retriable with retries remaining: cleanup skipped (slot held DL-09)
  - Retriable with retries remaining: 'failed' event NOT emitted (D-12)
  - Retriable with retries remaining: error still thrown (propagated to executeWithRetry)
  - Permanent errors: full cleanup + emit + throw unchanged
  - CanceledError: immediate re-throw unchanged
  - Condition uses `(entry.retryCount ?? 0) < MAX_RETRIES` with nullish coalescing

### Task 2: Add executeWithRetry function

- **Commit:** `01da070`
- **Type:** auto
- **Description:** Added `executeWithRetry` function after `executeDownload` and before the download queue instance. Uses a `for` loop (not recursion, per D-06) for up to MAX_RETRIES attempts. Each iteration wraps `executeDownload` in try/catch:
  - CanceledError and non-retriable errors re-thrown immediately
  - Retriable errors update `entry.retryCount`, compute backoff via `calculateBackoff(attempt)`, log, and `await waitWithBackoff(taskId, delay)`
  - After wait, checks `activeDownloads.has(taskId)` to detect pause/cancel during wait
  - After all retries exhausted: `cleanupDownload(taskId)`, emit 'failed' with retry-exhausted message, throw
- **Key changes:**
  - Added `executeWithRetry` function (90 lines) after `executeDownload`
  - Function signature mirrors `executeDownload` (same params + return type)
  - Placement is structural: between `executeDownload` and the download queue instance
- **Acceptance criteria met:**
  - Function exists after executeDownload
  - Uses `for (let attempt = 1; attempt <= MAX_RETRIES; attempt++)` loop
  - Calls `executeDownload`, `classifyDownloadError`, `calculateBackoff`, `waitWithBackoff`
  - CanceledError re-thrown immediately
  - Non-retriable errors re-thrown immediately
  - Sets `entry.retryCount = attempt` before backoff
  - After `waitWithBackoff`, checks `activeDownloads.has(taskId)` for pause/cancel
  - After retries exhausted: `cleanupDownload()` + emit 'failed' + throw

## Deviations from Plan

None -- plan executed exactly as written.

## Verification Results

| Check | Status |
|-------|--------|
| `grep -c 'async function executeWithRetry'` >= 1 | PASS (1) |
| `grep -c 'classifyDownloadError'` >= 2 | PASS (3) |
| Retriable path skips `cleanupDownload(taskId)` | PASS |
| Retriable path skips 'failed' emit | PASS |
| Permanent path: cleanup + emit + throw unchanged | PASS |
| CanceledError: immediate re-throw unchanged | PASS |
| onDequeue callback unmodified (still calls executeDownload) | PASS |
| TypeScript compilation (`npx vue-tsc --noEmit -p tsconfig.electron.json`) | PASS (0 errors) |

## Known Stubs

None.

## Threat Flags

None.

## Self-Check: PASSED
