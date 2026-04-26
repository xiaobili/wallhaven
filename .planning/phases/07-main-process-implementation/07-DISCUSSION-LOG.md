# Phase 7: Main Process Implementation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-26
**Phase:** 07-main-process-implementation
**Mode:** --auto (fully autonomous)
**Areas discussed:** Range Request Strategy, State Persistence, Temp File Management, Resume Handler Implementation, Error Handling

---

## Range Request Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Direct Range Request | Send Range header directly without pre-checking server support. Simpler implementation, fewer requests. Server returns 206 (success) or 200 (no Range support). | ✓ |
| HEAD Request First | Send HEAD request to check Accept-Ranges header before attempting resume. Extra request overhead but cleaner error handling. | |

**Auto-selected:** Direct Range Request (recommended)
**Notes:** Simplifies implementation. Phase 9 will handle servers that don't support Range with graceful degradation.

---

## Range Request Failure Handling

| Option | Description | Selected |
|--------|-------------|----------|
| Restart Download | Delete temp file and start fresh download from byte 0 when Range fails. | ✓ |
| Keep Temp File | Preserve partial download but start fresh. Wastes space but preserves partial data. | |
| Error Out | Return error and let user decide. More control but worse UX. | |

**Auto-selected:** Restart Download (recommended)
**Notes:** Cleaner state management. User gets a working download rather than stuck in error state.

---

## State Persistence Timing

| Option | Description | Selected |
|--------|-------------|----------|
| On Pause Only | Write state file only when user pauses. Simpler but loses progress on crash. | |
| On Pause + Interval | Write on pause and every N seconds/MB during download. Balanced approach. | ✓ |
| On Every Progress | Write state on every progress update. Most resilient but high I/O overhead. | |

**Auto-selected:** On Pause + Interval (recommended)
**Notes:** 5 seconds or 10MB threshold balances resilience and performance.

---

## State File Write Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Direct Write | Write JSON directly to final path. Simple but risk of corruption on crash. | |
| Atomic Write | Write to temp file, then rename. Ensures data integrity even on crash. | ✓ |

**Auto-selected:** Atomic Write (recommended)
**Notes:** Prevents corrupted state files if app crashes during write.

---

## Temp File on Pause

| Option | Description | Selected |
|--------|-------------|----------|
| Delete (current behavior) | Delete .download file on pause. Cannot resume from breakpoint. | |
| Preserve | Keep .download file on pause. Allows resuming from exact position. | ✓ |

**Auto-selected:** Preserve (required for resume feature)
**Notes:** Core requirement for resume functionality. Distinguishes pause from cancel.

---

## Temp File on Cancel

| Option | Description | Selected |
|--------|-------------|----------|
| Preserve | Keep temp file. User might want to resume later. | |
| Delete | Remove temp file and state file. Clean slate for new download. | ✓ |

**Auto-selected:** Delete (recommended)
**Notes:** Cancel means user explicitly wants to stop. Preserve only on pause.

---

## Resume Validation

| Option | Description | Selected |
|--------|-------------|----------|
| Strict | Require exact offset match. Reject if temp file size differs from state. | |
| Lenient | Allow temp file >= state offset. Use actual file size for resume. | ✓ |
| None | Trust state file blindly. Fast but risky. | |

**Auto-selected:** Lenient (recommended)
**Notes:** Use actual temp file size if larger than recorded offset. Better resilience.

---

## GET_PENDING_DOWNLOADS Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Scan All Directories | Search entire filesystem for .download.json files. Comprehensive but slow. | |
| Scan Download Dir Only | Search only user's configured download directory. Fast and relevant. | ✓ |
| Track in Memory | Keep list in memory. Fast but lost on app restart. | |

**Auto-selected:** Scan Download Dir Only (recommended)
**Notes:** Downloads are always to user's configured directory. No need for broader scan.

---

## Claude's Discretion

- State file write throttling implementation details (5s/10MB threshold)
- Error message text for resume error codes
- Temp file size validation tolerance (allow small differences)
- Code organization and function decomposition

---

## Deferred Ideas

None — all decisions stayed within Phase 7 scope.

### Future Phase Considerations
- Phase 8: Renderer integration, UI state for resumed downloads
- Phase 9: HEAD request for Range support detection, file integrity validation, orphan temp file cleanup

---

*Auto-mode discussion completed: 2026-04-26*
