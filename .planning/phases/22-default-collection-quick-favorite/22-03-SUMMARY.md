---
plan: 22-03
phase: 22
wave: 3
status: complete
completed_at: "2026-04-28"
---

# 22-03: UI Layer - Set Default Collection UI

## Summary

Added UI for setting a collection as default: a "设为默认" button in CollectionItem and handling in CollectionSidebar, plus a gold "默认" badge for default collections.

## Changes Made

### CollectionItem.vue (`src/components/favorites/CollectionItem.vue`)
- Added `setDefault` emit type
- Added `handleSetDefault` method
- Added "设为默认" button with star icon (only shows for non-default collections)
- Added gold "默认" badge next to collection name
- Added `.set-default-btn:hover` style with gold color
- Added `.default-badge` style with gold gradient background

### CollectionSidebar.vue (`src/components/favorites/CollectionSidebar.vue`)
- Imported `setDefault` from `useCollections`
- Added `handleSetDefault` method that calls composable
- Wired `@set-default` event from CollectionItem

## Acceptance Criteria Met

- [x] CollectionItem emits 'setDefault' event
- [x] "设为默认" button shows for non-default collections
- [x] "默认" badge shows for default collections
- [x] CollectionSidebar handles setDefault event
- [x] Success toast appears when setting default collection

## Files Modified

- `src/components/favorites/CollectionItem.vue`
- `src/components/favorites/CollectionSidebar.vue`
