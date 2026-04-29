# Phase 23: Settings Cache Cleanup - Research

**Researcher:** Claude
**Date:** 2026-04-29

## Problem Statement

The current "Clear Cache" functionality in `SettingPage.vue` incorrectly deletes user data (settings, favorites, download history) by calling `settingsService.clearStore()`. Users expect "cache clearing" to only remove regenerable files (thumbnails, temporary files), not their persistent user data.

**Expected behavior:**
- Clear thumbnails cache (`{downloadPath}/.thumbnails/`)
- Clear download temp files (`*.download` files)
- Preserve user settings, favorites, and download history

## Domain Analysis

### What is "Cache" in this Application?

1. **Regenerable Cache (should be cleared):**
   - Thumbnails: `{downloadPath}/.thumbnails/*` - Regenerated on next access
   - Temp files: `*.download` files - Partial downloads that can be cleaned
   - Electron renderer cache: `session.clearCache()`, `session.clearStorageData()`

2. **User Data (should NOT be cleared):**
   - App settings: Stored in `electron-store` under `STORAGE_KEYS.APP_SETTINGS`
   - Favorites data: Stored in `electron-store` under `STORAGE_KEYS.FAVORITES`
   - Download history: Stored in `electron-store` under `STORAGE_KEYS.DOWNLOAD_HISTORY`

### IPC Handler Status

The `clear-app-cache` IPC handler (lines 17-96 in `cache.handler.ts`) **already correctly implements** the desired behavior:
- Deletes thumbnails directory contents
- Deletes `.download` temp files
- Clears Electron renderer session cache
- Returns counts of deleted items

The bug is in `SettingPage.vue` which calls `clearStore()` **in addition** to `clearAppCache()`.

## Technical Investigation

### Existing Code Analysis

#### SettingPage.vue - clearCache function (lines 296-357)

**Current problematic flow:**
```typescript
// Line 297-304: Confirmation dialog (misleading message)
const confirmed = window.confirm(
  '确定要清空应用缓存吗？\n\n' +
  '这将删除：\n' +
  '• 缩略图缓存（下次访问时会重新生成）\n' +
  '• 下载临时文件\n' +
  '• 应用存储数据（设置将被重置）\n\n' +  // <- MISLEADING
  '注意：不会删除已下载的壁纸文件。'
)

// Lines 321-325: Clear Store data (SHOULD BE REMOVED)
const storeResult = await settingsService.clearStore()

// Lines 328-331: Reload settings after clear (NEEDED for Store clear, can be removed)
await load()
startEdit()
```

**Changes needed:**
1. Remove `clearStore()` call (lines 321-325)
2. Remove settings reload logic (lines 328-331)
3. Update confirmation dialog message
4. Update success message

#### cache.handler.ts - clear-app-cache (lines 17-96)

**Status: Already correct - no changes needed**

The handler correctly:
1. Validates download path exists
2. Clears `.thumbnails` directory
3. Clears `.download` temp files
4. Clears Electron session cache
5. Returns detailed results

#### LocalWallpaper.vue - Thumbnail handling (lines 98-132)

```typescript
// refreshList function - reads directory and gets thumbnail paths
const refreshList = async (): Promise<void> => {
  const result = await readDirectory(downloadPath.value)
  localWallpapers.value = result.data.map(file => ({
    // ...
    thumbnailPath: file.thumbnailPath || '',
    // ...
  }))
}
```

**Current behavior:**
- Component is cached by `KeepAlive` (line 71 in `Main.vue`)
- Only loads on `onMounted` (lines 269-272)
- Uses `onActivated`? **No** - unlike `OnlineWallpaper.vue` and `FavoritesPage.vue`

**Thumbnail refresh options:**

1. **Add `onActivated` hook** - Refresh when user navigates to page
   - Pros: Simple, consistent with other pages
   - Cons: Refreshes every time user visits page, even if cache wasn't cleared

2. **Event-based notification** - Emit event when cache cleared
   - Pros: Only refreshes when needed
   - Cons: Requires event bus mechanism

3. **Pinia store state** - Use reactive state to trigger refresh
   - Pros: Vue-native approach
   - Cons: Requires adding state to store

### Dependencies

**What this phase depends on:**
- Existing `clearAppCache` IPC handler (working correctly)
- Existing `useSettings` composable
- Existing `settingsService` methods

**What depends on this phase:**
- None - this is a behavior fix

### Integration Points

1. **SettingPage.vue → settingsService.clearAppCache()** - Keep this call
2. **SettingPage.vue → settingsService.clearStore()** - Remove this call
3. **LocalWallpaper.vue → thumbnails** - Needs refresh mechanism after cache clear

### Patterns to Follow

#### Confirmation Dialog Pattern (existing)
```typescript
const confirmed = window.confirm('message')
if (!confirmed) return
```

#### Toast Notification Pattern (existing via useAlert)
```typescript
const { showSuccess, showError } = useAlert()
showSuccess('message', duration)
```

#### KeepAlive onActivated Pattern (established in other pages)
```typescript
// In OnlineWallpaper.vue (lines 186-189):
onActivated(() => {
  // Component activated from KeepAlive cache
})

// In FavoritesPage.vue (lines 200-202):
onActivated(async () => {
  await Promise.all([loadCollections(), loadFavorites()])
})
```

## Risk Assessment

### Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| User confusion about new behavior | Low | Medium | Clear confirmation message |
| LocalWallpaper shows stale thumbnails | Medium | Low | Add `onActivated` refresh |
| Breaking change for users expecting full reset | Low | Low | New behavior is more expected |

### Edge Cases

1. **Empty cache** - When no thumbnails/temp files exist
   - Handler returns 0 counts - already handled in success message logic

2. **Partial clear failure** - Some files couldn't be deleted
   - Handler collects errors in array - already handled

3. **User on LocalWallpaper page when clearing** - Thumbnails still show
   - Need refresh mechanism when user navigates back

4. **Download in progress** - `.download` temp file being written
   - Handler may fail to delete locked file - acceptable behavior

## Implementation Guidance

### Minimal Change Approach (Recommended)

1. **SettingPage.vue changes only:**
   - Remove lines 321-325 (`clearStore()` call and result handling)
   - Remove lines 328-331 (settings reload after Store clear)
   - Update confirmation message (lines 297-304)
   - Success message remains essentially the same (already shows deleted counts)

2. **Thumbnail refresh - Add `onActivated` to LocalWallpaper.vue:**
   - Simple addition following existing pattern from other pages
   - Ensures thumbnails refresh when user navigates to page

### Detailed Code Changes

#### SettingPage.vue

**Confirmation dialog update:**
```typescript
const confirmed = window.confirm(
  '确定要清空应用缓存吗？\n\n' +
  '这将删除：\n' +
  '• 缩略图缓存（下次访问时会重新生成）\n' +
  '• 下载临时文件\n\n' +
  '注意：不会删除已下载的壁纸文件和您的设置。'
)
```

**Function simplification (remove lines 321-331):**
```typescript
try {
  // 1. Clear thumbnails and temp files
  const cacheResult = await settingsService.clearAppCache(settings.value.downloadPath || undefined)

  if (!cacheResult.success) {
    throw new Error(cacheResult.error?.message || '清理缓存失败')
  }

  // Note: Removed clearStore() call - preserve user data

  // 2. Update cache info display
  cacheInfo.thumbnailsCount = 0
  cacheInfo.tempFilesCount = 0

  // 3. Show success message
  const details = []
  if (cacheResult.data?.thumbnailsDeleted && cacheResult.data.thumbnailsDeleted > 0) {
    details.push(`${cacheResult.data.thumbnailsDeleted} 个缩略图`)
  }
  if (cacheResult.data?.tempFilesDeleted && cacheResult.data.tempFilesDeleted > 0) {
    details.push(`${cacheResult.data.tempFilesDeleted} 个临时文件`)
  }

  const message = details.length > 0
    ? `缓存已清空\n已删除：${details.join('、')}`
    : '缓存已清空'

  showSuccess(message, 5000)
}
```

#### LocalWallpaper.vue

**Add `onActivated` import and hook:**
```typescript
// Line 40 - Update import
import { ref, computed, onMounted, onActivated } from 'vue'

// Add after onMounted (around line 273)
onActivated(() => {
  // Refresh list when returning to this page (thumbnails may have been cleared)
  if (downloadPath.value) {
    refreshList()
  }
})
```

### Alternative: Event-Based Approach

If more precise control is needed, add a simple event mechanism:

1. **Create event bus** (new file `src/utils/eventBus.ts`):
```typescript
import { ref } from 'vue'

export const events = {
  thumbnailsCleared: ref(false),
}

export function markThumbnailsCleared() {
  events.thumbnailsCleared.value = true
}

export function consumeThumbnailsCleared() {
  if (events.thumbnailsCleared.value) {
    events.thumbnailsCleared.value = false
    return true
  }
  return false
}
```

2. **In SettingPage.vue** - Call `markThumbnailsCleared()` after successful clear

3. **In LocalWallpaper.vue** - Check in `onActivated`:
```typescript
onActivated(() => {
  if (consumeThumbnailsCleared()) {
    refreshList()
  }
})
```

**Recommendation:** Use the simpler `onActivated` refresh approach - the performance impact of re-reading the directory is minimal compared to adding event infrastructure.

## Validation Architecture

### Manual Testing Checklist

1. **Basic cache clear:**
   - [ ] Clear cache deletes only thumbnails and temp files
   - [ ] Settings remain intact after clear
   - [ ] Favorites remain intact after clear
   - [ ] Download history remains intact after clear

2. **Confirmation dialog:**
   - [ ] Message accurately describes what will be deleted
   - [ ] Cancel button works correctly
   - [ ] Confirm button triggers clear

3. **Success message:**
   - [ ] Shows correct count of deleted items
   - [ ] Auto-dismisses after 5 seconds

4. **Thumbnail refresh:**
   - [ ] Navigate to LocalWallpaper after clearing cache
   - [ ] Thumbnails regenerate correctly
   - [ ] Page shows updated thumbnail paths

5. **Edge cases:**
   - [ ] Clear cache with empty download path
   - [ ] Clear cache with no thumbnails
   - [ ] Clear cache while download in progress

### Verification Commands

No automated tests exist. Verify manually by:
1. Adding test wallpapers to download folder
2. Viewing LocalWallpaper to generate thumbnails
3. Clearing cache in Settings
4. Verifying thumbnails directory is empty
5. Verifying settings still exist
6. Navigating to LocalWallpaper to confirm thumbnails regenerate

---

## RESEARCH COMPLETE
