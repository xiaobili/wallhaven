# Quick Fix Summary: 收藏页侧边栏固定定位

## Problem

收藏页面的侧边栏会随着内容滚动而滚动，而不是固定在视口内占据整个视口高度。

**Root Cause:**
- Sidebar used `height: 100%` inside a flex parent with `min-height`
- Both were flex children, so they grew together with content
- When content scrolled, sidebar didn't stay fixed

## Solution Applied

### Task 1: Fix CollectionSidebar positioning

**File:** `src/components/favorites/CollectionSidebar.vue`

Changed sidebar from relative to fixed positioning:
- Added `position: fixed`
- Added `top: 40px` (clear fixed header)
- Added `left: 180px` (clear fixed left menu)
- Changed `height: 100%` to `height: calc(100vh - 40px)`

### Task 2: Adjust FavoritesPage content layout

**File:** `src/views/FavoritesPage.vue`

Adjusted content layout for fixed sidebar:
- Added `margin-left: 200px` to `.favorites-content`
- Removed `display: flex` from `.favorites-page` (sidebar now outside normal flow)

## Commits

1. `dc7e2c1` - fix(favorites): fix sidebar to stay fixed in viewport
2. `31fbece` - fix(favorites): add left margin to content for fixed sidebar

## Verification

1. Open Favorites page
2. Add enough wallpapers to require scrolling
3. Verify: sidebar stays fixed, content scrolls independently
4. Verify: sidebar height fills viewport from header to bottom
5. Verify: sidebar content scrolls if collections overflow

## Constraints Met

- ✅ No change to user operations, layout appearance, or UI display
- ✅ Only CSS positioning fixed
- ✅ Sidebar width (200px) and styling unchanged
- ✅ Content area layout behavior unchanged (scrolls independently)
