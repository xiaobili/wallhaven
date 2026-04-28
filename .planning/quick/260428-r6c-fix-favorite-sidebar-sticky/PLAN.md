# Quick Fix: 收藏页侧边栏固定定位

## Problem

收藏页面的侧边栏会随着内容滚动而滚动，而不是固定在视口内占据整个视口高度。

**Current behavior:**
- Sidebar has `height: 100%` but parent `.favorites-page` uses `min-height`
- Both are flex children, so they grow together with content
- When content scrolls, sidebar doesn't stay fixed

**Expected behavior:**
- Sidebar should be fixed position, occupying the full viewport height (minus header)
- Sidebar should NOT scroll when content scrolls
- Only the main content area should scroll

## Analysis

**Layout context:**
- Fixed header: `position: fixed; top: 0; height: 40px;`
- Fixed left menu: `position: fixed; left: 0; width: 180px;`
- Content container: `margin-left: 180px;`
- FavoritesPage: `margin-top: 40px;` (to clear header)

**Root cause:**
The sidebar uses `height: 100%` inside a flex parent with `min-height`, so it doesn't stay fixed to viewport.

## Solution

Apply `position: fixed` to the sidebar and adjust layout accordingly:

1. **CollectionSidebar.vue** - Change sidebar to fixed positioning:
   - `position: fixed; top: 40px; left: 180px; height: calc(100vh - 40px);`

2. **FavoritesPage.vue** - Add left margin to content to account for fixed sidebar:
   - `.favorites-content` needs `margin-left: 200px;` to clear the fixed sidebar

## Tasks

### Task 1: Fix CollectionSidebar positioning

**File:** `src/components/favorites/CollectionSidebar.vue`

Change:
```css
.collection-sidebar {
  width: 200px;
  background: #1a1a1a;
  border-right: 1px solid #333;
  display: flex;
  flex-direction: column;
  height: 100%;
}
```

To:
```css
.collection-sidebar {
  position: fixed;
  top: 40px;
  left: 180px;
  width: 200px;
  height: calc(100vh - 40px);
  background: #1a1a1a;
  border-right: 1px solid #333;
  display: flex;
  flex-direction: column;
}
```

### Task 2: Adjust FavoritesPage content layout

**File:** `src/views/FavoritesPage.vue`

Add `margin-left: 200px;` to `.favorites-content`:
```css
.favorites-content {
  flex: 1;
  margin-left: 200px;
  padding: 1.5em;
  overflow-y: auto;
}
```

Also remove flex display from `.favorites-page` since the sidebar is now fixed:
```css
.favorites-page {
  min-height: calc(100vh - 40px);
  margin-top: 40px;
}
```

## Constraints

- ✅ No change to user operations, layout appearance, or UI display
- ✅ Only fixing CSS positioning to make sidebar fixed
- ✅ Sidebar width (200px) and styling remain unchanged
- ✅ Content area layout behavior unchanged (scrolls independently)

## Verification

1. Open Favorites page
2. Add enough wallpapers to require scrolling
3. Verify: sidebar stays fixed, content scrolls independently
4. Verify: sidebar height fills viewport from header to bottom
5. Verify: sidebar content scrolls if collections overflow
