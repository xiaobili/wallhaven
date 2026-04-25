---
status: issues
files_reviewed: 11
critical: 2
warning: 6
info: 4
total: 12
---

# Code Review: Business & Composable Layer

**Review Date**: 2026-04-25
**Files Reviewed**: 11 files across services, composables, stores, and main.ts

## Summary

This review covers the business layer (services), composable layer, and their integration with stores and the application entry point. The codebase demonstrates good architectural separation and TypeScript usage, but contains several critical issues related to data persistence and duplicate logic.

---

## Critical Issues

### 1. [CRITICAL] Data Loss on Download Failure - `src/main.ts`

**Location**: Lines 94-101

```typescript
if (error) {
  // 下载失败
  console.error('[Main] 下载失败:', error)
  const task = downloadStore.downloadingList.find((item: any) => item.id === taskId)
  if (task) {
    task.state = 'waiting'
    task.progress = 0
  }
}
```

**Problem**: When a download fails, the progress is reset to 0 and state set to 'waiting'. This loses the user's download progress (bytes downloaded). If the user had partially downloaded a large file and the network temporarily fails, they would need to restart from scratch.

**Impact**: User data loss, poor user experience for large file downloads.

**Recommendation**: Preserve `offset` value so users can potentially resume from where they left off. Consider adding a 'failed' state instead of 'waiting' to differentiate between retry-able failures and new downloads.

---

### 2. [CRITICAL] Missing Persistence on Download Completion - `src/composables/download/useDownload.ts`

**Location**: Lines 192-202, 207-212

```typescript
const removeFinished = async (id: string): Promise<boolean> => {
  const result = await downloadService.removeFinishedRecord(id)
  if (result.success) {
    const index = store.finishedList.findIndex(item => item.id === id)
    if (index !== -1) {
      store.finishedList.splice(index, 1)
    }
    return true
  }
  return false
}
```

**Problem**: When a download completes via `completeDownload` in the store (triggered from `handleProgress`), the finished record is added to `finishedList` in memory but is **never persisted** to storage. The `saveFinishedRecord` method exists in `downloadService` but is never called.

**Impact**: Download history is lost on application restart, despite the UI showing completed downloads during the session.

**Recommendation**: Call `downloadService.saveFinishedRecord(item)` after adding to `finishedList` in `completeDownload`, or create a composable method that wraps the store action and adds persistence.

---

## Warnings

### 3. [WARNING] Duplicate Download Progress Handling - `src/main.ts` & `src/composables/download/useDownload.ts`

**Location**:
- `src/main.ts`: Lines 89-110
- `src/composables/download/useDownload.ts`: Lines 78-96

**Problem**: Download progress is handled in two places:
1. In `main.ts` via `downloadService.onProgress()` subscription
2. In `useDownload()` composable via `handleProgress()` function

Both independently update the store based on the same progress events. This creates:
- Potential race conditions when both handlers try to update the same task
- Confusion about which handler is responsible for what
- The `useDownload` handler is never actually triggered because `main.ts` registers its handler first

**Impact**: Maintenance burden, potential for inconsistent state updates.

**Recommendation**: Choose ONE location for progress handling. Either:
- Keep it in `main.ts` for global handling, remove from composable
- Or move entirely to composable level and remove from `main.ts`

---

### 4. [WARNING] Deprecated `substr` Method - `src/composables/download/useDownload.ts` & `src/stores/modules/download/index.ts`

**Location**:
- `src/composables/download/useDownload.ts`: Line 117
- `src/stores/modules/download/index.ts`: Line 28

```typescript
const id = `dl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
```

**Problem**: `String.prototype.substr()` is deprecated. It may be removed in future JavaScript versions.

**Impact**: Code may break in future JavaScript runtimes.

**Recommendation**: Replace with `substring(2, 11)` or `slice(2, 11)`.

---

### 5. [WARNING] Duplicate ID Generation Logic - `src/composables/download/useDownload.ts` & `src/stores/modules/download/index.ts`

**Location**:
- `src/composables/download/useDownload.ts`: Lines 117-119
- `src/stores/modules/download/index.ts`: Lines 27-28

**Problem**: The ID generation logic is duplicated:
- Store has `generateId()` function
- Composable has inline ID generation

Both generate the same format but in different places. The composable's `addTask` method creates the ID and pushes directly to the store's list, bypassing the store's own `addDownloadTask` method which also generates an ID.

**Impact**: If store's `addDownloadTask` is called, it would generate a different ID than expected. Maintenance burden.

**Recommendation**: Remove duplicate logic from composable, use store's `addDownloadTask` method instead, or call store's `generateId()` function.

---

### 6. [WARNING] `any` Type Usage in Global Store Variables - `src/main.ts`

**Location**: Lines 10-11

```typescript
let wallpaperStore: any = null
let downloadStore: any = null
```

**Problem**: Using `any` type bypasses TypeScript's type checking. These stores are typed elsewhere but typed as `any` here.

**Impact**: Loss of type safety, potential runtime errors.

**Recommendation**: Import and use proper types:
```typescript
import type { useWallpaperStore } from './stores/wallpaper'
// Store the return type
type WallpaperStore = ReturnType<typeof useWallpaperStore>
let wallpaperStore: WallpaperStore | null = null
```

---

### 7. [WARNING] Store Method Not Exposed - `src/stores/modules/wallpaper/index.ts`

**Location**: Lines 42-52

**Problem**: The store has a comment "// ==================== 方法（由 Composable 调用） ====================" but the only exposed method is `resetState`. Looking at the codebase, composables directly mutate store state (e.g., `store.loading = true`, `store.queryParams = params`) rather than calling store methods.

**Impact**: Inconsistent state management pattern. Direct mutation makes it harder to track changes and add side effects.

**Recommendation**: Either:
- Add store methods for state mutations (`setLoading`, `setQueryParams`, etc.)
- Or remove the misleading comment and document that direct mutation is intentional

---

### 8. [WARNING] Cache Key Collision Risk - `src/services/wallpaper.service.ts`

**Location**: Lines 46-48

```typescript
private generateCacheKey(url: string, params?: unknown): string {
  return `${url}:${JSON.stringify(params || {})}`
}
```

**Problem**: Using `JSON.stringify` for cache keys can cause issues:
- Object property order is not guaranteed (different order = different key)
- Circular references would throw an error
- Special characters in URL or params could cause collisions

**Impact**: Cache misses or potential runtime errors.

**Recommendation**: Sort object keys before stringifying, or use a more robust key generation method. Consider using a hash function for complex objects.

---

## Info

### 9. [INFO] Inconsistent Error Message Pattern - `src/composables/wallpaper/useWallpaperList.ts`

**Location**: Lines 76, 118, 156, 177

```typescript
showError(result.error?.message || '获取壁纸失败')
```

**Observation**: Error messages are hardcoded in Chinese. While this matches the application's primary language, consider:
- Using a constant or i18n system for consistency
- The pattern is good (fallback message), but spread across multiple locations

---

### 10. [INFO] Memory Cache Without Size Limits - `src/services/wallpaper.service.ts`

**Location**: Lines 32-38

**Observation**: The service has `MAX_CACHE_SIZE = 50` but only enforces it when adding new items. Old items are removed only when the limit is reached. There's no LRU (Least Recently Used) eviction policy.

This is acceptable for the current use case but could be improved for memory efficiency.

---

### 11. [INFO] Unused Store Methods - `src/stores/modules/download/index.ts`

**Location**: Lines 31-49, 99-111, 113-120, 122-124

**Observation**: The store exposes several methods that are not used by the composable:
- `addDownloadTask` - composable has its own `addTask` with duplicate logic
- `pauseDownload` - composable has its own `pauseDownload` that directly mutates
- `resumeDownload` - similar situation
- `cancelDownload` - similar situation
- `isDownloading` - composable has its own `isDownloading`

This suggests either the composable was written without awareness of store methods, or there was a design decision to keep logic in composables. Either way, this creates confusion about the intended architecture.

---

### 12. [INFO] Non-Blocking Initialization Pattern - `src/main.ts`

**Location**: Line 116

```typescript
initializeApp()
```

**Observation**: The `initializeApp()` promise is not awaited or handled. If initialization fails silently, the user may see an incomplete application state without any error indication.

Consider adding a `.catch()` handler to log initialization errors more prominently.

---

## Architecture Observations

### Positive Patterns

1. **Clear Service Layer**: Services properly encapsulate business logic with caching and error handling
2. **Repository Pattern**: Clean separation between data access (repositories) and business logic (services)
3. **Type Safety**: Good use of TypeScript interfaces for return types and parameters
4. **Singleton Services**: Consistent singleton pattern for services
5. **Computed Properties**: Appropriate use of Vue computed for derived state

### Areas for Improvement

1. **State Mutation Consistency**: Choose between direct mutation vs store methods
2. **Progress Handler Location**: Consolidate download progress handling to one location
3. **Persistence Strategy**: Ensure all state changes that need persistence are persisted
4. **Code Deduplication**: Remove duplicate logic between composables and stores

---

## Recommendations Summary

| Priority | Issue | Action |
|----------|-------|--------|
| Critical | Data loss on download failure | Preserve offset, add 'failed' state |
| Critical | Missing persistence on completion | Call saveFinishedRecord after completion |
| High | Duplicate progress handlers | Consolidate to single location |
| Medium | Deprecated `substr` | Replace with `substring` or `slice` |
| Medium | Duplicate ID generation | Use store method or shared utility |
| Medium | `any` types in main.ts | Add proper typing |
| Low | Cache key generation | Sort keys or use hash function |
| Low | Store method usage | Decide on mutation pattern |
