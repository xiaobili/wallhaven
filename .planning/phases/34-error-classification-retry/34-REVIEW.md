---
phase: 34-error-classification-retry
reviewed: 2026-05-01T12:00:00Z
depth: standard
files_reviewed: 1
files_reviewed_list:
  - electron/main/ipc/handlers/download.handler.ts
findings:
  critical: 1
  warning: 1
  info: 2
  total: 4
status: issues_found
---

# Phase 34: Code Review Report

**Reviewed:** 2026-05-01T12:00:00Z
**Depth:** standard
**Files Reviewed:** 1
**Status:** issues_found

## Summary

Reviewed Phase 34 changes in `electron/main/ipc/handlers/download.handler.ts`, which added retry infrastructure: error classification, exponential backoff with full jitter, timer management, and a retry loop wrapping `executeDownload`. The error classification logic is thorough and correct. However, there is one blocker-level design defect in the timer cancellation flow: the `waitWithBackoff` promise never resolves when cancelled, creating a zombie task. Additionally, the `executeDownload` catch block lacks a null-guard on the caught error, which can cause cascading failures.

## Critical Issues

### CR-01: Dangling promise in waitWithBackoff creates zombie task on PAUSE/CANCEL during retry backoff

**File:** `electron/main/ipc/handlers/download.handler.ts:286-290`
**Issue:** The Promise returned by `waitWithBackoff` only resolves when the setTimeout fires. When `cancelRetryTimer` clears the timer (called by PAUSE/CANCEL handlers at lines 785 and 864), the Promise is never resolved. The `await waitWithBackoff(taskId, delay)` at line 636 hangs forever, making the post-wait cancellation detection at lines 638-641 unreachable.

**Concrete impact:**
1. User calls PAUSE or CANCEL while `executeWithRetry` is in backoff wait.
2. PAUSE/CANCEL handler calls `cancelRetryTimer(taskId)` -- the timer is cleared, `retryTimers` entry deleted.
3. PAUSE/CANCEL handler continues its synchronous cleanup (state file write, `cleanupDownload`, `processQueue`).
4. `executeWithRetry` is still suspended on `await waitWithBackoff(...)` and **never resumes**.
5. The async execution context (Promise chain, local variables, closures) is leaked indefinitely.
6. The error message "Download task was paused or cancelled during retry wait" (line 640) is dead code -- it can never execute.
7. The comment at lines 283-284 acknowledges this expected check (`"MUST check activeDownloads.has(taskId) after the await"`) but the promise never resolves so the check is unreachable -- the comment documents a fix, not a working feature.

**Root cause:** `waitWithBackoff` gives `cancelRetryTimer` no way to signal completion to the awaiting caller. The timer handle is cleared, but the resolve function is orphaned.

**Fix:** Store the resolve function alongside the timer handle in `retryTimers`. In `cancelRetryTimer`, call `resolve()` after clearing the timer so that `executeWithRetry` can proceed to its post-wait check.

Change `retryTimers` to store both the timer handle and the resolve callback:

```typescript
interface RetryTimerEntry {
  timer: ReturnType<typeof setTimeout>;
  resolve: () => void;
}

const retryTimers = new Map<string, RetryTimerEntry>()
```

Update `scheduleRetryTimer` and `cancelRetryTimer`:

```typescript
function scheduleRetryTimer(taskId: string, delay: number, callback: () => void): void {
  const timer = setTimeout(() => {
    retryTimers.delete(taskId)
    callback()
  }, delay)
  retryTimers.set(taskId, { timer, resolve: callback })
}

function cancelRetryTimer(taskId: string): void {
  const entry = retryTimers.get(taskId)
  if (entry !== undefined) {
    clearTimeout(entry.timer)
    retryTimers.delete(taskId)
    entry.resolve()  // Resolve the promise so executeWithRetry can proceed to its post-wait check
  }
}
```

With this fix, the lifecycle works correctly for all three cases:
- **Timer fires naturally:** `resolve()` is called by the timer callback, `retryTimers` entry is deleted, `executeWithRetry` resumes and checks `activeDownloads.has(taskId)` (returns true), continues to next retry attempt.
- **PAUSE/CANCEL during backoff:** `cancelRetryTimer` calls `resolve()`, `executeWithRetry` resumes. Since the PAUSE/CANCEL handler's synchronous cleanup (including `activeDownloads.delete(taskId)`) runs before the microtask that resumes `executeWithRetry`, the post-wait check finds no entry and throws the appropriate error.
- **Already-fired timer:** `cancelRetryTimer` finds no entry in `retryTimers` and is a no-op. The timer already fired, `executeWithRetry` already resumed.

## Warnings

### WR-01: executeDownload catch block can throw TypeError on null/undefined error object, blocking queue permanently

**File:** `electron/main/ipc/handlers/download.handler.ts:537`
**Issue:** The catch block at line 535 binds `error: any` and accesses `error.name` on line 537 without a null guard. If any thrown value is `null` or `undefined`, this throws a **TypeError** instead of the original error. The cascading failure is severe:

1. The original error is masked by a misleading TypeError.
2. `classifyDownloadError` is never called.
3. `cleanupDownload` is never called -- the `activeDownloads` entry persists permanently.
4. Since `activeDownloads.size` never decreases, the queue's `_getActiveCount()` stays at capacity, blocking **that concurrency slot forever**.
5. No 'failed' progress event is ever emitted -- the renderer is left in an inconsistent state.

While `null`/`undefined` throws are rare in practice (axios and Node.js APIs always throw Error objects), the consequence when it does happen is severe: a permanently blocked queue slot and a lost download.

**Fix:** Add a null guard on line 537 (and all subsequent accesses):

```typescript
} catch (error: any) {
  // CanceledError -- always re-throw without side effects
  if (error && (error.name === 'CanceledError' || error.code === 'ERR_CANCELED')) {
    throw error
  }
  // Classify the error
  const classification = error ? classifyDownloadError(error) : { isRetriable: false, reason: 'null_error' }
  // ...
```

## Info

### IN-01: Fragile coupling between executeDownload retry-exhaustion check and executeWithRetry loop boundary

**File:** `electron/main/ipc/handlers/download.handler.ts:549`
**Issue:** Both `executeDownload`'s catch block (line 549: `(entry.retryCount ?? 0) < MAX_RETRIES`) and `executeWithRetry`'s for loop (line 600: `attempt <= MAX_RETRIES`) reference the same `MAX_RETRIES = 3` constant in a tightly coupled way, but `executeDownload` should not be aware of retry policy at all.

In the current code, `executeDownload`'s retry-exhaustion check is effectively **dead code**: the outer loop always exhausts all MAX_RETRIES attempts before `executeDownload`'s `(entry.retryCount ?? 0) >= MAX_RETRIES` condition is ever true. The permanent failure path in `executeDownload`'s catch (lines 561-577, double cleanup + emit + throw) never executes under normal operation.

If someone changes `MAX_RETRIES` to 4 without updating the loop bound (or vice versa), `executeDownload` would perform its own cleanup+emit before the outer loop completes, resulting in **double cleanup** (safe but wasteful) and **duplicate 'failed' progress events** to the renderer (UI glitch).

**Fix:** Remove the retry-awareness from `executeDownload` entirely. `executeDownload` should always perform cleanup + emit on all non-CanceledError errors. The retry loop in `executeWithRetry` is the sole manager of retry policy:

```typescript
// In executeDownload's catch block -- always cleanup + emit for non-CanceledError errors
if (error.name === 'CanceledError' || error.code === 'ERR_CANCELED') {
  throw error
}
logHandler('executeDownload', `Download failed: ${taskId}: ${error.message}`, 'error')
cleanupDownload(taskId)
// emit 'failed' progress...
throw error
```

Then `executeWithRetry` handles the retry logic: when `executeDownload` throws, `executeWithRetry` checks classification, and for retriable errors, re-creates the `activeDownloads` entry before retrying.

### IN-02: eslint-disable at file level masks unused variable detection

**File:** `electron/main/ipc/handlers/download.handler.ts:1`
**Issue:** The directive `/* eslint-disable @typescript-eslint/no-unused-vars */` at line 1 disables unused variable detection for the entire file. While all Phase 34 additions happen to be used, this blanket disable prevents detection of any future unused imports, variables, or interface fields (including the newly added `retryCount` field on `ActiveDownload`).

This is a pre-existing issue, not specific to Phase 34, but it masks potential quality regressions in new code.

**Fix:** Use targeted eslint-disable comments for individual violations rather than disabling the rule file-wide.

---

_Reviewed: 2026-05-01T12:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
