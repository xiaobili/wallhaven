---
plan: 22-05
phase: 22
wave: 5
status: complete
completed_at: "2026-04-28"
---

# 22-05: Cleanup - Remove Quick Add from CollectionDropdown

## Summary

Removed the "快速添加到默认收藏夹" option from CollectionDropdown since left-click now provides quick add functionality. Added a gold star indicator for the default collection in the list.

## Changes Made

### CollectionDropdown.vue (`src/components/favorites/CollectionDropdown.vue`)
- Removed quick-add section from template (the entire first block with "快速添加到...")
- Removed `dropdown-divider` that separated quick-add from list
- Removed `quickAdd` method
- Removed `defaultCollection` computed property
- Removed `getDefault` from `useCollections` destructuring
- Added gold star icon indicator for default collection in list items
- Added `.default-star` style for the star indicator
- Removed `.dropdown-item.quick-add` and related styles

## Acceptance Criteria Met

- [x] No "快速添加到..." option in dropdown
- [x] No `quickAdd` method in component
- [x] Default collection shows gold star icon
- [x] Dropdown only shows collection list with checkboxes

## Files Modified

- `src/components/favorites/CollectionDropdown.vue`
