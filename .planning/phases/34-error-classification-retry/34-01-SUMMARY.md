---
phase: 34-error-classification-retry
plan: 01
type: execute
subsystem: download-engine
tags:
  - error-classification
  - retry-backoff
  - timer-management
requires:
  - Phase 33 (DownloadQueue, queue slot model, activeDownloads infrastructure)
provides:
  - classifyDownloadError pure function
  - calculateBackoff with full-jitter exponential backoff
  - retryTimers Map with schedule/cancel/wait utilities
  - retryCount field on ActiveDownload
  - Configuration constants (BACKOFF_BASE_MS, BACKOFF_MAX_MS, MAX_RETRIES)
affects:
  - electron/main/ipc/handlers/download.handler.ts
decisions:
  - "Full-jitter exponential backoff: random(0, min(BASE*2^(attempt-1), MAX)) — prevents thundering herd (Pitfall 4)"
  - "waitWithBackoff returns unresolved Promise on cancel — caller checks activeDownloads.has(taskId) post-await, avoiding unhandled rejection risks"
  - "Unknown errors default to retriable (conservative) — transient network issues are more common than permanent logic errors"
  - "RESUME_* prefixed error codes are permanent — data corruption requires user intervention"
  - "retryCount field is optional on ActiveDownload — entry created without it, set only when a retry occurs"
duration: "~15 min"
completed_date: "2026-05-01"
---

# Phase 34 Plan 01: Error Classification and Retry Utilities

**One-liner:** Pure additive utility layer for error classification (retriable vs permanent), exponential backoff with full jitter, and retry timer management in `download.handler.ts` -- building blocks for Plan 02's `executeWithRetry` loop.

## Task Execution

### Task 1: Configuration constants and retryCount on ActiveDownload

- Added `retryCount?: number` field to `ActiveDownload` interface
- Added `const retryTimers = new Map<string, ReturnType<typeof setTimeout>>()` for timer lifecycle management
- Added constants `BACKOFF_BASE_MS = 2000`, `BACKOFF_MAX_MS = 30000`, `MAX_RETRIES = 3`
- **Verification:** All 4 greps return >= 1, compile passes
- **Commit:** `049d414`

### Task 2: classifyDownloadError utility

- Added pure function mapping error properties to `{ isRetriable: boolean; reason: string }`
- Classification rules: network codes (ECONNRESET, ETIMEDOUT, etc.) and HTTP 5xx/408/429 → retriable
- Client 4xx (except 408/429), CanceledError, RESUME_* error codes → permanent
- Unknown errors default to retriable (conservative)
- **Verification:** Function exists, compile passes
- **Commit:** `bbe761a`

### Task 3: calculateBackoff function

- Added function implementing exponential backoff with full jitter
- Formula: `random(0, min(BASE * 2^(attempt-1), MAX))`
- attempt is 1-based, capped at BACKOFF_MAX_MS (30s)
- **Deviation:** Functions were initially placed in wrong order (calculateBackoff before classifyDownloadError). Fixed in follow-up commit `f1bd072` to match plan ordering (classifyDownloadError first, then calculateBackoff).
- **Verification:** Function exists with correct formula, compile passes
- **Commits:** `a0aec53`, `f1bd072`

### Task 4: Retry timer utilities

- Added `scheduleRetryTimer(taskId, delay, callback)` — stores timer in retryTimers Map, auto-removes reference after firing
- Added `cancelRetryTimer(taskId)` — clears timeout and removes from Map, safe to call if no timer exists
- Added `waitWithBackoff(taskId, delay)` — returns Promise that resolves after delay via stored timer; on cancel the timer is cleared and Promise never resolves (caller checks activeDownloads.has(taskId))
- **Verification:** All three functions present, compile passes
- **Commit:** `81fd3ba`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Ordering] Corrected function order in Retry Utilities section**
- **Found during:** Task 3 (post-insertion review)
- **Issue:** `calculateBackoff` was placed before `classifyDownloadError` due to a section-comment replacement matching issue — the plan specifies classifyDownloadError first, then calculateBackoff, then timer utilities
- **Fix:** Swapped the two function blocks and corrected the JSDoc on calculateBackoff which had inherited the wrong description
- **Files modified:** `electron/main/ipc/handlers/download.handler.ts`
- **Commit:** `f1bd072`

### Comment Style Note
The `classifyDownloadError` function comments use `--` (double hyphen) instead of `—` (em dash U+2014) that existed in the original version. This is cosmetic and does not affect behavior.

## Key Files

| File | Change | Lines |
|------|--------|-------|
| `electron/main/ipc/handlers/download.handler.ts` | Modified | 805 → 929 (+124) |

## Verification Results

| # | Check | Result |
|---|-------|--------|
| 1 | `retryCount` exists | PASS (1 match) |
| 2 | `BACKOFF_BASE_MS` exists | PASS (2 matches) |
| 3 | `MAX_RETRIES` exists | PASS (1 match) |
| 4 | `function classifyDownloadError` exists | PASS (1 match) |
| 5 | `function calculateBackoff` exists | PASS (1 match) |
| 6 | `function scheduleRetryTimer` exists | PASS (1 match) |
| 7 | `function cancelRetryTimer` exists | PASS (1 match) |
| 8 | `function waitWithBackoff` exists | PASS (1 match) |
| 9 | TypeScript compilation (`vue-tsc --noEmit -p tsconfig.electron.json`) | PASS (no errors) |
| 10 | No `executeWithRetry` or `cancelRetryTimer` outside definitions | PASS (only in JSDoc/intended locations) |

## Architecture Notes

All additions are **pure additive** — no existing handler behavior was modified:

- No changes to `executeDownload` catch block (Plan 02 modifies this)
- No changes to PAUSE/CANCEL handlers (Plan 03 adds `cancelRetryTimer` calls)
- No changes to queue `onDequeue` callback (Plan 02 wraps it with `executeWithRetry`)
- No renderer-side or type changes (Phase 35)

## Self-Check: PASSED

All files confirmed present, all commits verified in git log.
