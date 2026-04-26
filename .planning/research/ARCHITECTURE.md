# Architecture Research: Store-to-Composable Migration

## Research Question

**How do we enforce View → Composable → Store layer boundaries? What patterns ensure views never directly access stores? How to structure composables to encapsulate all store access?**

---

## Executive Summary

The current codebase has **partial layer separation**. Some views correctly use composables while others bypass them and directly access stores. This research identifies the violations, proposes enforcement patterns, and provides a migration strategy.

### Current State Assessment

| View | Direct Store Access | Uses Composables | Violations |
|------|---------------------|------------------|------------|
| `OnlineWallpaper.vue` | ✅ `wallpaperStore` | ✅ `useWallpaperList`, `useDownload`, `useSettings` | ⚠️ Mixed access |
| `LocalWallpaper.vue` | ✅ `wallpaperStore` | ❌ None for settings | ⚠️ Direct access |
| `DownloadWallpaper.vue` | ✅ `downloadStore` | ✅ `useDownload` | ⚠️ Mixed access |
| `SettingPage.vue` | ✅ `wallpaperStore.settings` | ✅ `useSettings` | ⚠️ Mixed access |

**Key Finding**: All views have violations - they directly access stores alongside using composables.

---

## Current Architecture Analysis

### Layer Stack (As-Is)

```
┌─────────────────────────────────────────────────────────────────┐
│                     View Layer                                   │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  OnlineWallpaper.vue                                        ││
│  │  - Direct: wallpaperStore.totalPageData, .loading, .error   ││
│  │  - Direct: wallpaperStore.settings.downloadPath             ││
│  │  - Composable: useWallpaperList(), useDownload(), useAlert()││
│  └─────────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  LocalWallpaper.vue                                         ││
│  │  - Direct: wallpaperStore.settings.downloadPath             ││
│  │  - Composable: useAlert() only                              ││
│  └─────────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  DownloadWallpaper.vue                                      ││
│  │  - Direct: downloadStore.downloadingList, .finishedList     ││
│  │  - Composable: useDownload(), useAlert()                    ││
│  └─────────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  SettingPage.vue                                            ││
│  │  - Direct: wallpaperStore.settings (reactive reference)     ││
│  │  - Composable: useSettings(), useAlert()                    ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Composable Layer                               │
│  - useAlert: Encapsulates alert state (✅ No store dependency)  │
│  - useWallpaperList: Uses wallpaperStore internally             │
│  - useDownload: Uses downloadStore internally                   │
│  - useSettings: Uses wallpaperStore.settings internally         │
└─────────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Store Layer                                 │
│  - useWallpaperStore: State + minimal methods                   │
│  - useDownloadStore: State + download list methods              │
└─────────────────────────────────────────────────────────────────┘
```

### Identified Violations

#### 1. OnlineWallpaper.vue

```typescript
// VIOLATION: Direct store access for state reading
const wallpaperStore = useWallpaperStore()
// Template uses: wallpaperStore.error, wallpaperStore.totalPageData, wallpaperStore.loading

// VIOLATION: Direct access to nested store state
const downloadPath = wallpaperStore.settings.downloadPath  // In downloadWallpaperFile()

// CORRECT: Using composables
const { fetch: fetchWallpapers, loadMore: loadMoreWallpapers } = useWallpaperList()
const { addTask, startDownload } = useDownload()
```

#### 2. LocalWallpaper.vue

```typescript
// VIOLATION: Direct store access for settings
const wallpaperStore = useWallpaperStore()
const downloadPath = computed(() => wallpaperStore.settings.downloadPath)

// MISSING: No useSettings() or useLocalWallpaper() composable
```

#### 3. DownloadWallpaper.vue

```typescript
// VIOLATION: Direct store access for list data
const downloadStore = useDownloadStore()
const downloadList = computed(() => downloadStore.downloadingList)
const downloadFinishedList = computed(() => downloadStore.finishedList)

// CORRECT: Using composable for operations
const { pauseDownload, cancelDownload, resumeDownload } = useDownload()
```

#### 4. SettingPage.vue

```typescript
// VIOLATION: Direct store settings reference
const wallpaperStore = useWallpaperStore()
const settings = wallpaperStore.settings  // Direct reactive reference

// CORRECT: Using composable for updates
const { update: updateSettings, reset: resetSettingsComposable } = useSettings()
```

---

## Target Architecture

### Layer Stack (To-Be)

```
┌─────────────────────────────────────────────────────────────────┐
│                     View Layer                                   │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  OnlineWallpaper.vue                                        ││
│  │  - Composable ONLY: useWallpaperList(), useDownload()       ││
│  │  - No direct store imports                                  ││
│  └─────────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  LocalWallpaper.vue                                         ││
│  │  - Composable ONLY: useLocalWallpaper(), useSettings()      ││
│  │  - No direct store imports                                  ││
│  └─────────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  DownloadWallpaper.vue                                      ││
│  │  - Composable ONLY: useDownload()                           ││
│  │  - No direct store imports                                  ││
│  └─────────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  SettingPage.vue                                            ││
│  │  - Composable ONLY: useSettings()                           ││
│  │  - No direct store imports                                  ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Composable Layer                               │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  useWallpaperList: Exposes wallpapers, loading, error       ││
│  │  useDownload: Exposes downloadingList, finishedList, ops    ││
│  │  useSettings: Exposes settings, load, update, reset         ││
│  │  useLocalWallpaper: NEW - Exposes local wallpapers, ops     ││
│  │  useAlert: Alert state (no store dependency)                ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Store Layer                                 │
│  - useWallpaperStore: Pure state container, minimal methods     │
│  - useDownloadStore: Pure state container, minimal methods      │
│  - Only composables import stores                               │
└─────────────────────────────────────────────────────────────────┘
```

---

## Enforcement Patterns

### Pattern 1: Computed Property Forwarding

Each composable exposes all necessary state as computed properties, preventing views from needing direct store access.

**Current useWallpaperList pattern (correct):**
```typescript
export function useWallpaperList(): UseWallpaperListReturn {
  const store = useWallpaperStore()

  return {
    // State exposed as ComputedRef - prevents direct mutation
    wallpapers: computed(() => store.totalPageData),
    loading: computed(() => store.loading),
    error: computed(() => store.error),
    queryParams: computed(() => store.queryParams),
    savedParams: computed(() => store.savedParams),

    // Methods for operations
    fetch,
    loadMore,
    reset,
  }
}
```

### Pattern 2: Encapsulated Operations

All operations go through composables, which coordinate with services and stores.

**Current useDownload pattern (correct):**
```typescript
export function useDownload(): UseDownloadReturn {
  const store = useDownloadStore()

  const pauseDownload = async (id: string): Promise<boolean> => {
    const task = store.downloadingList.find(item => item.id === id)
    if (!task || task.state !== 'downloading') return false

    // Service call
    const result = await downloadService.pauseDownload(id)

    if (result.success) {
      task.state = 'paused'  // Internal store mutation
      return true
    }
    return false
  }

  return {
    downloadingList: computed(() => store.downloadingList),
    pauseDownload,
    // ...
  }
}
```

### Pattern 3: Single Responsibility Composables

Each composable owns a specific domain and its associated store.

| Composable | Store Dependency | Responsibility |
|------------|------------------|----------------|
| `useAlert` | None | Alert UI state |
| `useWallpaperList` | `useWallpaperStore` | Online wallpaper browsing |
| `useDownload` | `useDownloadStore` | Download task management |
| `useSettings` | `useWallpaperStore.settings` | App configuration |
| `useLocalWallpaper` (NEW) | None (uses Electron API directly) | Local file browsing |

---

## Required Changes

### 1. Extend useWallpaperList Return Type

Add missing state that OnlineWallpaper currently accesses directly:

```typescript
export interface UseWallpaperListReturn {
  // Existing
  wallpapers: ComputedRef<TotalPageData>
  loading: ComputedRef<boolean>
  error: ComputedRef<boolean>
  queryParams: ComputedRef<GetParams | null>
  savedParams: ComputedRef<CustomParams | null>

  // ADD: For scroll detection
  currentPage: ComputedRef<number>
  totalPage: ComputedRef<number>

  // Methods
  fetch: (params: GetParams | null) => Promise<boolean>
  loadMore: () => Promise<boolean>
  reset: () => void
  saveCustomParams: (params: CustomParams) => Promise<boolean>
  loadSavedParams: () => Promise<CustomParams | null>
}
```

### 2. Extend useDownload Return Type

Add missing state that DownloadWallpaper currently accesses directly:

```typescript
export interface UseDownloadReturn {
  // Existing - already correct
  downloadingList: ComputedRef<DownloadItem[]>
  finishedList: ComputedRef<FinishedDownloadItem[]>
  totalActive: ComputedRef<number>
  totalPaused: ComputedRef<number>
  totalFinished: ComputedRef<number>

  // All methods already exposed - no changes needed
}
```

### 3. Create useLocalWallpaper Composable (NEW)

Encapsulate local wallpaper operations:

```typescript
// src/composables/local/useLocalWallpaper.ts

export interface UseLocalWallpaperReturn {
  // State
  wallpapers: ComputedRef<LocalWallpaper[]>
  loading: ComputedRef<boolean>
  downloadPath: ComputedRef<string>
  emptyMessage: ComputedRef<string>

  // Methods
  refresh: () => Promise<void>
  openFolder: () => Promise<void>
  setAsWallpaper: (wallpaper: LocalWallpaper) => Promise<void>
  deleteWallpaper: (wallpaper: LocalWallpaper, index: number) => Promise<void>
}

export function useLocalWallpaper(): UseLocalWallpaperReturn {
  const { settings } = useSettings()
  const { showSuccess, showError } = useAlert()

  const loading = ref(false)
  const wallpapers = ref<LocalWallpaper[]>([])

  // Computed from settings (no direct store access)
  const downloadPath = computed(() => settings.value.downloadPath)

  // ... implementation
}
```

### 4. Modify useSettings Return

Ensure settings reactive reference is properly encapsulated:

```typescript
export interface UseSettingsReturn {
  // Current: Already returns ComputedRef
  settings: ComputedRef<AppSettings>

  // Methods
  load: () => Promise<boolean>
  update: (partial: Partial<AppSettings>) => Promise<boolean>
  reset: () => Promise<boolean>
  getDefaults: () => AppSettings
}
```

---

## Integration Points

### Modified Files

| File | Change Type | Description |
|------|-------------|-------------|
| `src/composables/wallpaper/useWallpaperList.ts` | Modify | Add `currentPage`, `totalPage` computed exports |
| `src/composables/settings/useSettings.ts` | No change | Already correct |
| `src/composables/download/useDownload.ts` | No change | Already correct |
| `src/composables/local/useLocalWallpaper.ts` | NEW | Create new composable |
| `src/composables/index.ts` | Modify | Export new composable |
| `src/views/OnlineWallpaper.vue` | Modify | Remove store imports, use composable only |
| `src/views/LocalWallpaper.vue` | Modify | Remove store imports, use new composable |
| `src/views/DownloadWallpaper.vue` | Modify | Remove store imports, use composable only |
| `src/views/SettingPage.vue` | Modify | Remove store imports, use composable only |

### New Files

| File | Description |
|------|-------------|
| `src/composables/local/useLocalWallpaper.ts` | Local wallpaper management composable |
| `src/composables/local/index.ts` | Export barrel |

---

## Build Order

Phase 1: **Extend Existing Composables**
1. Modify `useWallpaperList.ts` - Add `currentPage`, `totalPage` exports
2. Verify no changes needed for `useDownload.ts`
3. Verify no changes needed for `useSettings.ts`

Phase 2: **Create New Composable**
4. Create `src/composables/local/` directory
5. Create `useLocalWallpaper.ts`
6. Create `local/index.ts` barrel export
7. Update `src/composables/index.ts`

Phase 3: **Migrate Views**
8. Modify `OnlineWallpaper.vue` - Remove store imports
9. Modify `DownloadWallpaper.vue` - Remove store imports
10. Modify `SettingPage.vue` - Remove store imports
11. Modify `LocalWallpaper.vue` - Use new composable

Phase 4: **Verification**
12. Run TypeScript compilation
13. Run application and verify all functionality
14. ESLint rule check (optional: add no-store-in-views rule)

---

## Verification Checklist

After migration, verify:

- [ ] No view files import `useWallpaperStore` or `useDownloadStore`
- [ ] All view files only import from `@/composables`
- [ ] All existing functionality works correctly
- [ ] No TypeScript errors
- [ ] No console warnings about missing properties

---

## Optional: ESLint Enforcement Rule

To prevent future violations, consider adding a custom ESLint rule:

```javascript
// .eslintrc.js
rules: {
  'no-restricted-imports': ['error', {
    patterns: [{
      group: ['@/stores/*'],
      importNames: ['useWallpaperStore', 'useDownloadStore'],
      message: 'Views must use composables, not stores directly. Import from @/composables instead.'
    }]
  }]
}
```

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Breaking reactivity | Low | High | Use computed() for all state exports |
| Missing state exposure | Medium | Medium | Comprehensive return type analysis |
| Performance regression | Low | Low | Computed refs are efficient |
| Behavior change | Low | High | Test all view functionality |

---

## Conclusion

The migration is straightforward because:
1. Composables already follow the correct pattern
2. Only need to extend return types and create one new composable
3. Views already import composables, just need to remove store imports

The key enforcement mechanism is:
- **Expose all state through composables as `ComputedRef`**
- **Remove store imports from views**
- **Optional ESLint rule to prevent regressions**

---

*Research completed: 2026-04-27*
*Applicable milestone: v2.2 Store-to-Composable migration*
