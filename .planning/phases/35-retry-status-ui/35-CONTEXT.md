# Phase 35: 重试状态展示与UI集成 — Context

**Gathered:** 2026-05-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Add retry state visualization to the download center UI. Users see when a download is retrying, how many attempts remain, a live countdown to the next retry, and a clear message when all retries are exhausted.

**Requirements:** UI-01, UI-02, UI-03
- UI-01: Show "重试中 (第X次/共3次)" for downloads currently in retry
- UI-02: Show live countdown to next retry attempt (e.g., "下次重试: 4s")
- UI-03: Downloads that exhausted all 3 retries display "下载失败 — 已重试 3 次"

**Must modify:**
- `src/types/index.ts` — Add `'retrying'` to DownloadState union; add `retryCount?`, `retryDelay?` to DownloadItem
- `src/shared/types/ipc.ts` — Add `'retrying'` to DownloadProgressData state union; add `retryCount?`, `retryDelay?` fields
- `src/composables/download/useDownload.ts` — Handle `'retrying'` state in handleProgress
- `src/stores/modules/download/index.ts` — Update activeDownloads filter to include 'retrying'
- `src/views/DownloadWallpaper.vue` — Add retry state display + exhausted-failure display in template

**Not in scope:**
- Configurable max retries (DL-NEXT) — future phase
- Manual retry button for permanently failed downloads — future phase
- Error toast suppression (already handled in Phase 34 — transient errors don't emit 'failed')
- Download speed limiting

</domain>

<decisions>
## Implementation Decisions

### D-01: Countdown mechanism — renderer-side setInterval

The countdown timer lives entirely in the renderer. When `handleProgress` receives a `'retrying'` progress event:

1. Renderer stores `retryDelay` (total backoff ms from main process) and `retryStartedAt = Date.now()` on the DownloadItem
2. A `setInterval(1000)` runs in `useDownload`, updating a reactive `remainingSeconds` computed per task
3. When remaining reaches 0, the countdown stops and waits for the next progress event (either `'completed'` or `'failed'`)
4. No IPC traffic for countdown ticks — self-contained in the renderer

**Retry state fields added to DownloadItem:**
```typescript
interface DownloadItem {
  // ... existing fields ...
  retryCount?: number   // Current retry attempt (1-based)
  retryDelay?: number   // Total delay for current backoff (ms)
}
```

**Timer management:**
- Interval IDs stored locally in `useDownload` composable (not in the store)
- Cleaned up in `onUnmounted` lifecycle hook
- One interval per retrying task, cleared when task leaves retrying state

### D-02: Retry UI layout — replace speed with retry info, progress bar stays frozen

The existing download item template uses `v-show` for state-specific content. Following the same pattern:

| State | Shows |
|-------|-------|
| `downloading` | Speed, progress bar (existing) |
| `waiting` | "等待中" (existing) |
| `paused` | "已暂停" (existing) |
| `retrying` | "重试中 (第X次/共3次)", "下次重试: 4s", frozen progress bar |
| `failed` (retry-exhausted) | "下载失败 — 已重试 3 次", gray progress bar, cancel button |

**Layout during retrying:**
```
[thumbnail]     尺寸: {{resolution}}
                图片大小: {{size}}
                [✕]
                重试中 (第1次/共3次)
                下次重试: 4s
                已下载: {{offset}}
                ████████░░░░ {{progress}}%  (frozen)
```

The progress bar keeps its last value and is frozen (no updates arrive during retry since no data is being transferred). Speed text is replaced by retry info.

### D-03: Pause/cancel during retry — cancel only

Previous decisions (Phase 34 D-07, D-08) ensure PAUSE and CANCEL handlers both work during retry by cancelling retry timers. However, the retry backoff window is very transient (max ~8s per attempt, total ~14s across 3 attempts). Adding a pause button for such a brief state adds UI clutter without real value.

**Cancel button remains visible** (it's always shown regardless of state in the current template). No pause button during retry — user can always cancel and re-download if needed.

**Store activeDownloads filter** updated to include `'retrying'`:
```
activeDownloads = downloadingList.filter(state === 'downloading' || state === 'retrying')
```

This accurately reflects slot-holding behavior (DL-09: retry holds queue slot) and keeps the retrying task visible in the downloading section where users can interact with it.

### D-04: Exhausted retry display — inline message with gray progress bar

When all 3 retries fail, the main process emits a `'failed'` progress event with message `"下载失败 — 已重试 3 次: ${originalError}"`. The UI shows:

- The retry-exhausted message (summary only — original error detail not shown to user)
- Progress bar changed to gray color (visually distinct from active blue and paused orange)
- Cancel button still available so user can dismiss the failed item
- Item stays in downloadingList until user cancels it (consistent with current failure behavior)

**Message display:** `"下载失败 — 已重试 3 次"` — clean summary. The original technical error (ETIMEDOUT, etc.) is visible in dev tools/logs.

### D-05: handleProgress integration

The `handleProgress` callback in `useDownload.ts` gains a branch for `state === 'retrying'`:

```typescript
if (state === 'retrying') {
  const task = store.downloadingList.find((item) => item.id === taskId)
  if (task) {
    task.state = 'retrying'
    task.retryCount = retryCount  // from progress event
    task.retryDelay = retryDelay  // from progress event
  }
  // NO error toast — retry is transient, toast would spam user
  return
}
```

This runs BEFORE the `if (error)` check, so the `'retrying'` event (which may also carry an `error` field with the original failure reason) doesn't trigger `showError()`.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Planning
- `.planning/PROJECT.md` — Core value, constraints, scope
- `.planning/REQUIREMENTS.md` — UI-01 through UI-03 specs
- `.planning/ROADMAP.md` — Phase dependencies, success criteria
- `.planning/STATE.md` — Current state, accumulated context

### Prior Phase Context
- `.planning/phases/34-error-classification-retry/34-CONTEXT.md` — Retry architecture, D-07/D-08 for PAUSE/CANCEL timer handling, error classification, backoff constants (MUST READ)
- `.planning/phases/33-download-queue-concurrency/33-CONTEXT.md` — Queue architecture, slot model

### Codebase Maps
- `.planning/codebase/ARCHITECTURE.md` — Download flow, IPC patterns
- `.planning/codebase/INTEGRATIONS.md` — IPC channel list, download flow diagram
- `.planning/codebase/CONVENTIONS.md` — Coding conventions, patterns
- `.planning/codebase/STRUCTURE.md` — Project structure

### Key Source Files

#### Must Modify
- `src/types/index.ts:180` — DownloadState union (add `'retrying'`)
- `src/types/index.ts:185-199` — DownloadItem interface (add `retryCount?`, `retryDelay?`)
- `src/shared/types/ipc.ts:172-183` — DownloadProgressData (add `'retrying'` state, `retryCount?`, `retryDelay?` fields)
- `src/composables/download/useDownload.ts:83` — handleProgress (add retrying branch)
- `src/stores/modules/download/index.ts:14-16` — activeDownloads computed (include 'retrying')
- `src/views/DownloadWallpaper.vue` — Template v-show blocks for retrying + failed states

#### Reference (read-only)
- `electron/main/ipc/handlers/download.handler.ts` — Retry event emission, retryTimers, PAUSE/CANCEL handler behavior
- `src/services/index.ts` — DownloadProgressData type export used by useDownload

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- **v-show pattern for state display:** The template already uses `v-show="item.state === 'downloading'"` / `=== 'waiting'` / `=== 'paused'` for state-specific content. Adding `retrying` and `failed` states follows the exact same pattern.
- **Counter/timer utilities:** `formatSpeed`, `formatFileSize`, `formatTime` in `src/utils/helpers.ts` — may need a `formatCountdown` or similar if countdown formatting is non-trivial.
- **Alert composable:** `useAlert` for toast notifications — already imported, used for `showError` (must suppress during retry).

### Established Patterns

- **Progress event driven UI:** The renderer reacts to `download-progress` events from the main process. The renderer never predicts state — it always follows the main process's lead.
- **Scoped CSS with BEM-like naming:** Template changes need scoped styles. Existing `.pause-item` shows how to style state-specific variants (e.g., `.failed-item` for exhausted retries).
- **Store computed filters:** `activeDownloads` and `pausedDownloads` computed from state filters. Change pattern is well-established.

### Integration Points

- **useDownload handleProgress:** Entry point for all progress events. The `'retrying'` branch must go BEFORE the `if (error)` check to avoid triggering error toasts.
- **Download store activeDownloads:** Change filter from `state === 'downloading'` to `state === 'downloading' || state === 'retrying'`.
- **DownloadItem type:** Add `retryCount?` and `retryDelay?` fields. These are set from the progress event data.
- **DownloadProgressData type (shared):** Add `'retrying'` to state union. This type is used by both main process (sending) and renderer (receiving).

</code_context>

<specifics>
## Specific Ideas

1. **setInterval with per-task tracking:** A single `setInterval(1000)` can iterate over all retrying tasks and decrement their remaining time, rather than creating one interval per task. Simpler lifecycle management.
2. **Countdown display format:** Use `Math.ceil(retryDelay / 1000)` to show seconds. Once below 1s, show "即将重试..." instead of "下次重试: 0s".
3. **CSS class for exhausted state:** Add `.failed-item` class (analogous to `.pause-item`) for the gray progress bar on exhausted retries.
4. **Error message format in UI:** Main process sends `"下载失败 — 已重试 3 次: ${originalError}"`. Renderer extracts just the `"下载失败 — 已重试 X 次"` portion for display. The `retryCount` field from the progress event can also be used to reconstruct the message if needed.
5. **Paused-task immunity:** Paused tasks don't retry — the PAUSE handler cancels the retry timer (D-07). So when a task resumes from paused state, it starts fresh (new download attempt, no retry in progress).

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 35-重试状态展示与UI集成*
*Context gathered: 2026-05-01*
