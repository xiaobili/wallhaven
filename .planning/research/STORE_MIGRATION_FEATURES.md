# Store-to-Composable Migration: Feature Categories

> Research Objective: Define feature categories for v2.2 milestone - Store layer separation migration

---

## Executive Summary

This document categorizes the features needed for the Store-to-Composable migration (v2.2 milestone). The goal is to enforce a clean **View → Composable → Store** architecture by eliminating direct store access from views.

---

## Current Architecture Analysis

### Problem: Direct Store Access in Views

Four views currently access stores directly:

| View | Store Accessed | Store Usage |
|------|----------------|-------------|
| `OnlineWallpaper.vue` | `useWallpaperStore` | `totalPageData`, `loading`, `error`, `settings.apiKey` |
| `LocalWallpaper.vue` | `useWallpaperStore` | `settings.downloadPath` |
| `DownloadWallpaper.vue` | `useDownloadStore` | `downloadingList`, `finishedList` (via computed) |
| `SettingPage.vue` | `useWallpaperStore` | `settings` (reactive object) |

### Existing Composables Already Created

Four composables already exist with proper View → Composable → Store pattern:

| Composable | Store Used | Status |
|------------|------------|--------|
| `useWallpaperList` | `useWallpaperStore` | ✅ Complete, but underutilized |
| `useDownload` | `useDownloadStore` | ✅ Complete, but underutilized |
| `useSettings` | `useWallpaperStore` | ✅ Complete, but underutilized |
| `useAlert` | None (standalone) | ✅ Complete |

---

## Feature Categories

### Category 1: Settings Access Migration

**Scope:** Views accessing `wallpaperStore.settings` directly

**Current Usage:**
- `OnlineWallpaper.vue`: `wallpaperStore.settings.apiKey` (computed)
- `LocalWallpaper.vue`: `wallpaperStore.settings.downloadPath` (computed)
- `SettingPage.vue`: `wallpaperStore.settings` (reactive binding in template)

**Migration Target:**
- `useSettings()` already exposes `settings` as `ComputedRef<AppSettings>`
- Views should use `const { settings } = useSettings()` instead of store directly

**Complexity:** ⭐ Low
- Already implemented in `useSettings`
- Simple substitution pattern

**Dependencies:** None

**Capabilities Exposed by `useSettings`:**
```typescript
interface UseSettingsReturn {
  settings: ComputedRef<AppSettings>
  load: () => Promise<boolean>
  update: (partial: Partial<AppSettings>) => Promise<boolean>
  reset: () => Promise<boolean>
  getDefaults: () => AppSettings
}
```

---

### Category 2: Wallpaper State Migration

**Scope:** Views accessing wallpaper state from store

**Current Usage:**
- `OnlineWallpaper.vue`: `wallpaperStore.totalPageData`, `wallpaperStore.loading`, `wallpaperStore.error`

**Migration Target:**
- `useWallpaperList()` already exposes these as computed refs
- Need to replace direct store access with composable properties

**Complexity:** ⭐ Low
- `useWallpaperList` already has all required properties
- Template bindings remain the same (computed refs are transparent)

**Dependencies:** None

**Capabilities Exposed by `useWallpaperList`:**
```typescript
interface UseWallpaperListReturn {
  wallpapers: ComputedRef<TotalPageData>  // Maps to totalPageData
  loading: ComputedRef<boolean>
  error: ComputedRef<boolean>
  queryParams: ComputedRef<GetParams | null>
  savedParams: ComputedRef<CustomParams | null>
  fetch: (params: GetParams | null) => Promise<boolean>
  loadMore: () => Promise<boolean>
  reset: () => void
  saveCustomParams: (params: CustomParams) => Promise<boolean>
  loadSavedParams: () => Promise<CustomParams | null>
}
```

---

### Category 3: Download State Migration

**Scope:** Views accessing download state from store

**Current Usage:**
- `DownloadWallpaper.vue`: `downloadStore.downloadingList`, `downloadStore.finishedList` (wrapped in computed)

**Migration Target:**
- `useDownload()` already exposes these as computed refs
- Need to remove the redundant computed wrapper and use composable directly

**Complexity:** ⭐ Low
- `useDownload` already has all required properties
- Minor code simplification (remove redundant computed)

**Dependencies:** None

**Capabilities Exposed by `useDownload`:**
```typescript
interface UseDownloadReturn {
  downloadingList: ComputedRef<DownloadItem[]>
  finishedList: ComputedRef<FinishedDownloadItem[]>
  totalActive: ComputedRef<number>
  totalPaused: ComputedRef<number>
  totalFinished: ComputedRef<number>
  addTask: (task) => string
  startDownload: (id: string) => Promise<boolean>
  pauseDownload: (id: string) => Promise<boolean>
  resumeDownload: (id: string) => Promise<boolean>
  cancelDownload: (id: string) => Promise<boolean>
  removeFinished: (id: string) => Promise<boolean>
  clearFinished: () => Promise<void>
  isDownloading: (wallpaperId: string) => boolean
  loadHistory: () => Promise<void>
  restorePendingDownloads: () => Promise<void>
  cleanupOrphanFiles: () => Promise<void>
}
```

---

### Category 4: Store Reference Cleanup

**Scope:** Removing all `useWallpaperStore` and `useDownloadStore` imports from view files

**Target Files:**
- `src/views/OnlineWallpaper.vue`
- `src/views/LocalWallpaper.vue`
- `src/views/DownloadWallpaper.vue`
- `src/views/SettingPage.vue`

**Complexity:** ⭐⭐ Medium
- Requires careful audit of each store property usage
- Must ensure all properties are available through composables
- May require extending composables if gaps are found

**Dependencies:**
- Categories 1-3 must be complete

---

### Category 5: Composable Extension (If Needed)

**Scope:** Adding missing capabilities to existing composables

**Potential Gaps:**

1. **`useSettings` for SettingPage.vue:**
   - Current: `settings` is `ComputedRef<AppSettings>` (read-only)
   - Needed: Direct reactive binding for v-model in forms
   - Options:
     a) Return a reactive copy that syncs on update
     b) Add per-field setters (e.g., `setApiKey(value)`)
     c) Keep current pattern with explicit `update()` calls

2. **Local Wallpaper Operations:**
   - `LocalWallpaper.vue` uses `wallpaperStore.settings.downloadPath`
   - No `useLocalWallpaper` composable exists
   - Could create new composable or use `useSettings`

**Complexity:** ⭐⭐ Medium
- Depends on findings during migration

**Dependencies:** Category 4 results

---

## Feature Classification

### Table Stakes (Must Have)

These are the core features required for a successful Store-to-Composable migration:

| Feature | Category | Priority |
|---------|----------|----------|
| Settings access via useSettings | 1 | P0 |
| Wallpaper state via useWallpaperList | 2 | P0 |
| Download state via useDownload | 3 | P0 |
| Remove all direct store imports from views | 4 | P0 |

### Differentiators (Nice to Have)

Features that improve developer experience but are not strictly required:

| Feature | Category | Priority |
|---------|----------|----------|
| useLocalWallpaper composable | 5 | P2 |
| Enhanced form binding for settings | 5 | P2 |
| Composable-level caching | 5 | P3 |

### Anti-Features (Out of Scope)

These should NOT be done during this migration:

| Anti-Feature | Reason |
|--------------|--------|
| Changing UI behavior | Violates core constraint |
| Adding new user features | Out of scope for architecture migration |
| Modifying store structure | Stores remain as data containers |
| Changing composable signatures | Maintain backward compatibility |
| Performance optimization | Not the goal of this migration |

---

## Complexity Assessment

### Overall Migration Complexity: ⭐⭐ Low-Medium

**Why Low Complexity?**
1. Composables already exist and are well-designed
2. Pattern is straightforward: replace store import with composable import
3. Views already use composables partially (e.g., `useAlert`)
4. No new capabilities needed for most views

**Risk Areas:**
1. **SettingPage.vue reactive binding** - `settings` object used directly with v-model
   - Current pattern: `v-model="settings.apiKey"` binds directly to reactive store state
   - Composable returns `ComputedRef` (read-only)
   - Solution: Use `update()` for changes, or extend composable

2. **OnlineWallpaper.vue scroll event** - Uses `wallpaperStore.loading` in scroll handler
   - Need to ensure composable's `loading` is accessible in event handler context

---

## Recommended Migration Order

### Phase 1: Simple Substitutions (Categories 1-3)
1. `LocalWallpaper.vue` - Only uses `settings.downloadPath`
2. `OnlineWallpaper.vue` - Uses `totalPageData`, `loading`, `error`, `settings.apiKey`
3. `DownloadWallpaper.vue` - Uses `downloadingList`, `finishedList`

### Phase 2: Complex View (Category 4)
4. `SettingPage.vue` - Full settings reactive binding

### Phase 3: Verification & Cleanup (Category 5)
5. Remove all store imports
6. Verify no regressions
7. Extend composables if needed

---

## Summary

| Metric | Value |
|--------|-------|
| Total Views to Migrate | 4 |
| Existing Composables | 4 |
| New Composables Needed | 0-1 |
| Complexity | Low-Medium |
| Estimated Effort | 2-4 hours |

The migration is straightforward because:
1. Composables already exist with proper architecture
2. Pattern is substitution, not creation
3. Main challenge is SettingPage.vue reactive binding

---

## Dependencies on Existing Work

| Dependency | Status | Notes |
|------------|--------|-------|
| `useWallpaperList` composable | ✅ Complete | Already exposes all required properties |
| `useDownload` composable | ✅ Complete | Already exposes all required properties |
| `useSettings` composable | ✅ Complete | May need minor extension for form binding |
| `useAlert` composable | ✅ Complete | Already used in all views |
| Pinia stores | ✅ Stable | No changes needed |

---

## Detailed Store Usage Analysis

### OnlineWallpaper.vue

**Current Pattern:**
```typescript
const wallpaperStore = useWallpaperStore()
const apiKey = computed(() => wallpaperStore.settings.apiKey)

// Template usage:
// :page-data="wallpaperStore.totalPageData"
// :loading="wallpaperStore.loading"
// :error="wallpaperStore.error"
```

**Target Pattern:**
```typescript
const { wallpapers, loading, error } = useWallpaperList()
const { settings } = useSettings()
const apiKey = computed(() => settings.value.apiKey)

// Template usage:
// :page-data="wallpapers"
// :loading="loading"
// :error="error"
```

### LocalWallpaper.vue

**Current Pattern:**
```typescript
const wallpaperStore = useWallpaperStore()
const downloadPath = computed(() => wallpaperStore.settings.downloadPath)
```

**Target Pattern:**
```typescript
const { settings } = useSettings()
const downloadPath = computed(() => settings.value.downloadPath)
```

### DownloadWallpaper.vue

**Current Pattern:**
```typescript
const downloadStore = useDownloadStore()
const downloadList = computed(() => downloadStore.downloadingList)
const downloadFinishedList = computed(() => downloadStore.finishedList)
```

**Target Pattern:**
```typescript
const { downloadingList, finishedList } = useDownload()
// Use directly - no wrapper computed needed
```

### SettingPage.vue

**Current Pattern:**
```typescript
const wallpaperStore = useWallpaperStore()
const settings = wallpaperStore.settings  // Direct reactive binding

// Template usage:
// v-model="settings.downloadPath"
// v-model="settings.apiKey"
```

**Challenge:**
- `useSettings` returns `ComputedRef<AppSettings>` (read-only)
- v-model requires writable ref/reactive

**Options:**

**Option A: Keep explicit updates**
```typescript
const { settings, update } = useSettings()
const localSettings = reactive({ ...settings.value })

// On save:
await update(localSettings)
```

**Option B: Extend useSettings**
```typescript
interface UseSettingsReturn {
  // ... existing
  localSettings: Reactive<AppSettings>  // For form binding
  sync: () => void  // Sync local to store
}
```

**Option C: Per-field setters**
```typescript
interface UseSettingsReturn {
  // ... existing
  setApiKey: (value: string) => void
  setDownloadPath: (value: string) => void
  // ... etc
}
```

**Recommendation:** Option A (keep explicit updates)
- Aligns with existing pattern
- Clear save/discard semantics
- No composable changes needed

---

*Created: 2026-04-27*
*Milestone: v2.2 Store 分层迁移*
