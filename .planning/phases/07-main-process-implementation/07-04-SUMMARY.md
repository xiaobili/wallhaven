---
phase: "07"
plan: "04"
subsystem: download
tags: [pending-downloads, state-scan, recovery]
requires: [CORE-02]
provides: [pending-downloads-list]
affects: [download.handler.ts]
tech-stack:
  added: []
  patterns: [directory-scanning, state-validation]
key-files:
  created: []
  modified:
    - electron/main/ipc/handlers/download.handler.ts
key-decisions:
  - D-10: Scan download directory for .download.json files
requirements-completed: [CORE-02]
duration: 10 min
completed: "2026-04-26T15:17:30Z"
---

# Phase 7 Plan 04: Implement GET_PENDING_DOWNLOADS Handler Summary

Implemented handler to scan download directory and return list of pending downloads for app restart recovery.

## What Was Built

Replaced placeholder GET_PENDING_DOWNLOADS handler with full implementation:
- Dynamic import of electron-store to get download path
- Directory scan for `.download.json` state files
- State file validation with `isPendingDownload` type guard
- Corresponding `.download` temp file existence check
- Offset update from actual temp file size
- Cleanup of invalid/orphaned state files

## Files Modified

- `electron/main/ipc/handlers/download.handler.ts` — Replaced placeholder with full implementation

## Implementation Flow

1. Get `downloadPath` from `store.get('appSettings.downloadPath')`
2. Return empty array if path not configured or doesn't exist
3. Scan directory for files matching `*.download.json`
4. For each state file:
   - Parse and validate with `readStateFile()`
   - Check corresponding `.download` temp file exists
   - Update offset from actual temp file size
   - Add to pending list or delete invalid file

## Error Handling

| Scenario | Action |
|----------|--------|
| Invalid state file | Delete state file |
| Missing temp file | Delete state file |
| Parse error | Delete state file |
| Directory read error | Return empty array |

## Acceptance Criteria

All 6 criteria passed:
- ✓ `IPC_CHANNELS.GET_PENDING_DOWNLOADS` registered
- ✓ `downloadPath` retrieved from store
- ✓ `.download.json` file filter
- ✓ `readStateFile(statePath)` called
- ✓ `state.offset = actualSize` update
- ✓ TypeScript compiles without errors

## Self-Check

- [x] All tasks executed
- [x] Each task committed individually
- [x] TypeScript compiles without errors
- [x] Unit tests pass (1/1)

## Next Steps

Phase 7 complete. Ready for:
- `/gsd-verify-work 7` — Verify phase goal achievement
- `/gsd-progress` — See updated roadmap
