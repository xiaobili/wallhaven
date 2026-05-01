---
phase: 36-wallpaper-list-select-all
verified: 2026-05-01T12:00:00Z
status: human_needed
score: 6/6 must-haves verified
overrides_applied: 0
gaps: []
human_verification:
  - test: "Verify select-all trigger position in section header"
    expected: "The select-all checkbox with label should appear after the h2 heading (Page X / Total) and before the 'Back to top' arrow button in each section header (sections after the first, v-if=\"i !== 0\")."
    why_human: "CSS order values (h2: 10, select-all-trigger: 15, spacer ::before: 20, to-top: 100) and flex layout require visual confirmation."
  - test: "Verify three checkbox states render correctly"
    expected: "When no wallpapers in a section are selected: empty box with '全选' label. When some are selected: box with minus (fa-minus) icon and '全选' label. When all are selected: box with check (fa-check) icon and '取消全选' label. The box background color should darken progressively from unchecked (dark) to indeterminate (semi-transparent primary) to checked (solid primary)."
    why_human: "Visual appearance of CSS classes (.select-all-box, .checked, .indeterminate) and icon rendering cannot be verified without rendering the component."
  - test: "Verify select-all toggle behavior"
    expected: "Clicking the unchecked select-all trigger should select all wallpapers in that section (checkbox becomes checked with '取消全选'). Clicking again should deselect all (checkbox becomes unchecked with '全选'). When some items are toggled individually and some are selected, the checkbox should show indeterminate (minus icon) state."
    why_human: "User flow with interaction sequencing and state transitions requires manual testing."
---

# Phase 36: Wallpaper List Select-All Verification Report

**Phase Goal:** Add a "select all on current page" button inside WallpaperList.vue's `<header>` that batch-selects all visible wallpapers on the current page section.

**Verified:** 2026-05-01T12:00:00Z
**Status:** human_needed
**Re-verification:** No -- initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | User sees a select-all checkbox with label in each section header (sections after the first) | VERIFIED | WallpaperList.vue lines 20-35: `.select-all-trigger` span with `.select-all-box` and `.select-all-label` inside `<header v-if="i !== 0">`, positioned between `<h2>` and `<a class="icon to-top">` |
| 2 | Clicking the unchecked checkbox selects all wallpapers in that section | VERIFIED | WallpaperList.vue line 22: `@click.stop="toggleSelectAll(sectionItem.data, i)"`. Lines 225-230: `toggleSelectAll` sets `selectAll = state !== 'all'`, emits `{ selected: true }`. OnlineWallpaper.vue lines 230-237: `handleSelectAll` iterates IDs and pushes non-duplicates to `selectedWallpapers`. |
| 3 | Clicking the checked checkbox deselects all wallpapers in that section | VERIFIED | WallpaperList.vue line 225-230: when state is 'all', `selectAll = false`, emits `{ selected: false }`. OnlineWallpaper.vue lines 239-243: `handleSelectAll` filters `selectedWallpapers` excluding payload IDs. |
| 4 | The checkbox shows checked state with "取消全选" label when ALL wallpapers in the section are selected | VERIFIED | WallpaperList.vue lines 26-27: `:class="{ checked: getSelectState(sectionItem.data) === 'all' }"`. Line 31: `<i v-if="getSelectState(...) === 'all'" class="fas fa-check" />`. Line 34: `getSelectState(...) === 'all' ? '取消全选' : '全选'`. CSS lines 382-385 for `.select-all-box.checked`. |
| 5 | The checkbox shows indeterminate (minus icon) with "全选" label when SOME wallpapers are selected | VERIFIED | WallpaperList.vue line 28: `:class="{ indeterminate: getSelectState(...) === 'some' }"`. Line 32: `<i v-else-if="getSelectState(...) === 'some'" class="fas fa-minus" />`. Line 34: else branch shows "全选". CSS lines 387-390 for `.select-all-box.indeterminate`. |
| 6 | The checkbox shows unchecked with "全选" label when NO wallpapers in the section are selected | VERIFIED | WallpaperList.vue: when `getSelectState` returns 'none', neither `checked` nor `indeterminate` class is applied (lines 27-28), neither icon is rendered (lines 31-32), and label shows "全选" (line 34, else branch of ternary). |

**Score:** 6/6 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/components/WallpaperList.vue` | Select-all UI in section header, selection state computation, select-all emit | VERIFIED | Contains `select-all` (13 occurrences), `toggleSelectAll` (lines 225-230), `getSelectState` (lines 213-219), `.select-all-trigger` (template + CSS). Emit signature defined at line 166. |
| `src/views/OnlineWallpaper.vue` | Handler for select-all event that batch-updates selectedWallpapers | VERIFIED | Contains `handleSelectAll` (lines 230-244) with add path (for-loop + duplicate guard) and remove path (filter). `@select-all="handleSelectAll"` binding on WallpaperList component at line 85. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| WallpaperList.vue header template | `toggleSelectAll(sectionData, sectionIndex)` | @click.stop | WIRED | Line 22: `@click.stop="toggleSelectAll(sectionItem.data, i)"` -- click handler properly attached to `.select-all-trigger`. |
| WallpaperList.vue `emit('select-all', ...)` | OnlineWallpaper.vue `@select-all` binding | Vue event system | WIRED | WallpaperList line 229: `emit('select-all', { sectionIndex, ids, selected: selectAll })`. OnlineWallpaper line 85: `@select-all="handleSelectAll"`. |
| OnlineWallpaper.vue `handleSelectAll` | `selectedWallpapers` ref | array push/filter | WIRED | Lines 234-235: `!selectedWallpapers.value.includes(id)` guard then `push`. Lines 240-241: `!payload.ids.includes(id)` filter. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|--------------------|--------|
| WallpaperList.vue `getSelectState` | `props.selectedIds` | Parent `:selected-ids="selectedWallpapers"` (OnlineWallpaper line 76) | FLOWING | `selectedWallpapers` ref (line 146) starts empty, populated by user interaction (individual toggle or select-all). |
| OnlineWallpaper.vue `handleSelectAll` | `selectedWallpapers` ref | Mutated directly by handler | FLOWING | Add path pushes IDs; remove path filters IDs. No hardcoded/static data. |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| `toggleSelectAll` exists in script + template | `grep -c "toggleSelectAll" src/components/WallpaperList.vue` | 2 matches | PASS |
| `getSelectState` function defined with return type | `grep -n "getSelectState" src/components/WallpaperList.vue` | 5 matches (definition + 4 template calls) | PASS |
| `select-all` emit defined | `grep -n "'select-all'" src/components/WallpaperList.vue` | Line 166 | PASS |
| `@select-all` binding on WallpaperList component | `grep -n "@select-all" src/views/OnlineWallpaper.vue` | Line 85 | PASS |
| `handleSelectAll` function defined | `grep -n "handleSelectAll" src/views/OnlineWallpaper.vue` | Lines 230-244 | PASS |
| Remove path uses filter with includes | `grep -n "payload.ids.includes" src/views/OnlineWallpaper.vue` | Line 241 | PASS |
| Add path guards duplicates | `grep -n "selectedWallpapers.value.includes" src/views/OnlineWallpaper.vue` | Line 234 | PASS |
| Type-check passes | `npx vue-tsc --noEmit` | No errors | PASS |

### Requirements Coverage

No requirements from REQUIREMENTS.md -- this is a user-requested feature (Phase 36 has no requirement IDs).

### Anti-Patterns Found

None. No TODO/FIXME/placeholder comments, no empty implementations, no console.log-only handlers (the single console.log at OnlineWallpaper.vue line 476 is pre-existing and unrelated to this feature). Type-check passes with zero errors.

### Human Verification Required

#### 1. Verify select-all trigger position in section header

**Test:** Open the app and navigate to any search/listing page that returns multiple pages of results. Scroll down to trigger the second section (page 2). Check the section header.

**Expected:** The select-all checkbox with label should appear after the h2 heading (Page X / Total) and before the "Back to top" arrow button in each section header (sections after the first, `v-if="i !== 0"`).

**Why human:** CSS order values (h2: 10, select-all-trigger: 15, spacer ::before: 20, to-top: 100) and flex layout require visual confirmation that the element is positioned correctly without breaking the header layout.

#### 2. Verify three checkbox states render correctly

**Test:** Scroll to a section with multiple wallpapers. Observe the select-all checkbox. Then individually select some wallpapers via Ctrl+click. Then select all via the select-all checkbox.

**Expected:** 
- When no wallpapers in a section are selected: empty box with "全选" label
- When some are selected: box with minus (fa-minus) icon and "全选" label
- When all are selected: box with check (fa-check) icon and "取消全选" label
- The box background color should darken progressively from unchecked (dark) to indeterminate (semi-transparent primary) to checked (solid primary)

**Why human:** Visual appearance of CSS classes (.select-all-box, .checked, .indeterminate) and FontAwesome icon rendering (fa-check, fa-minus) cannot be verified without rendering the component.

#### 3. Verify select-all toggle behavior

**Test:** Click the unchecked select-all trigger to select all, then click again to deselect all. Also test by selecting some items individually and verifying the indeterminate state appears.

**Expected:** Clicking select-all selects all wallpapers in that section (all individual checkboxes become visible with check marks). Clicking again deselects all (all individual checkboxes hide). When some items are individually selected, the select-all shows the indeterminate (minus) state and clicking it selects all remaining unselected items.

**Why human:** User flow with interaction sequencing and state transitions requires manual testing to confirm correct end-to-end behavior.

### Gaps Summary

No gaps found. All 6 must-have truths are verified against the actual codebase. Both modified files contain substantive, wired, data-flowing implementations. Type-check passes. Both commits are present in git history.

---

_Verified: 2026-05-01T12:00:00Z_
_Verifier: Claude (gsd-verifier)_
