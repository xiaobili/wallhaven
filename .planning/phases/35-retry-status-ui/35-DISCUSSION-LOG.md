# Phase 35: 重试状态展示与UI集成 — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-01
**Phase:** 35-重试状态展示与UI集成
**Areas discussed:** Countdown mechanism, Retry UI layout, Pause/cancel during retry, Error display for exhausted retries

---

## Countdown Mechanism

| Option | Description | Selected |
|--------|-------------|----------|
| Renderer-side timer | Renderer stores retryDelay + timestamp, runs setInterval(1000) to count down | ✓ (discretion) |
| Main-process ticks | Main process emits periodic progress events with remainingMs | |

**User's choice:** You decide (Claude discretion)
**Notes:** Renderer-side timer chosen for minimal IPC traffic and self-contained per-task management. Timer intervals cleaned up in onUnmounted lifecycle.

---

## Retry UI Layout

| Option | Description | Selected |
|--------|-------------|----------|
| Replace speed with retry | Replace speed line with retry info, progress bar stays frozen | ✓ (discretion) |
| Replace progress area | Hide progress bar during retry, replace entire info section | |
| Banner overlay | Colored banner overlay on item showing retry status | |

**User's choice:** You decide (Claude discretion)
**Notes:** Follows existing v-show pattern. Minimal template changes. Progress bar frozen at last value, speed text replaced by retry count and countdown.

---

## Pause/cancel During Retry

| Option | Description | Selected |
|--------|-------------|----------|
| Show both (same as download) | Pause + cancel buttons during retry | |
| Show cancel only | Retry is transient, cancel only | ✓ (discretion) |
| You decide | Claude chooses | |

**User's choice:** You decide (Claude discretion)
**Notes:** Cancel only. Retry backoff is very transient (max ~8s per attempt). Pause button during such a brief window adds clutter. Cancel always works (D-08).

### Store activeDownloads filter

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — include retrying | activeDownloads includes 'retrying' state | ✓ (discretion) |
| No — exclude retrying | Keep filtering state === 'downloading' only | |

**User's choice:** You decide (Claude discretion)
**Notes:** Retrying tasks hold queue slots (DL-09). Including them in active count accurately reflects system state.

---

## Error Display for Exhausted Retries

| Option | Description | Selected |
|--------|-------------|----------|
| Show message + changed progress bar | Inline retry-exhausted message, gray progress bar, cancel button | ✓ |
| Auto-dismiss after delay | Auto-remove from list after a few seconds | |

**User's choice:** Show message + changed progress bar
**Notes:** Retry-exhausted message displayed inline. Gray progress bar (distinct from active blue and paused orange). Cancel button remains.

### Error detail display

| Option | Description | Selected |
|--------|-------------|----------|
| Summary only | "下载失败 — 已重试 3 次" | ✓ (discretion) |
| Include original error | "下载失败 — 已重试 3 次: ETIMEDOUT" | |

**User's choice:** You decide (Claude discretion)
**Notes:** Summary only. Original error detail is log-level noise for most users.

---

## Claude's Discretion

All 4 areas had at least one question answered with "you decide":
- **Countdown mechanism:** Renderer-side setInterval chosen
- **Retry UI layout:** Replace speed with retry info, progress bar stays frozen
- **Pause/cancel:** Cancel only during retry; include retrying in activeDownloads
- **Error display:** Summary only, hide original error detail

## Deferred Ideas

None — discussion stayed within phase scope.
