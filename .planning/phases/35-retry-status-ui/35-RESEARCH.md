# Phase 35: 重试状态展示与UI集成 — Research

**Researched:** 2026-05-01
**Domain:** Renderer-side retry state visualization — countdown timer, state display, exhausted-retry UI
**Confidence:** HIGH

## Summary

Phase 35 adds retry state visualization to the download center UI. This is a pure renderer-side phase with three changes to the main process and four to the renderer.

**Main process changes (in `executeWithRetry`):**
- Emit a new `'retrying'` progress event (with `retryCount`, `retryDelay`) before each backoff wait
- The `'failed'` event for exhausted retries already carries the message `"下载失败 — 已重试 3 次"` — no change needed

**Renderer changes:**
1. **Types** (`src/types/index.ts`, `src/shared/types/ipc.ts`, `src/services/download.service.ts`): Add `'retrying'` to `DownloadState` and `DownloadProgressData.state` unions; add `retryCount?` and `retryDelay?` fields
2. **Composable** (`useDownload.ts`): Add `'retrying'` branch in `handleProgress` BEFORE the `if (error)` check; add a single `setInterval(1000)` for countdown ticks; manage `retryStartedAt` timestamps per task
3. **Store** (`download/index.ts`): Update `activeDownloads` filter to include `state === 'retrying'`
4. **Template** (`DownloadWallpaper.vue`): Two new `v-show` blocks — `retrying` (replaces speed with retry count + countdown) and `failed` exhausted (shows retry-exhausted message + gray progress bar)

**Primary recommendation:** Use a single `setInterval(1000)` in `useDownload`'s `onMounted` (co-located with the existing progress subscription). Update a reactive `tickCounter` ref each second. Template computes `remainingSeconds` from `retryDelay`, `retryStartedAt`, and `tickCounter`.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Retry state emission | Main process | — | `executeWithRetry` is the source of truth — it knows when retries start and exhaust |
| Retry UI display | Renderer | — | Vue template + composable — purely visual, no business logic |
| Countdown timer | Renderer | — | Self-contained per-task `Date.now()` math, no IPC needed |
| Cancel during retry | Main process | — | `cancelRetryTimer()` already handles this (Phase 34 D-08) |
| activeDownloads filter | Renderer store | — | Computed property, trivial change — `state === 'downloading' \|\| state === 'retrying'` |

## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Countdown mechanism — renderer-side `setInterval(1000)`. Store `retryDelay` (from progress event) and `retryStartedAt = Date.now()` on DownloadItem. No IPC traffic for countdown ticks.
- **D-02:** Retry UI layout — replace speed text with retry info (`"重试中 (第X次/共3次)"`, `"下次重试: 4s"`). Progress bar stays frozen at last value.
- **D-03:** Cancel-only during retry — no pause button. `activeDownloads` filter includes `'retrying'`.
- **D-04:** Exhausted retry display — inline message `"下载失败 — 已重试 3 次"`, gray progress bar, cancel button remains.
- **D-05:** `handleProgress` integration — `'retrying'` branch goes BEFORE the `if (error)` check.

### Claude's Discretion

- **Countdown mechanism:** Renderer-side `setInterval` chosen
- **Retry UI layout:** Replace speed with retry info, progress bar stays frozen
- **Pause/cancel:** Cancel only during retry; include retrying in `activeDownloads`
- **Error display:** Summary only, hide original error detail

### Deferred Ideas (OUT OF SCOPE)

None.

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| UI-01 | Show "重试中 (第X次/共3次)" for downloads currently in retry | `retryCount` from progress event; template `v-show="item.state === 'retrying'"` |
| UI-02 | Show live countdown to next retry attempt (e.g., "下次重试: 4s") | `retryDelay` from progress event + `retryStartedAt = Date.now()` in composable + `setInterval(1000)` tick |
| UI-03 | Downloads that exhausted all 3 retries display "下载失败 — 已重试 3 次" | Main process already emits this message string in `'failed'` event; renderer detects and shows without toast |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vue 3 | 3.5.32 | Template rendering | Existing project framework |
| TypeScript | 6.0.0 | Type safety | Existing project requirement |
| Pinia | 3.0.4 | State management | Existing store pattern |

### Formatting Utilities (existing in `src/utils/helpers.ts`)

| Function | Purpose | 
|----------|---------|
| `formatFileSize(size)` | File size display (already used for offset) |
| `formatSpeed(speed)` | Speed display (to be replaced during retry) |
| `formatResolution(res)` | Resolution display (unchanged) |

### New Utility Needed

| Function | Purpose | Implementation |
|----------|---------|----------------|
| `formatCountdown(seconds: number): string` | Format remaining seconds for countdown display | If > 0 → `"下次重试: ${seconds}s"`, if 0 → `"即将重试..."` |

**Installation:** No new packages needed — pure Vue template changes and composable logic.

## Architecture Patterns

### System Architecture Diagram

```
┌────────────────────────────────────────────────────────────────────┐
│ Main Process (download.handler.ts)                                 │
│                                                                    │
│  executeWithRetry(taskId, url, filename, saveDir, offset)          │
│    │                                                               │
│    ├── for attempt = 1..3:                                         │
│    │     ├── executeDownload() ──── success ────► emit 'completed' │
│    │     │       │                                                  │
│    │     │       └── error ──► classify ──► not retriable ──►      │
│    │     │                        │        emit 'failed'           │
│    │     │                        │                                │
│    │     │                   retriable ◄────                        │
│    │     │                        │                                │
│    │     │                   [NEW] emit 'retrying' ◄── Phase 35    │
│    │     │                     {retryCount, retryDelay}             │
│    │     │                        │                                │
│    │     └── waitWithBackoff() ◄──┘                                │
│    │              │                                                │
│    │              └── PAUSE/CANCEL ──► cancelRetryTimer(taskId)     │
│    │                                                               │
│    └── retries exhausted ──► emit 'failed' with                   │
│         "下载失败 — 已重试 3 次" (already implemented in Phase 34)   │
│                                                                    │
└──────────────────────────┬─────────────────────────────────────────┘
                           │ IPC (download-progress)
                           ▼
┌────────────────────────────────────────────────────────────────────┐
│ Renderer Process                                                   │
│                                                                    │
│  downloadService.onProgress(handleProgress)                        │
│    │                                                               │
│    ├── state === 'retrying' ──► D-05 branch:                       │
│    │     task.state = 'retrying'                                   │
│    │     task.retryCount = retryCount  (1-based, 1-3)              │
│    │     task.retryDelay = retryDelay  (ms)                        │
│    │     task.retryStartedAt = Date.now()                          │
│    │     return (NO error toast)                                   │
│    │                                                               │
│    ├── state === 'failed' with "已重试" in message ──► UI-03:      │
│    │     task.state = 'failed'                                     │
│    │     Show inline message, NO toast                             │
│    │                                                               │
│    ├── state === 'failed' (other) ──► existing behavior            │
│    │                                                               │
│    └── other states ──► existing behavior                          │
│                                                                    │
│  setInterval(1000) ──► tickCounter++ (triggers re-render)          │
│    │                                                               │
│    └── For each retrying task in downloadingList:                  │
│          remaining = (task.retryStartedAt + task.retryDelay)       │
│                      - Date.now()                                  │
│          remainingSeconds = max(0, ceil(remaining / 1000))         │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

### Recommended Project Structure

No structural changes — this phase modifies existing files only:

```
src/
├── types/
│   └── index.ts                          # +'retrying' in DownloadState, +retryCount/retryDelay on DownloadItem
├── shared/types/
│   └── ipc.ts                            # +'retrying' in DownloadProgressData.state, +retryCount/retryDelay
├── services/
│   └── download.service.ts               # +'retrying' in local DownloadProgressData interface
├── composables/download/
│   └── useDownload.ts                    # +retrying branch in handleProgress, +setInterval countdown
├── stores/modules/download/
│   └── index.ts                          # +'retrying' in activeDownloads filter
├── views/
│   └── DownloadWallpaper.vue             # +retrying + failed v-show blocks, +CSS for .failed-item
└── utils/
    └── helpers.ts                        # +formatCountdown utility (optional)
```

### Pattern 1: State-specific v-show blocks

**What:** The template already uses `v-show="item.state === 'downloading'"`, `=== 'waiting'`, `=== 'paused'` for state-specific content. Adding `retrying` and `failed` follows the exact same pattern.

**When to use:** Any new state needs a corresponding `v-show` block in the template.

**Example (existing pattern — line 37-68 of DownloadWallpaper.vue):**
```html
<div v-show="item.state === 'downloading'" class="dowload-speed">
  下载速度：{{ formatSpeed(item.speed) }}
</div>
<div v-show="item.state === 'waiting'" class="dowload-state">
  等待中
</div>
<div v-show="item.state === 'paused'" class="dowload-state">
  已暂停
</div>
```

### Pattern 2: State-specific CSS classes via :class binding

**What:** Dynamic class binding on the download item container to apply state-specific styles.

**When to use:** Each state that needs distinct visual styling (progress bar color, text color, etc.).

**Example (existing — line 24 of DownloadWallpaper.vue):**
```html
<div v-for="(item) in downloadList" :key="item.id"
     class="dowload-item"
     :class="item.state === 'paused' ? 'pause-item' : ''">
```

### Pattern 3: Composable lifecycle management

**What:** `useDownload` composable manages `onMounted` (subscribe to progress) and `onUnmounted` (unsubscribe). The countdown `setInterval` is added alongside, with its own cleanup.

**When to use:** Any renderer-side timer or subscription that must be cleaned up on component unmount.

**Example (existing — lines 143-154 of useDownload.ts):**
```typescript
onMounted(() => {
  unsubscribe = downloadService.onProgress(handleProgress)
})

onUnmounted(() => {
  if (unsubscribe) {
    unsubscribe()
    unsubscribe = null
  }
})
```

### Anti-Patterns to Avoid

- **One interval per retrying task:** Creates N timers for N retrying tasks. Use a single interval that iterates over all retrying tasks. Much simpler lifecycle management (one `onMounted`, one `onUnmounted`).
- **Emit countdown ticks from main process:** Adds IPC traffic for something that can be computed locally with `Date.now()`. Renderer-side timer is sufficient.
- **Optimistic state setting:** Never set `state = 'retrying'` without receiving a progress event. The main process is source of truth (established in Phase 33 D-12, Phase 34 D-12).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Countdown timer | Custom scheduler | `setInterval(1000)` with `Date.now()` math | Standard JS timer, lifecycle managed in `onUnmounted` |
| State-to-template mapping | State machine logic | `v-show` blocks + `:class` bindings | Already established pattern in DownloadWallpaper.vue |
| Countdown formatting | Manual string building | `formatCountdown(seconds)` in helpers.ts | Consistent with existing `formatSpeed`, `formatFileSize`, `formatTime` |

**Key insight:** This phase is almost entirely reactive template work following established patterns. No novel architecture is needed.

## Common Pitfalls

### Pitfall 1: Toast on retry events

**What goes wrong:** The `handleProgress` function calls `showError()` when `error` field is present. If the `'retrying'` branch is placed AFTER the `if (error)` check, the retry event triggers an error toast.

**Why it happens:** The retrying event could carry an `error` field with the original failure reason, or the handler structure naturally flows into the error check.

**How to avoid:** Place the `'retrying'` branch BEFORE the `if (error)` check (D-05). Return early from the retrying branch. This guarantees retry events never trigger toasts.

**Warning signs:** User sees "下载失败" toast followed by "重试中" in the UI.

### Pitfall 2: Countdown timer zombie

**What goes wrong:** If the component is unmounted (user navigates away) while retry countdowns are active, the `setInterval` continues running and tries to update tasks that no longer exist.

**Why it happens:** `onUnmounted` cleanup is missing or the interval reference is not cleared.

**How to avoid:** Store the interval ID (`let countdownInterval: ReturnType<typeof setInterval> | null = null`) and clear it in `onUnmounted`. The existing pattern in `useDownload` already has `onMounted`/`onUnmounted` — add the interval cleanup there.

**Warning signs:** Console errors about null refs after navigating away from DownloadWallpaper page.

### Pitfall 3: `retryStartedAt` missing when task restored from pending

**What goes wrong:** If a task is in retrying state when the app restarts (unlikely but possible), `retryStartedAt` is undefined, causing `NaN` in countdown calculation.

**Why it happens:** The `restorePendingDownloads` method in `useDownload` creates `DownloadItem` objects without `retryStartedAt`. Currently, Phase 34 does not persist 'retrying' state (only 'paused'), so this should not happen in practice.

**How to avoid:** Add a null-coalescing fallback in the countdown computation — `retryStartedAt ?? 0`. Also ensure `restorePendingDownloads` doesn't restore retrying tasks (it only restores paused tasks).

**Warning signs:** Countdown shows "NaN" or "0s" for a task that should be counting down.

### Pitfall 4: `formatCountdown` edge cases

**What goes wrong:** Showing "下次重试: 0s" or negative values when the timer hasn't started or the backoff has expired.

**How to avoid:** Use `Math.max(0, Math.ceil(remainingMs / 1000))` for remaining seconds. When remaining is 0, show `"即将重试..."` instead of `"下次重试: 0s"`.

**Warning signs:** N/A — preempted by defensive `Math.max`.

### Pitfall 5: Double prefix on exhausted failure message

**What goes wrong:** The main process emits `"下载失败 — 已重试 3 次"`. The current `handleProgress` calls `showError("下载失败: " + error)`, resulting in `"下载失败: 下载失败 — 已重试 3 次"`.

**Why it happens:** The error field is formatted as a complete sentence, and the renderer always prefixes with "下载失败: ".

**How to avoid:** In the `if (error)` branch of `handleProgress`, check if `error` starts with `"下载失败"` (or contains `"已重试"`) and suppress the `showError` call. The UI will display the message inline via the `v-show` for `state === 'failed'` items.

**Warning signs:** Redundant "下载失败: 下载失败" message in error toast.

## Code Examples

### Example 1: Main process — emit 'retrying' progress event

This code is added to `executeWithRetry` in `download.handler.ts`, right before `await waitWithBackoff(taskId, delay)` (around line 656).

```typescript
// Emit 'retrying' state to renderer so UI can show countdown
const windows = BrowserWindow.getAllWindows()
if (windows.length > 0) {
  windows[0].webContents.send('download-progress', {
    taskId,
    progress: 0,
    offset: 0,
    speed: 0,
    state: 'retrying' as const,
    retryCount: attempt,
    retryDelay: delay,
  })
}
```

### Example 2: Renderer — handleProgress retrying branch

Added to `useDownload.ts`, BEFORE the `if (error)` check (line 91):

```typescript
// state === 'retrying' — store retry info for UI countdown
// MUST come before the `if (error)` check to prevent transient error toasts
if (data.state === 'retrying') {
  const task = store.downloadingList.find((item) => item.id === taskId)
  if (task) {
    task.state = 'retrying'
    task.retryCount = data.retryCount
    task.retryDelay = data.retryDelay
    // retryStartedAt is stored locally in the composable's Map
    retryStartedAtMap.set(taskId, Date.now())
  }
  return
}
```

### Example 3: Renderer — single setInterval for countdown

Added to `useDownload.ts` in the `onMounted` lifecycle hook:

```typescript
// Track when each retrying task started its backoff wait
const retryStartedAtMap = new Map<string, number>()
let countdownInterval: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  unsubscribe = downloadService.onProgress(handleProgress)
  
  // Single interval for all retry countdowns — cleaner lifecycle
  countdownInterval = setInterval(() => {
    tickCounter.value++
  }, 1000)
})

onUnmounted(() => {
  if (unsubscribe) {
    unsubscribe()
    unsubscribe = null
  }
  if (countdownInterval) {
    clearInterval(countdownInterval)
    countdownInterval = null
  }
})
```

### Example 4: Template — retrying state v-show block

Added to `DownloadWallpaper.vue` in the download item, replacing the `dowload-speed` block during retry:

```html
<div v-show="item.state === 'retrying'" class="dowload-state">
  重试中 (第{{ item.retryCount }}次/共3次)
</div>
<div v-show="item.state === 'retrying'" class="dowload-countdown">
  下次重试: {{ formatCountdown(getRetryRemaining(item)) }}
</div>
```

The `getRetryRemaining` script function:
```typescript
const getRetryRemaining = (item: DownloadItem): number => {
  if (item.state !== 'retrying' || !item.retryDelay) return 0
  const startedAt = retryStartedAtMap.get(item.id) ?? Date.now()
  const elapsed = Date.now() - startedAt
  const remaining = item.retryDelay - elapsed
  return Math.max(0, Math.ceil(remaining / 1000))
}
```

### Example 5: Template — exhausted-failed state v-show block

Added alongside the existing `dowload-speed` / `dowload-state` blocks. Note the error message from main process is `"下载失败 — 已重试 3 次"`:

```html
<div v-show="item.state === 'failed' && isRetryExhausted(item)" class="dowload-state">
  下载失败 — 已重试 3 次
</div>
```

Or more directly — since main process sets `error` field to this exact string:
```html
<div v-show="item.state === 'failed' && item.error?.includes('已重试')" class="dowload-state">
  下载失败 — 已重试 3 次
</div>
```

Note: `DownloadItem` does not currently have an `error` field. The `handleProgress` function sets `task.state = 'failed'` but does not store the error message on the item. Two approaches:

**A) Store error message on DownloadItem** (add `error?: string` field):
```typescript
// In handleProgress, error branch:
if (task) {
  task.state = 'failed'
  task.error = error  // NEW — store for template display
}
```

**B) Check retryCount on DownloadItem** — if `item.retryCount === 3 && item.state === 'failed'`, it was a retry-exhausted failure:
```html
<div v-show="item.state === 'failed' && item.retryCount === 3" class="dowload-state">
  下载失败 — 已重试 3 次
</div>
```

**Recommendation:** Approach A is more explicit. Add `error?: string` to `DownloadItem` and set it from `handleProgress`. In the template, check `item.error?.includes('已重试')` to determine exhausted-retry vs permanent failure. But the simplest approach (per UI-03) is to always show "下载失败 — 已重试 3 次" for any item where `item.retryCount === 3 && item.state === 'failed'`.

### Example 6: CSS for exhausted retries

Similar to existing `.pause-item .dowloaded-process-block` (line 375-377):

```css
.failed-item .dowloaded-process-block {
  background: rgba(120, 120, 120, 0.6);
}
```

Template class binding updated:
```html
<div v-for="(item) in downloadList" :key="item.id"
     class="dowload-item"
     :class="{
       'pause-item': item.state === 'paused',
       'failed-item': item.state === 'failed' && item.retryCount === 3
     }">
```

### Example 7: Format countdown utility

Added to `src/utils/helpers.ts`:

```typescript
/**
 * Format countdown seconds for retry display
 * @param seconds - remaining seconds (0 or positive)
 * @returns Formatted string
 * @example
 * formatCountdown(4)   // Returns "下次重试: 4s"
 * formatCountdown(0)   // Returns "即将重试..."
 */
export function formatCountdown(seconds: number): string {
  if (seconds <= 0) {
    return '即将重试...'
  }
  return `下次重试: ${seconds}s`
}
```

### Example 8: Store activeDownloads filter

Changed in `src/stores/modules/download/index.ts`:

```typescript
const activeDownloads = computed(() =>
  downloadingList.value.filter(
    (item) => item.state === 'downloading' || item.state === 'retrying',
  ),
)
```

## Type Changes Summary

### File: `src/types/index.ts`

Current `DownloadState` (line 180):
```typescript
export type DownloadState = 'downloading' | 'paused' | 'waiting' | 'completed' | 'failed'
```
Change to:
```typescript
export type DownloadState = 'downloading' | 'paused' | 'waiting' | 'completed' | 'failed' | 'retrying'
```

Current `DownloadItem` (lines 185-199):
```typescript
export interface DownloadItem {
  id: string
  url: string
  filename: string
  small: string
  resolution: string
  size: number
  offset: number
  progress: number
  speed: number
  state: DownloadState
  path?: string
  time?: string
  wallpaperId?: string
}
```
Add optional fields:
```typescript
export interface DownloadItem {
  // ... existing fields ...
  retryCount?: number   // Current retry attempt (1-based, 1-3)
  retryDelay?: number   // Backoff delay for current attempt (ms)
  error?: string        // Last error message (for template display)
}
```

### File: `src/shared/types/ipc.ts`

Current `DownloadProgressData.state` (line 177):
```typescript
state: 'downloading' | 'paused' | 'waiting' | 'completed' | 'failed'
```
Change to:
```typescript
state: 'downloading' | 'paused' | 'waiting' | 'completed' | 'failed' | 'retrying'
```

Add optional fields to `DownloadProgressData`:
```typescript
export interface DownloadProgressData {
  taskId: string
  progress: number
  offset: number
  speed: number
  state: 'downloading' | 'paused' | 'waiting' | 'completed' | 'failed' | 'retrying'
  filePath?: string
  error?: string
  totalSize?: number
  resumeNotSupported?: boolean
  retryCount?: number   // Current retry attempt for 'retrying' state
  retryDelay?: number   // Backoff delay in ms for 'retrying' state
}
```

### File: `src/services/download.service.ts`

Same changes as `DownloadProgressData` in `ipc.ts` — this file defines its own copy of the interface. Must keep in sync.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| No 'retrying' state in progress events | 'retrying' emitted before each backoff wait | Phase 35 | Renderer can show retry status |
| Speed always shown during download | Speed replaced by retry info during retry | Phase 35 | Only affects retrying state |
| All failures show error toast + "下载失败" | Exhausted retries show inline message, no toast | Phase 35 | Better UX for transient errors |
| activeDownloads = downloading only | activeDownloads = downloading + retrying | Phase 35 | Accurate slot-holding count |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The `'retrying'` progress event from main process will NOT carry an `error` field | Code Examples — Example 1 | The retrying branch before `if (error)` check handles this defensively; minimal risk |
| A2 | `retryStartedAtMap` is not persisted — just in-memory in the composable | Code Examples — Example 3 | After app restart, tasks are restored as `'paused'` not `'retrying'`, so no data loss |
| A3 | The failed event for exhausted retries uses message format `"下载失败 — 已重试 ${MAX_RETRIES} 次"` | Code Examples — Example 5 | Already implemented in Phase 34 (download.handler.ts line 685); confirmed by reading source |

**All other claims verified by reading source code. No user confirmation needed.**

## Environment Availability

**Skipped — no external dependencies beyond the existing project toolchain (TypeScript, Vue 3).**

All changes are in-renderer Vue/TypeScript code with one minor main-process addition (emit 'retrying' event in `executeWithRetry`). No new CLI tools, databases, or services required.

## Validation Architecture

**Skipped — `workflow.nyquist_validation` is explicitly set to `false` in `.planning/config.json`.**

## Security Domain

**Skipped — no new security boundaries introduced.**

Phase 35 involves:
- UI-only changes (template v-show blocks, CSS classes)
- One main-process change: emitting an additional field on an existing IPC event
- No new IPC channels, no new user input, no new data storage

The `'retrying'` event carries only `taskId`, `retryCount`, and `retryDelay` — information already tracked in the main process, exposed purely for display.

## Open Questions

1. **Should `DownloadItem` gain an `error` field for template display?**
   - What we know: The exhausted-failed message `"下载失败 — 已重试 3 次"` is set on `progressData.error` by the main process. Currently `handleProgress` does not store `error` on `DownloadItem`.
   - What's unclear: Whether to add `error?: string` to `DownloadItem` or use `retryCount === 3` check in template.
   - Recommendation: Add `error?: string` to `DownloadItem` for explicitness. It enables any future display of error messages. But the simplest approach for UI-03 is to check `item.retryCount === 3` (since that field is being added anyway).

2. **Should the exhausted-failure check trigger `showError` toast or suppress it?**
   - What we know: Current `handleProgress` calls `showError("下载失败: " + error)` unconditionally when `error` is present. The exhausted-failure message would get a double prefix.
   - What's unclear: Whether to suppress `showError` for retry-exhausted failures (show only inline message) or keep the toast.
   - Recommendation: Suppress toast for exhausted retries (D-04 says "clean summary"). The inline message is sufficient. Check `error.includes('已重试')` in the `if (error)` branch and skip `showError` for those.

3. **Main process: where exactly to emit 'retrying' event?**
   - What we know: The emit must happen after `entry.retryCount` is set and after `delay` is calculated but BEFORE `waitWithBackoff`. This is around line 657 in `executeWithRetry`.
   - What's unclear: Whether to emit even on the last retry attempt (attempt 3) before the exhaust path.
   - Recommendation: Emit on every attempt before waiting. The UI for attempt 3 shows "重试中 (第3次/共3次)" briefly before the task exhausts and transitions to `'failed'`. This is consistent behavior.

## Sources

### Primary (HIGH confidence) — source code verified

- `src/types/index.ts:180-199` — Current DownloadState union and DownloadItem interface
- `src/shared/types/ipc.ts:172-183` — Current DownloadProgressData interface
- `src/services/download.service.ts:14-25` — Service-layer DownloadProgressData type
- `src/composables/download/useDownload.ts:83-141` — Full handleProgress flow
- `src/stores/modules/download/index.ts:14-16` — activeDownloads computed filter
- `src/views/DownloadWallpaper.vue:17-93` — Full download item template (v-show pattern, :class binding)
- `src/views/DownloadWallpaper.vue:375-377` — `.pause-item .dowloaded-process-block` CSS pattern
- `src/utils/helpers.ts:149-158` — formatSpeed and related formatters
- `electron/main/ipc/handlers/download.handler.ts:614-691` — executeWithRetry (emission point for 'retrying')
- `electron/main/ipc/handlers/download.handler.ts:679-686` — Exhausted retry 'failed' event format
- `.planning/phases/34-error-classification-retry/34-CONTEXT.md` — Full Phase 34 retry architecture, D-07/D-08, D-12
- `.planning/config.json` — nyquist_validation: false

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — No new packages. All patterns verified in source.
- Architecture: HIGH — Data flow confirmed in executeWithRetry + handleProgress code.
- Pitfalls: HIGH — All pitfalls identified from existing code patterns and Phase 34 D-12/D-09.

**Research date:** 2026-05-01
**Valid until:** 2026-06-01 (stable codebase — no fast-moving dependencies)
