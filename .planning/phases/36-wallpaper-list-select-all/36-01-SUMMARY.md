---
phase: 36-wallpaper-list-select-all
plan: 01
type: execute
wave: 1
subsystem: wallpaper-list
tags: [select-all, batch-selection, wallpaper-list, section-header]
requires: []
provides: [select-all-emit, batch-selection-handler]
affects: [WallpaperList.vue, OnlineWallpaper.vue]
tech-stack:
  added:
    - pattern: three-state selection (none/some/all) via getSelectState
    - pattern: batch emit with sectionIndex + ids + selected payload
  patterns:
    - event-based section-scoped batch selection
key-files:
  created: []
  modified:
    - src/components/WallpaperList.vue
    - src/views/OnlineWallpaper.vue
decisions: []
metrics:
  duration: "~12 min"
  completed_date: "2026-05-01"
---

# Phase 36 Plan 01: Select-All in Section Headers

**One-liner:** Add a select-all checkbox to each wallpaper section header (sections after the first) that batch-selects or batch-deselects all wallpapers in that section with one click, using a three-state checkbox (unchecked/indeterminate/checked) with Chinese labels.

## Tasks

| # | Name | Type | Status | Commit |
|---|------|------|--------|--------|
| 1 | Add select-all button and logic to WallpaperList.vue | auto | Done | a6531dd |
| 2 | Handle @select-all event in OnlineWallpaper.vue | auto | Done | 6ebf58b |

## Verification Results

| Check | Result |
|-------|--------|
| `grep -c "select-all" src/components/WallpaperList.vue` >= 8 | 13 occurrences -- PASS |
| `toggleSelectAll` in WallpaperList.vue | Found -- PASS |
| `getSelectState` in WallpaperList.vue | Found -- PASS |
| `@select-all` in OnlineWallpaper.vue | Found -- PASS |
| `handleSelectAll` in OnlineWallpaper.vue | Found -- PASS |
| `npm run type-check` | No errors -- PASS |

## Implementation Details

### WallpaperList.vue Changes

**Emit signature:** Added `'select-all': [payload: { sectionIndex: number; ids: string[]; selected: boolean }]` to `defineEmits`.

**New methods:**
- `getSelectState(sectionData)` returns `'none' | 'some' | 'all'` based on how many wallpapers in the section are in `selectedIds`. When `selectedIds` is undefined/empty, returns `'none'`.
- `toggleSelectAll(sectionData, sectionIndex)` computes current state, toggles to the opposite, emits all IDs with the target selection state.

**Template:** Added `.select-all-trigger` span between `</h2>` and `<a class="icon to-top">` with `order: 15` (between h2 at order 10 and the flex spacer at order 20). Contains a `.select-all-box` with check icon (all selected) or minus icon (some selected), plus a `.select-all-label` showing "取消全选" or "全选".

**CSS:** Added 7 CSS rule blocks matching the existing `.thumb-checkbox` aesthetic (dark background, white border, rounded square, hover effects with primary color #667eea). The indeterminate state uses a semi-transparent primary fill to distinguish from full checked state.

### OnlineWallpaper.vue Changes

**Template:** Added `@select-all="handleSelectAll"` to the `<WallpaperList>` component binding.

**Handler:** `handleSelectAll(payload)` branches on `payload.selected`:
- `true`: Iterates IDs, pushes each to `selectedWallpapers` if not already present (duplicate guard).
- `false`: Filters out all payload IDs from `selectedWallpapers` using `filter`.

### Key Design Patterns

- **Three-state checkbox:** Matches CONTEXT.md D-02 requirement with visual states matching the existing `.thumb-checkbox` aesthetic per D-01.
- **Section-scoped:** Operation only affects the current `sectionItem.data` array per D-03.
- **Event-based:** New `select-all` emit carries section index, all IDs, and target state per D-04.
- **CSS order layering:** Select-all trigger positioned at `order: 15` between heading (10) and spacer (20) for correct header layout.

## Deviations from Plan

None -- plan executed exactly as written.

## Known Stubs

None.

## Threat Flags

None -- this phase introduces no new trust boundaries. The feature operates entirely within the renderer process on existing in-memory data.

## Self-Check: PASSED

| File | Status |
|------|--------|
| src/components/WallpaperList.vue | Created/modified -- verified |
| src/views/OnlineWallpaper.vue | Created/modified -- verified |
| Commit a6531dd | Found in git log |
| Commit 6ebf58b | Found in git log |
