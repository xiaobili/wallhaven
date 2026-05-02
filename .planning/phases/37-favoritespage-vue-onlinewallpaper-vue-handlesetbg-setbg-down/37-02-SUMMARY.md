---
phase: 37-favoritespage-vue-onlinewallpaper-vue-handlesetbg-setbg-down
plan: 02
subsystem: views
tags: [FavoritesPage, OnlineWallpaper, useWallpaperSetter, composable-integration, delegation]

# Dependency graph
requires:
  - phase: "37-01"
    provides: DownloadResult interface, downloadWallpaperFile, setBgFromUrl in useWallpaperSetter
provides:
  - FavoritesPage.vue handleSetBg delegates to setBgFromUrl (no local download logic)
  - OnlineWallpaper.vue setBg delegates to setBgFromUrl (no local download logic)
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "View-to-composable delegation: one-line function body calling composable method"
    - "Import cleanup after extraction: remove unused imports when all callers move to composable"

key-files:
  created: []
  modified:
    - src/views/FavoritesPage.vue
    - src/views/OnlineWallpaper.vue

key-decisions:
  - "showError removed from FavoritesPage.vue useAlert destructuring — only used in old handleSetBg which is now delegated to composable"
  - "OnlineWallpaper.vue keeps showError in useAlert destructuring — still used in downloadImg and other handlers"
  - "OnlineWallpaper.vue imports useSettings with { settings } only — selectFolder/update no longer needed after downloadWallpaperFile removal"

requirements-completed:
  - REQ-03
  - REQ-04
  - REQ-05

# Metrics
duration: 7min
completed: 2026-05-02
---

# Phase 37 Plan 02: View Integration Summary

**FavoritesPage.vue and OnlineWallpaper.vue updated to delegate setBg/handleSetBg and downloadWallpaperFile to extracted composable methods, eliminating ~75 lines of duplicate code**

## Performance

- **Duration:** 7 min
- **Completed:** 2026-05-02
- **Tasks:** 2
- **Files modified:** 2
- **Lines removed:** 75 (8 + 67)

## Accomplishments

- Replaced `FavoritesPage.vue` `handleSetBg` (17 lines with try/catch and `downloadWallpaperFile` call) with one-line `return setBgFromUrl(imgItem)` delegate
- Replaced `OnlineWallpaper.vue` `setBg` (17 lines with try/catch and `downloadWallpaperFile` call) with one-line `return setBgFromUrl(imgItem)` delegate
- Removed local `downloadWallpaperFile` function from `FavoritesPage.vue` (~50 lines) — now provided by `useWallpaperSetter` composable
- Removed local `downloadWallpaperFile` function from `OnlineWallpaper.vue` (~50 lines) — now provided by `useWallpaperSetter` composable
- Removed `useSettings` import and call from `FavoritesPage.vue` (fully unused after `downloadWallpaperFile` removal)
- Slimmed `useSettings` in `OnlineWallpaper.vue` to `const { settings }` only (`selectFolder` and `update` no longer needed)
- Removed unused `showError` from `FavoritesPage.vue` `useAlert` destructuring

## Task Commits

Each task was committed atomically:

1. **Task 1: Clean up FavoritesPage.vue — useWallpaperSetter delegation** - `120d65f` (feat)
2. **Task 2: Clean up OnlineWallpaper.vue — useWallpaperSetter delegation** - `f55f207` (feat)

## Files Modified

- `src/views/FavoritesPage.vue` — Replaced `handleSetBg` with one-line `setBgFromUrl` delegate, removed `downloadWallpaperFile` function, removed `useSettings` import and call, removed `showError` from `useAlert` destructuring (21 insertions, 8 deletions net)
- `src/views/OnlineWallpaper.vue` — Replaced `setBg` with one-line `setBgFromUrl` delegate, removed `downloadWallpaperFile` function, slimmed `useSettings` to only `{ settings }` (3 insertions, 67 deletions net)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing] Removed showError from FavoritesPage.vue useAlert destructuring**
- **Found during:** Task 1 (FavoritesPage.vue cleanup)
- **Issue:** After removing the old `handleSetBg` function which used `showError`, the destructured `showError` from `useAlert()` became unused. The plan noted this as executor's discretion.
- **Fix:** Removed `showError` from `const { alert, showSuccess, showWarning, hideAlert, showError } = useAlert()` — now reads `const { alert, showSuccess, showWarning, hideAlert } = useAlert()`
- **Files modified:** `src/views/FavoritesPage.vue`
- **Rationale:** Clean import with no unused variables. No lint warnings.
- **Committed in:** `120d65f` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 cleanup)
**Impact on plan:** Minimal — keeps the file clean. No behavior impact.

## Self-Check: PASSED

```
downloadWallpaperFile in FavoritesPage:   0 ✓
downloadWallpaperFile in OnlineWallpaper: 0 ✓
setBgFromUrl in FavoritesPage:            2 ✓ (destructuring + handleSetBg)
setBgFromUrl in OnlineWallpaper:          2 ✓ (destructuring + setBg)
useSettings in FavoritesPage:             0 ✓
useSettings in OnlineWallpaper:           1 ✓ (only `{ settings }`)
TypeScript compilation:                   PASSED ✓
```

## Must-Have Verification

| Must-have | Status |
|-----------|--------|
| FavoritesPage.vue handleSetBg is one-line delegate calling setBgFromUrl | PASSED |
| OnlineWallpaper.vue setBg is one-line delegate calling setBgFromUrl | PASSED |
| FavoritesPage.vue no longer contains downloadWallpaperFile function | PASSED |
| OnlineWallpaper.vue no longer contains downloadWallpaperFile function | PASSED |
| FavoritesPage.vue no longer uses useSettings | PASSED |
| OnlineWallpaper.vue useSettings only retains `settings` | PASSED |
| Key links: handleSetBg/setBg -> setBgFromUrl pattern present in both files | PASSED |

## Known Stubs

None — all modified code delegates to real composable methods with complete error handling.

## Threat Flags

None — no new network endpoints, auth paths, file access patterns, or schema changes introduced.

## Next Phase Readiness

This was the final plan of Phase 37. The useWallpaperSetter composable extraction and view integration are both complete:
- `useWallpaperSetter.ts` now provides `DownloadResult`, `downloadWallpaperFile`, and `setBgFromUrl`
- `FavoritesPage.vue` delegates `handleSetBg` to `setBgFromUrl`
- `OnlineWallpaper.vue` delegates `setBg` to `setBgFromUrl`
- ~75 lines of duplicate code eliminated

---
*Phase: 37-favoritespage-vue-onlinewallpaper-vue-handlesetbg-setbg-down*
*Completed: 2026-05-02*
