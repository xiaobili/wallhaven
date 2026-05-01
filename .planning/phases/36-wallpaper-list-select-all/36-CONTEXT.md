# Phase 36: 壁纸列表全选功能 - Context

**Gathered:** 2026-05-01
**Status:** Ready for planning
**Mode:** `--auto` (all decisions auto-selected)

<domain>
## Phase Boundary

Add a "select all on current page" button inside WallpaperList.vue's `<header>` element that batch-selects all visible wallpapers on the current page section. Users can select/deselect an entire page with one click instead of Ctrl+clicking each wallpaper individually.

**In scope:**
- A select-all button inside `<header class="thumb-listing-page-header">`
- Batch selection of all wallpapers in the current page section
- Toggle behavior (click = select all / click again = deselect all)
- Visual feedback matching the existing checkbox style

**Not in scope:**
- Select all across ALL pages/sections (stays scoped to current section)
- Select all across the entire app (future batch operations feature)
- Deselect buttons outside the header (use existing clear selection in SearchBar)
- Keyboard shortcut for select-all (future enhancement)

</domain>

<decisions>
## Implementation Decisions

### D-01: Button style — checkbox-style toggle button
A small checkbox-style toggle button placed inside the `<header>`, to the right of the page number text and before the "Back to top" button. The visual style matches `.thumb-checkbox` for consistency (rounded square with check icon), with a different hover state to distinguish from individual item checkboxes.

- **Label text:** "全选" / "取消全选" state text shown next to the checkbox
- **Position:** After `<h2>` and before `<a class="icon to-top">` in the header
- **Only shown on sections 1+** (same `v-if="i !== 0"` as the existing header) — the first section is the initial page view where individual selection is sufficient

### D-02: Toggle behavior — select all / deselect all
Clicking selects all wallpapers in the current section; clicking again deselects them all. The button reflects the current state:
- If 0 items selected → shows unchecked state with "全选" label
- If ALL items in section are selected → shows checked state with "取消全选" label
- If SOME items are selected → shows indeterminate state (minus icon) with "全选" label

### D-03: Scope — current section only
The select-all operation is scoped to the wallpapers in the current `sectionItem.data` array where the button is clicked. It does NOT affect other sections/pages.

### D-04: Event mechanism — new `@select-all` emit
Add a new emit `select-all` to WallpaperList.vue that passes an object: `{ sectionIndex: number, ids: string[], selected: boolean }`. The parent (OnlineWallpaper.vue) handles this by either adding or removing all IDs from `selectedWallpapers`.

```typescript
emit('select-all', { 
  sectionIndex: number,  // which section was selected/deselected
  ids: string[],         // wallpaper IDs in that section
  selected: boolean      // true = select all, false = deselect all
})
```

### Claude's Discretion
- Exact CSS styling details (size, hover effects, transition timing)
- Whether to use a Font Awesome icon or SVG for the checkbox
- Indeterminate state icon choice

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Source files to modify
- `src/components/WallpaperList.vue` — Add select-all button to `<header>` and emit handler
- `src/views/OnlineWallpaper.vue` — Handle new `@select-all` event in `toggleSelection` area

### Design patterns to follow
- `src/components/WallpaperList.vue` — Existing `.thumb-checkbox` CSS patterns (lines 250-292)
- `src/components/WallpaperList.vue` — Existing `toggleSelect` / `isSelected` pattern

### Project constraints
- `.planning/PROJECT.md` — Hard constraints: UI appearance unchanged for existing features
- `.planning/REQUIREMENTS.md` — Phase 36 has no explicit requirements; feature request via add-phase

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `.thumb-checkbox` CSS class in WallpaperList.vue (lines 250-292) — existing checkbox styling to derive from
- `toggleSelect` / `isSelected` methods in WallpaperList.vue — existing selection infrastructure
- `selectedWallpapers` ref in OnlineWallpaper.vue — parent-managed selection state

### Established Patterns
- Single-item selection: WallpaperList emits `select-wallpaper` with ID → parent toggles in array
- Clear selection: parent has `clearSelection()` that resets the array
- Batch download: `downloadSelected()` already iterates all sections to find selected items

### Integration Points
- WallpaperList `<header>` currently renders "Page X / Total" and "Back to top" button
- OnlineWallpaper.vue line 212: `toggleSelection()` manages individual item selection
- OnlineWallpaper.vue line 226: `clearSelection()` resets all selection

</code_context>

<specifics>
## Specific Ideas

- The select-all checkbox should use the same visual language as `.thumb-checkbox` but with a slightly distinct hover behavior
- When all items are selected, the individual item checkboxes should remain visible (not hidden by hover) — this already works via the `.selected .thumb-checkbox` rule
- The indeterminate state (some items selected) should show a minus/dash icon rather than a check

</specifics>

<deferred>
## Deferred Ideas

- Keyboard shortcut (Ctrl+A / Cmd+A) for select-all — could be added in a future UX phase
- Select-all for the first section (section index 0) — requires modifying the `v-if="i !== 0"` on header, could be done when the header layout is revisited
- "Select all across all pages" — belongs in a future batch operations feature
- Deselect-all button outside the header — existing `clearSelection()` in SearchBar already covers this

</deferred>

---

*Phase: 36-壁纸列表全选功能*
*Context gathered: 2026-05-01 via --auto mode*
