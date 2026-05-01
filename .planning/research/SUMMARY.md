# Project Research Summary

**Project:** Wallhaven v4.0 -- Multi-threaded Download with Retry Backoff
**Domain:** Electron desktop wallpaper downloader with concurrent download and retry backoff features
**Researched:** 2026-05-01
**Confidence:** MEDIUM-HIGH

## Executive Summary

Wallhaven v4.0 adds two tightly coupled features to an existing Electron wallpaper downloader: concurrent download enforcement (respecting the user's `maxConcurrentDownloads` setting) and automatic retry with exponential backoff. The project is a focused feature addition -- approximately 95-100 lines of new TypeScript across 3-4 files -- that requires zero new external dependencies. All concurrency and retry logic can be implemented using native Node.js/Promise APIs.

The recommended approach centers on a main-process DownloadQueue that gates how many downloads execute simultaneously, paired with an event-driven retry loop that classifies errors (transient vs. permanent) and applies exponential backoff with full jitter. Retry attempts hold their queue slot to prevent starvation, and all retry-triggered re-downloads go through the same queue as new downloads. The core challenge is not the complexity of the individual components (each is ~25-40 lines) but the integration: the queue must coordinate with existing pause/resume/cancel flows, the retry scheduler must be cancel-safe to prevent zombie downloads, and progress reporting must be batched to avoid IPC overload at high concurrency.

**Key risk:** The most critical architectural decision is where the queue lives. STACK.md and PITFALLS.md both recommend the main process handler as the authoritative queue location (consistent with the existing `activeDownloads` Map), while ARCHITECTURE.md proposes the renderer service layer. A renderer-side queue can be bypassed by multiple windows, direct IPC calls, or process reloads. The synthesis recommends the main-process approach with the service layer acting as the orchestration coordinator, but this must be confirmed during requirements definition.

## Key Findings

### Recommended Stack

**Zero new dependencies.** Both features use native TypeScript/Node.js APIs. The DownloadQueue is a ~25-line semaphore class using `Promise.prototype.finally()`. The retry wrapper is a ~40-line loop with `setTimeout`-based backoff. No `p-queue`, `p-limit`, `p-retry`, or `axios-retry` packages are needed.

**Core technologies:**
- **Native Promise semaphore** (`download.handler.ts`): Controls concurrent download slots -- no external concurrency library needed
- **Native retry loop** with exponential backoff: Classifies errors (retryable vs. permanent), applies full jitter (`Math.random() * baseDelay * 2^attempt`), caps at 30s max delay and 3 retries
- **Existing IPC channels** with one new state `'retrying'` and two new fields (`retryCount`, `retryDelay`) on `DownloadProgressData`
- **Existing state file infrastructure** extended with `retryCount` and `nextRetryAt` fields

**Version compatibility:** All APIs used (`Promise.prototype.finally()`, `AbortController`, `setTimeout`, `Math.random()`) are available in the project's existing Node.js 20+ / Electron 41 runtime. No version concerns.

### Expected Features

**Must have (table stakes):**
- Concurrent download enforcement -- the `maxConcurrentDownloads` slider (currently non-functional) must actually limit parallel downloads
- Auto-start queued tasks -- when a slot frees up, the next waiting task starts automatically without user intervention
- Visual queue status -- tasks waiting for a slot must show a "waiting" state with queue position, not appear stuck
- Error classification -- distinguish transient errors (network, 5xx, 429) from permanent errors (4xx, invalid URL) so retry only triggers on recoverable failures
- Automatic retry with exponential backoff -- up to 3 attempts with 2s/4s/8s delays, full jitter, capped at 30s

**Should have (competitive):**
- Retry attempt visibility in UI -- show "Retrying (1/3)" or "Failed -- retrying in 4s" instead of hiding retries
- Manual retry button on permanently failed items -- reset retry counter and re-enter queue
- Live concurrency limit change -- adjusting the slider while downloads are active immediately takes effect

**Defer (v2+):**
- Persistent retry state across app restart (save retry count to state files)
- Queue reordering (drag-to-reorder waiting tasks)
- Per-task retry configuration (right-click override of max retries)
- Segmented multi-threaded downloads (HTTP Range splitting for single files)

### Architecture Approach

The architecture extends the existing `Composable -> Service -> Client (IPC) -> Handler` pattern with two new components at the main process level. The DownloadQueue (~25 lines) sits alongside the existing `activeDownloads` Map in `download.handler.ts` and mediates which download tasks proceed to execution. The retry loop wraps the axios stream download call and applies exponential backoff on transient failures, reusing the existing Range-request resume logic. The renderer service layer (`DownloadService`) orchestrates the flow by calling queue enqueue/release methods and handling retry scheduling, while the handler remains the authoritative execution layer.

**Key architectural pattern -- slot-holding during retry:** When a download fails and will retry, its queue slot is NOT released. This prevents retry starvation and ensures retries always take priority over new waiting tasks. Only permanent failure or successful completion releases the slot.

**Critical note -- architectural disagreement on queue location:**
- STACK.md and PITFALLS.md argue for main-process queue (authoritative, multi-window safe)
- ARCHITECTURE.md argues for renderer service-layer queue (consistent with existing orchestration pattern)
- **Synthesis recommendation: Main-process queue** -- see Implications for Roadmap for the decision rationale

### Critical Pitfalls

1. **Semaphore in renderer only (window-scoped illusion):** A per-instance composable semaphore has no effect on other windows, direct IPC calls, or main-process retry logic. The queue MUST live in the main process handler. Risk: HIGH if placed in renderer; LOW if placed in main process.

2. **Retry on permanent errors (infinite loop):** Retrying 404/403/401 errors wastes bandwidth and delays other downloads. Must classify errors before retrying: transient codes (ECONNRESET, ETIMEDOUT, 429, 5xx) get retried; permanent codes (4xx except 429, CanceledError) fail immediately. Risk: MEDIUM; prevented by explicit error classification.

3. **Zombie downloads (retry after cancel/pause):** A `setTimeout` retry callback can fire after the user has cancelled or paused a download, re-animating it. Every retry attempt must check the current task state before executing, and cancel/pause must clear retry timers. Risk: MEDIUM; prevented by state check plus timer cancellation.

4. **Retry storm / unbounded queue growth:** Multiple downloads failing simultaneously (e.g., network outage) create synchronized retry timers that fire as a thundering herd. Mitigated by: full jitter on backoff delays, routing all retries through the main-process queue (not direct IPC), and capping retry-in-flight tasks. Risk: MEDIUM; prevented by jitter plus queue routing.

5. **Progress persistence corruption under concurrent writes:** The completion sequence (rename temp file, delete state file, remove from memory) is not transactional. A crash between steps leaves orphan state files. Fix ordering: delete state file before renaming temp file. Risk: LOW-MEDIUM; existing orphan cleanup handles recovery but ordering fix is cheap.

## Implications for Roadmap

### Phase 1: Queue Infrastructure (Main Process)

**Rationale:** Everything depends on the queue. Retry, settings propagation, and UX polish all require a working concurrency gate. Without the queue, the `maxConcurrentDownloads` setting remains non-functional, and retry logic has no mechanism to control slot usage.

**Delivers:** Working concurrent download enforcement. The `maxConcurrentDownloads` slider actually limits parallel downloads. Tasks at capacity enter "waiting" state with queue position visible. Download slots auto-fill as tasks complete.

**Addresses features from FEATURES.md:**
- Concurrent download enforcement (P1)
- Auto-start queued tasks (P1)
- Waiting state actually used (P1)

**Addresses pitfalls from PITFALLS.md:**
- Pitfall 1 (renderer-only semaphore): Queue placed in main process from day one
- Pitfall 5 (progress persistence): Fix state file ordering (delete before rename)
- Pitfall 6 (windows[0]): Fix progress broadcast to all windows
- Pitfall 7 (IPC serialization): Batch progress updates, reduce frequency
- Pitfall 8 (restore race): Restored tasks go through queue

**Files changed:**
- `electron/main/ipc/handlers/download.handler.ts` -- add DownloadQueue class, modify handlers to enqueue/dequeue
- `src/composables/download/useDownload.ts` -- minimal changes to handle 'waiting' state
- `src/stores/modules/download/index.ts` -- ensure state transitions work with queue

**Research flag:** No additional research needed. The DownloadQueue pattern is well-documented (standard semaphore, ~25 lines). Implementation is straightforward.

---

### Phase 2: Retry with Exponential Backoff

**Rationale:** Depends on Phase 1 (queue must exist so retries can hold slots). Error classification must precede retry logic, and zombie prevention must be built into the scheduler, not patched later.

**Delivers:** Automatic retry of transient download failures with exponential backoff. Errors classified as retryable (network errors, 5xx, 429) trigger auto-retry. Permanent errors (404, 403, 401) fail immediately. Retry status visible in UI: "Retrying (1/3)" or "Failed -- retrying in 4s". After max retries exhausted, manual retry button appears.

**Addresses features from FEATURES.md:**
- Automatic retry with exponential backoff (P1)
- Error classification (P1)
- Retry status in UI (P1)
- Manual retry button (P1)

**Addresses pitfalls from PITFALLS.md:**
- Pitfall 2 (retry on permanent errors): Explicit error classification
- Pitfall 3 (zombie downloads): Timer cancellation plus state check before retry
- Pitfall 4 (retry storm): Full jitter plus retry through queue
- Pitfall 9 (error feedback explosion): Suppress errors during retry; aggregate on final failure

**Files changed:**
- `electron/main/ipc/handlers/download.handler.ts` -- add retry wrapper, error classification, progress IPC with `errorCategory`
- `src/shared/types/ipc.ts` -- add `'retrying'` state and `retryCount`/`retryDelay`/`errorCategory` fields
- `src/types/index.ts` -- add `'retrying'` to `DownloadState` union
- `src/composables/download/useDownload.ts` -- handle retry state, suppress errors during retry
- `src/stores/modules/download/index.ts` -- add `retryCount` to store items

**Research flag:** No additional research needed. Retry with backoff is a well-documented pattern. The error classification logic is deterministic. The main challenge is integration coordination with the queue, which is handled by the build order.

---

### Phase 3: Settings Integration and UX Polish

**Rationale:** Depends on Phase 1 (queue must exist to accept `setConcurrency` calls). Can proceed in parallel with Phase 2 since it touches different code paths (settings propagation vs. retry logic).

**Delivers:** Live concurrency limit changes -- slider adjustment immediately affects active queue. Queue position display in download UI (shows "3 of 8 waiting"). Edge case hardening: graceful concurrency reduction (pause excess downloads rather than killing connections), network recovery detection, "Looks Done" checklist verification.

**Addresses features from FEATURES.md:**
- Live concurrency limit change (P2)
- Queue position display (implied by waiting state work)
- Remaining UX concerns from PITFALLS.md checklist

**Addresses pitfalls from PITFALLS.md:**
- Settings change during active downloads (graceful pause)
- All "Looks Done But Isn't" checklist items

**Files changed:**
- `src/composables/settings/useSettings.ts` -- propagate `maxConcurrentDownloads` changes to queue
- `src/views/sub/DownloadWallpaper.vue` -- show queue position, retry state
- `electron/main/ipc/handlers/download.handler.ts` -- handle dynamic concurrency changes

**Research flag:** No additional research needed. Settings propagation is a mechanical change. UX polish is implementation work, not research.

---

### Phase Ordering Rationale

- **Phase 1 first** because the queue is the foundation that both retry and settings propagation depend on. Building retry without queue means retries would bypass concurrency control entirely, which is the exact scenario Pitfall 4 warns against.
- **Phase 2 second** because retry integrates with the queue (slot-holding during backoff) and must be built with queue awareness from the start. Error classification is independent but naturally precedes the UI work.
- **Phase 3 can overlap** with Phase 2 since settings propagation and UX polish are largely independent of the retry scheduler's internal logic. Queue position display only requires Phase 1.
- **No feature in this milestone requires external research** -- all patterns are well-documented standard approaches.

### Research Flags

Phases likely needing deeper research during planning:
- **None.** All three phases use well-documented, standard patterns. The only open question is the queue location decision (main process vs. renderer), which must be resolved during requirements definition, not research.

Phases with standard patterns (skip research-phase):
- **Phase 1:** Promise semaphore pattern, standard queue operations
- **Phase 2:** Exponential backoff with jitter, error classification
- **Phase 3:** Settings propagation, Vue reactivity

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Zero new dependencies. All APIs verified available in existing Electron 41 / Node 20+ runtime. Implementation is 95-100 lines of well-understood patterns. |
| Features | HIGH | Clear table stakes vs. differentiators. Feature dependencies mapped explicitly. MVP scope well-defined. P1/P2/P3 prioritization is actionable. |
| Architecture | MEDIUM | Disagreement between STACK+PITFALLS (main process queue) and ARCHITECTURE (renderer service layer queue) requires resolution. The main-process approach is more robust for multi-window scenarios, but the service-layer approach follows the existing pattern more closely. Needs explicit decision during requirements definition. |
| Pitfalls | HIGH | Comprehensive coverage of 9 critical pitfalls with clear prevention strategies, recovery costs, and phase mapping. "Looks Done" checklist provides concrete verification criteria. |

**Overall confidence:** MEDIUM-HIGH

The sole source of uncertainty is the architectural disagreement on queue placement. All other areas are well-researched with high confidence. The implementation is small (~100 lines), well-scoped, and uses familiar patterns.

### Gaps to Address

- **Queue location decision:** Must be resolved during requirements definition. Recommended approach (from STACK plus PITFALLS): main process handler. Backup approach (from ARCHITECTURE): renderer service layer with validation that it is multi-window safe. The decision affects file structure, IPC protocol, and state management flow.
- **Retry progress IPC integration:** Whether to use a new `'retrying'` state (cleaner, recommended) or send retry info alongside `'failed'` state. The `'retrying'` approach is simpler and maintains backward compatibility.
- **Restore policy on startup:** Must decide whether restored tasks auto-resume up to the concurrency limit or remain paused. The conservative approach (auto-resume up to limit) matches user expectations better.

## Sources

### Primary (HIGH confidence)
- Existing codebase analysis: `electron/main/ipc/handlers/download.handler.ts`, `src/composables/download/useDownload.ts`, `src/stores/modules/download/index.ts`, `src/services/download.service.ts`, `src/shared/types/ipc.ts`, `src/types/index.ts` -- all examined for current state vs. target state
- Node.js `Promise.prototype.finally()` -- native semaphore pattern verified
- Axios error handling -- `CanceledError` vs network errors vs HTTP status code classification
- Electron IPC documentation -- `webContents.send` and `BrowserWindow.getAllWindows` behavior

### Secondary (MEDIUM confidence)
- AWS Architecture Blog -- "Exponential Backoff and Jitter" (distributed systems pattern for retry storm prevention)
- aria2 architecture reference -- event-driven concurrent download engine patterns
- AB Download Manager -- modern desktop download manager queue and scheduling UI patterns
- es-toolkit Semaphore, p-queue, p-retry API references -- evaluated and rejected in favor of native implementations

### Tertiary (LOW confidence)
- paradown (Rust) -- multi-threaded CLI downloader with exponential backoff (different language, same pattern)
- @transferx/downloader (Node.js) -- parallel downloader with adaptive concurrency (over-engineered for wallpaper scale)

---
*Research completed: 2026-05-01*
*Ready for roadmap: yes*
