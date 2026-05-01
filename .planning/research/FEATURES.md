# Feature Research: Multi-threaded Download with Retry Backoff

**Domain:** Desktop wallpaper download manager (Electron)
**Researched:** 2026-05-01
**Confidence:** HIGH

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist for a download manager with concurrent download settings. Missing these = product feels broken or deceptive.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Concurrency limit enforcement** | Slider exists on settings page labeled "Max concurrent downloads" with range 1-10. Currently does nothing — all tasks start immediately regardless of setting. Users who set this to 1 expect serial execution. | LOW | Core gap in current implementation. The `maxConcurrentDownloads` value is saved in settings but never read by the download pipeline. |
| **Auto-start queued tasks** | When a slot frees up (download completes, fails, or is cancelled), the next waiting task should start automatically. Users should not need to manually click "start" on queued items. | MEDIUM | Requires queue processing loop in main process. Current `activeDownloads` Map exists but has no queue. |
| **Visual queue status** | Tasks that are waiting for a slot need a clear "waiting" indicator showing their position in queue. Users need to understand why a task isn't downloading yet. | LOW | Already partially implemented: `DownloadItem.state` has `'waiting'` value. But no tasks ever stay in this state — they transition immediately to `'downloading'`. |
| **Manual retry on failure** | When a download fails, users expect a retry button. Showing a Chinese error alert then doing nothing is insufficient. | LOW | Current behavior: shows `showError('下载失败: ${error}')` and leaves the task in `'failed'` state. No user action available beyond manual remove-and-re-add. |
| **Status clarity** | At any moment users should see: which tasks are downloading, which are waiting, which failed, and which completed. Color-coding (blue=active, green=done, orange=paused, red=failed) is standard. | LOW | Current UI already shows status text but the `waiting` state never actually occurs. Paused/completed states work correctly. |

### Differentiators (Competitive Advantage)

Features that set a wallpaper download manager apart. Not required for basic function, but valuable for reliability and user trust.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Automatic retry with exponential backoff** | Downloads fail for transient reasons (network blips, server timeout, rate limiting). Auto-retry with backoff handles these invisibly — user comes back to completed downloads rather than red failures. | MEDIUM | The key new feature for this milestone. Must: classify errors, implement backoff timing with jitter, cap retries, and keep UI informed of retry progress. |
| **Retry attempt visibility** | Show "Retrying (2/3)..." as part of the status text so users understand the system is handling the failure rather than stuck. Builds trust. | LOW | Simple status label extension. Only appears during retry state. |
| **Persistent retry state across app restart** | If a download was retrying when the app closed, resume the retry timer on next launch rather than starting from zero. Prevents infinite restart-retry cycles. | MEDIUM | Requires persisting retry count and next-retry timestamp in the state file. Already have `.download.json` state file infrastructure. |
| **Queue reordering** | Drag-to-reorder waiting tasks so users can prioritize important wallpapers. | HIGH | Adds significant UX complexity. Defer to future milestone. |
| **Per-task retry configuration** | Allow users to set max retries per download (e.g., right-click "Retry up to 5 times"). Power-user feature. | MEDIUM | Settings-level default + per-task override. Defer until basic retry is stable. |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem useful but create real problems in practice.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Unlimited retry** | "Never give up on my downloads" | Creates infinite loops if a URL is permanently broken. Wastes bandwidth, fills logs, and frustrates users. | Hard cap (default 3, max 5) with clear "Max retries exceeded" state. |
| **Retry without jitter** | Simpler implementation | In a concurrent download system, multiple retries firing simultaneously create thundering herd on the server. All retries sync up and fail together. | Always add random jitter to backoff (`delay + random(0, 1000)ms`). |
| **Show retry as separate download entries** | "I want to see every attempt" | Clutters the UI, duplicates entries, confuses users about what's a real download vs a retry. Retry is a property of the *existing* download, not a new download. | Update status in-place: "Failed — retrying in 4s (2/3)". |
| **Retry 4xx errors (404, 403, 401)** | "Try harder" | These errors are permanent — the server explicitly refuses the request. Retrying is wasted bandwidth and creates bad server citizenship. | Classify errors: network errors + 5xx = retry; 4xx = immediate fail with clear message. |
| **Configurable per-server connection limits** | Power users want fine-grained control | Over-engineered for a wallpaper browser. Users are downloading from one source (Wallhaven). | Global concurrency limit is sufficient. Add per-server limits only if user reports show necessity. |
| **Segmented single-file download (HTTP Range splitting)** | Faster large file downloads | Over-engineered for wallpapers (typically 1-20 MB files). Range splitting adds complexity (chunk management, reassembly, server compatibility checks) for minimal gain at this file size scale. | Single-stream download with pause/resume is sufficient. Range splitting can be considered if downloading 4K/8K wallpapers becomes common. |

## Feature Dependencies

```
Concurrent Download Enforcement
    └──requires──> Queue Manager (main process)
                       └──requires──> Active download slot tracking
                       └──requires──> Slot-free event → dequeue next task

Auto-start Queued Tasks
    └──requires──> Concurrent Download Enforcement
                       └──requires──> Queue Manager

Automatic Retry with Exponential Backoff
    └──requires──> Error classification (retryable vs permanent)
    └──requires──> Timer/scheduler for delayed retry
    └──requires──> Retry count tracking per download
    └──enhances──> Concurrent Download Enforcement (retries consume a slot)

Retry Attempt Visibility
    └──requires──> Automatic Retry with Exponential Backoff
    └──requires──> Extended DownloadProgressData with retry fields

Manual Retry Button
    └──requires──> "failed" state handling in useDownload
    └──independent of──> Automatic Retry (both can coexist)

Persistent Retry State
    └──requires──> Extended PendingDownload schema with retry fields
    └──enhances──> Automatic Retry with Exponential Backoff

Queue Reordering
    └──requires──> Queue Manager
    └──conflicts──> "Auto-start queued tasks" (reordering is meaningless if tasks start immediately; only applies to waiting tasks)
```

### Dependency Notes

- **Concurrent Download Enforcement is the foundation.** Nothing else works without it because the current code starts every task immediately. Building retry on top of the current architecture would mean retries bypass the concurrency limit entirely.
- **Error classification must precede retry logic.** Without classifying errors, the retry mechanism would waste attempts on permanent failures (404). The classification is simple (2-state: retryable vs permanent) but must be done deliberately.
- **Retries should consume a download slot.** Otherwise, a retrying task runs "invisibly" alongside the N active slots, effectively allowing N+retrying tasks. This undermines the concurrency limit and can cause excessive parallel connections.
- **Automatic and manual retry can coexist.** Manual retry is the fallback when automatic retry is exhausted. The retry button should reset the retry counter to 0 and re-enter the queue.
- **IPC channel compatibility is critical.** The existing `download-progress` IPC channel sends states `'downloading' | 'paused' | 'waiting' | 'completed' | 'failed'`. Adding retry requires either: (a) a new state `'retrying'`, or (b) sending retry info alongside the `'failed'` state. Option (a) is cleaner and maintains backward compatibility for existing listeners.

## MVP Definition

### Launch With (v4.0)

Minimum viable features for "concurrent download + retry backoff" to feel complete and working.

- [ ] **Concurrent download enforcement** — Queue manager in main process reads `maxConcurrentDownloads` from settings. `startDownloadTask` handler enqueues tasks when at capacity. Completed/failed tasks trigger dequeue.
- [ ] **Auto-start queued tasks** — When a download slot frees up (complete/fail/cancel), the next waiting task starts automatically with no user intervention.
- [ ] **Waiting state actually used** — Tasks added while at concurrency limit stay in `'waiting'` state. UI shows waiting indicator with queue position.
- [ ] **Automatic retry with exponential backoff** — Transient failures (network timeout, 5xx, connection reset) trigger retry. Base delay 1s, factor 2x, max 30s, full jitter. Max 3 attempts. Retries consume a download slot.
- [ ] **Error classification** — Separate retryable errors (timeout, ECONNRESET, 5xx, 429) from permanent errors (404, 403, 401, invalid URL). Only retry retryable errors.
- [ ] **Retry status in UI** — Show "Retrying (1/3)" or "Failed — retrying in 4s" on the download item during retry state.
- [ ] **Manual retry button** — After max retries exhausted, show a retry button on the failed item that resets the retry counter and re-enters the queue.

### Add After Validation (v4.x)

Features to add once the core retry and concurrency are stable.

- [ ] **Persistent retry state** — Save retry count and next-retry timestamp in `.download.json` state files. On app restart, resume retry timers rather than starting from zero.
- [ ] **Retry notification** — When a download is retried (not failed, but retrying), show a non-intrusive toast/snackbar rather than the current error dialog.
- [ ] **Concurrent download change applied live** — If user changes the `maxConcurrentDownloads` slider while downloads are running, immediately adjust the slot count without restarting anything.

### Future Consideration (v5+)

Features to defer until the core concurrent download system is proven stable.

- [ ] **Queue reordering** — Drag-and-drop reorder of waiting tasks. Only valuable if users frequently have long queues.
- [ ] **Per-task retry configuration** — Right-click menu to set max retries per download. Adds UI complexity for a niche need.
- [ ] **Segmented multi-threaded downloads** — Splitting a single wallpaper into HTTP Range chunks for parallel download. Marginal benefit for typical wallpaper sizes (1-20 MB). Revisit if 4K/8K wallpapers are common.

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Concurrent download enforcement | HIGH | MEDIUM | P1 |
| Auto-start queued tasks | HIGH | LOW | P1 |
| Waiting state in UI | MEDIUM | LOW | P1 |
| Automatic retry with exponential backoff | HIGH | MEDIUM | P1 |
| Error classification | HIGH | LOW | P1 |
| Retry status in UI | MEDIUM | LOW | P1 |
| Manual retry button | MEDIUM | LOW | P1 |
| Persistent retry state | LOW | MEDIUM | P2 |
| Live concurrency limit change | MEDIUM | MEDIUM | P2 |
| Retry notification (non-intrusive) | LOW | LOW | P2 |
| Queue reordering | LOW | HIGH | P3 |
| Per-task retry config | LOW | MEDIUM | P3 |
| Segmented single-file downloads | LOW | HIGH | P3 |

**Priority key:**
- P1: Must have for v4.0 MVP
- P2: Should have, add when core is stable
- P3: Nice to have, defer

## Feature Gap Analysis: Current vs. Target

| Area | Current State (v3.0) | Target State (v4.0) |
|------|---------------------|---------------------|
| **Concurrency control** | None — every `startDownloadTask` IPC call immediately initiates a download. | Queue manager in main process enforces limit using `maxConcurrentDownloads` setting. Tasks at capacity enter waiting state. |
| **Queue management** | No queue exists. `activeDownloads` Map tracks active tasks only. | `waitingQueue: DownloadRequest[]` alongside `activeDownloads: Map<string, ActiveDownload>`. Dequeue triggered on complete/fail/cancel. |
| **Waiting state** | `DownloadItem.state` has `'waiting'` in the type but no code path ever produces it. | Renderer shows waiting indicator. Main process reports state transitions via `download-progress` IPC. |
| **Error handling** | All errors → `state: 'failed'` + `showError('下载失败: ${error}')`. No retry. | Errors classified. Retryable → auto-retry with backoff. Permanent → immediate fail + retry button. |
| **Progress IPC** | States: `'downloading' | 'paused' | 'waiting' | 'completed' | 'failed'` | Add `'retrying'` state. Extend `DownloadProgressData` with `retryCount` and `retryDelay` fields. |
| **Settings usage** | `maxConcurrentDownloads` saved but never read by download pipeline. | Downloaded pipeline reads setting at task submission time. Could be read on each slot-free event for live adjustment. |
| **State file** | Contains: taskId, url, filename, saveDir, offset, totalSize, createdAt, updatedAt | Add: `retryCount: number`, `nextRetryAt: string | null` |

## Implementation Architecture Notes

### Where the Queue Lives

The queue MUST live in the **main process** (`download.handler.ts`), not the renderer. Reasons:

1. **Persistence**: State files are written by the main process. If the renderer crashes, the queue state is lost.
2. **IPC overhead**: If the renderer manages the queue, every slot-free event requires a round-trip IPC call ("slot free, what next?"). This adds latency and complexity.
3. **Single source of truth**: The main process already owns the `activeDownloads` Map. Adding a queue alongside it is the natural extension.
4. **Settings access**: Settings are read from Electron store in the main process. Passing settings to renderer just to queue tasks adds unnecessary data flow.

### Queue Architecture

```
activeDownloads: Map<string, ActiveDownload>   // currently downloading
waitingQueue: DownloadRequest[]                 // waiting for slot (FIFO)

startDownloadTask(task):
  if activeDownloads.size < maxConcurrentDownloads:
    activeDownloads.set(taskId, new ActiveDownload(...))
    start actual download
    return { success: true }
  else:
    waitingQueue.push(task)
    send progress { state: 'waiting', queuePosition: waitingQueue.length }
    return { success: true, queued: true }

onDownloadComplete / onDownloadFailed / onDownloadCancelled(taskId):
  activeDownloads.delete(taskId)
  if waitingQueue.length > 0:
    next = waitingQueue.shift()
    activeDownloads.set(next.taskId, new ActiveDownload(...))
    start actual download
```

### Retry State Machine

```
[downloading] ──error (retryable)──> [retrying] ──timer──> [downloading]
    │                                    │                     │
    │                              permanent fail              │
    │                              OR max retries              │
    v                                    v                     v
[failed] ──manual retry button──> [waiting] ──slot free──> [downloading]
    ^                                                        │
    └──────────────────── complete ──────────────────────────┘
```

### IPC Protocol Changes

Current `download-progress` message:
```typescript
interface DownloadProgressData {
  taskId: string
  progress: number
  offset: number
  speed: number
  state: 'downloading' | 'paused' | 'waiting' | 'completed' | 'failed'
  filePath?: string
  error?: string
  totalSize?: number
  resumeNotSupported?: boolean
}
```

Extended for v4.0:
```typescript
interface DownloadProgressData {
  taskId: string
  progress: number
  offset: number
  speed: number
  state: 'downloading' | 'paused' | 'waiting' | 'completed' | 'failed' | 'retrying'
  filePath?: string
  error?: string
  totalSize?: number
  resumeNotSupported?: boolean
  retryCount?: number       // NEW: current retry attempt (1-based)
  maxRetries?: number        // NEW: maximum retry attempts
  retryDelay?: number        // NEW: delay before next retry in ms
  queuePosition?: number     // NEW: position in waiting queue
}
```

## Sources

- **aria2 architecture** (C++): Reference for event-driven concurrent download engine with RequestGroupMan scheduler and segment management. [DeepWiki](https://deepwiki.com/aria2/aria2/2-core-architecture)
- **AB Download Manager**: Modern Compose-based desktop download manager with queue and scheduling UI. [GitCode](https://blog.gitcode.com/652651c66bea6d5aa5b1471cbea9f6ed.html)
- **paradown** (Rust): Multi-threaded CLI downloader with configurable exponential backoff retry. [docs.rs](https://docs.rs/crate/paradown/0.1.1)
- **@transferx/downloader** (Node.js): 8-way parallel downloader with EMA progress, adaptive concurrency, byte-level resume. [npm](https://www.npmjs.com/package/@transferx/downloader)
- **cwait** (npm): Promise-based concurrency limiter pattern. [npm](https://www.npmjs.com/package/cwait)
- **Worker pool pattern**: Thread pool pattern for concurrent task execution with resource limits. [Socket](https://socket.dev/npm/package/workerpool)
- **Existing codebase analysis**: `download.handler.ts`, `download.service.ts`, `useDownload.ts`, `download store`, `SettingPage.vue` — all analyzed for current state vs. target state.

---
*Feature research for: v4.0 Multi-threaded download with retry backoff*
*Researched: 2026-05-01*
