# Project Research Summary

**Project:** Wallhaven 壁纸浏览器 - v2.2 里程碑
**Domain:** Architecture Refactoring - Store-to-Composable Migration
**Researched:** 2026-04-27
**Confidence:** HIGH

## Executive Summary

This research focuses on the Store-to-Composable migration (v2.2 milestone), which enforces a clean **View → Composable → Store** architecture by eliminating direct store access from views. The project already has a solid foundation with four composables (`useWallpaperList`, `useDownload`, `useSettings`, `useAlert`) properly implemented, but views still bypass these composables in some cases.

**No new dependencies required.** The existing Vue 3.5.32 + Pinia 3.0.4 + TypeScript 6.0.0 stack fully supports the migration. The existing composables already follow the correct pattern—exposing store state as `ComputedRef` and encapsulating all operations. The migration is primarily a substitution exercise rather than new development.

The primary challenge is **SettingPage.vue**, which uses direct reactive binding with v-model (`v-model="settings.apiKey"`). The current `useSettings` returns `ComputedRef<AppSettings>` (read-only), requiring a decision on how to handle form binding. The recommended approach is to keep explicit `update()` calls with a local reactive copy, maintaining clear save/discard semantics.

## Key Findings

### Recommended Stack

**No new dependencies required.** The existing technology stack provides all capabilities needed:

**Core technologies:**
- **Vue 3.5.32**: Composition API with `computed`, reactive refs — native support for composable pattern
- **Pinia 3.0.4**: Store composition within composables — already validated pattern
- **TypeScript 6.0.0**: Interface definitions for composable returns — compile-time layer enforcement
- **ESLint `no-restricted-imports`**: Layer boundary enforcement — native rule, zero dependencies

### Current Architecture State

**Partial layer separation** — Some views correctly use composables while others bypass them:

| View | Direct Store Access | Uses Composables | Status |
|------|---------------------|------------------|--------|
| `OnlineWallpaper.vue` | ✅ `wallpaperStore.totalPageData`, `.loading`, `.error`, `.settings.apiKey` | ✅ `useWallpaperList`, `useDownload`, `useSettings` | ⚠️ Mixed access |
| `LocalWallpaper.vue` | ✅ `wallpaperStore.settings.downloadPath` | ❌ None for settings | ⚠️ Direct access |
| `DownloadWallpaper.vue` | ✅ `downloadStore.downloadingList`, `.finishedList` | ✅ `useDownload` | ⚠️ Mixed access |
| `SettingPage.vue` | ✅ `wallpaperStore.settings` (reactive reference) | ✅ `useSettings` | ⚠️ Mixed access |

### Existing Composables (Already Validated)

Four composables already exist with proper View → Composable → Store pattern:

| Composable | Store Dependency | Status |
|------------|------------------|--------|
| `useWallpaperList` | `useWallpaperStore` | ✅ Complete, exposes `wallpapers`, `loading`, `error` |
| `useDownload` | `useDownloadStore` | ✅ Complete, exposes all list state and operations |
| `useSettings` | `useWallpaperStore` | ✅ Complete, exposes `settings`, `load`, `update`, `reset` |
| `useAlert` | None (standalone) | ✅ Complete, used across all views |

### Migration Categories

**Category 1: Settings Access Migration** (Complexity: ⭐ Low)
- Replace `wallpaperStore.settings.xxx` with `const { settings } = useSettings()`
- Affected: `OnlineWallpaper.vue`, `LocalWallpaper.vue`, `SettingPage.vue`

**Category 2: Wallpaper State Migration** (Complexity: ⭐ Low)
- Replace `wallpaperStore.totalPageData`, `.loading`, `.error` with `useWallpaperList()`
- Affected: `OnlineWallpaper.vue`

**Category 3: Download State Migration** (Complexity: ⭐ Low)
- Replace `downloadStore.downloadingList`, `.finishedList` with `useDownload()`
- Affected: `DownloadWallpaper.vue`

**Category 4: Store Reference Cleanup** (Complexity: ⭐⭐ Medium)
- Remove all `useWallpaperStore` and `useDownloadStore` imports from view files
- Add ESLint rule to prevent regression

**Category 5: Composable Extension (If Needed)** (Complexity: ⭐⭐ Medium)
- Potential: Create `useLocalWallpaper` composable for local file operations
- Potential: Enhanced form binding for `SettingPage.vue`

### Critical Pitfalls

1. **Breaking Reactivity** — When migrating store access to composables, always return `ComputedRef`. Common error is returning static values or using `.value` incorrectly. Mitigation: Use `computed(() => store.property)` pattern consistently.

2. **SettingPage.vue Reactive Binding** — v-model requires writable ref/reactive, but `useSettings` returns read-only `ComputedRef`. Options:
   - **Option A (Recommended)**: Keep explicit `update()` calls with local reactive copy
   - **Option B**: Extend `useSettings` with `localSettings` reactive reference
   - **Option C**: Add per-field setters like `setApiKey(value)`

3. **Lifecycle Hook Migration** — Event listeners and subscriptions must move with related business logic. Current `OnlineWallpaper.vue` scroll event handlers should stay in view (UI concern) but store access should go through composables.

4. **KeepAlive Cache State** — Views use `<KeepAlive>`. Composables are instance-level (created in `setup()`), so shared state must remain in Pinia stores, not local composable state. Mitigation: Composables should not hold duplicate state.

5. **Circular Dependencies** — Ensure one-way dependency: View → Composable → Store. Stores should never import from composables.

6. **Vue Reactive Proxy IPC Errors** — When composables pass data to IPC, use `toRaw()` or JSON serialization. Never pass Vue reactive objects through IPC.

## Implications for Roadmap

Based on research, suggested phase structure for v2.2 milestone:

### Phase 1: Simple Substitutions
**Rationale:** Start with lowest-risk migrations that don't require composable changes.
**Files:** `LocalWallpaper.vue`, `DownloadWallpaper.vue`
**Changes:**
- `LocalWallpaper.vue`: Replace `wallpaperStore.settings.downloadPath` with `useSettings()`
- `DownloadWallpaper.vue`: Replace `downloadStore.downloadingList/finishedList` with `useDownload()`

### Phase 2: Complex View Migration
**Rationale:** Handle views with multiple store access patterns.
**Files:** `OnlineWallpaper.vue`
**Changes:**
- Replace `wallpaperStore.totalPageData`, `.loading`, `.error` with `useWallpaperList()`
- Replace `wallpaperStore.settings.apiKey` with `useSettings()`
- Verify scroll event handler works with composable's `loading`

### Phase 3: Settings Page Migration
**Rationale:** Most complex due to reactive form binding.
**Files:** `SettingPage.vue`
**Changes:**
- Decide on form binding approach (recommended: explicit `update()` with local copy)
- Remove direct `wallpaperStore` import
- Test all settings fields work correctly

### Phase 4: Verification & Enforcement
**Rationale:** Ensure architecture integrity and prevent regression.
**Delivers:**
- Remove all store imports from views
- Add ESLint `no-restricted-imports` rule
- TypeScript compilation verification
- Manual functional testing

### Phase Ordering Rationale

- **Phase 1 → Phase 2**: Build confidence with simple migrations before complex views
- **Phase 2 → Phase 3**: Standard migrations before the special case (SettingPage)
- **Phase 3 → Phase 4**: Complete migration before enforcement
- **Vertical slicing**: Each phase delivers testable functionality end-to-end

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 3:** SettingPage.vue form binding approach — may need to extend useSettings or create local reactive copy

Phases with standard patterns (skip research-phase):
- **Phase 1:** Simple substitution, existing composables already expose required properties
- **Phase 2:** Standard migration pattern, composables already validated
- **Phase 4:** Standard ESLint configuration, TypeScript checks

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | No new dependencies, existing tools fully capable |
| Features | HIGH | Composables already exist, migration is substitution |
| Architecture | HIGH | Existing pattern is correct, just needs consistent application |
| Pitfalls | HIGH | Comprehensive pitfall research with concrete mitigation strategies |

**Overall confidence:** HIGH

### Gaps to Address

- **SettingPage.vue Form Binding**: Decide between explicit `update()` calls vs. extended composable during Phase 3 planning
- **Local Wallpaper Operations**: Consider creating `useLocalWallpaper` composable if scope allows, otherwise use `useSettings` for download path

## Estimated Effort

| Metric | Value |
|--------|-------|
| Total Views to Migrate | 4 |
| Existing Composables | 4 (all validated) |
| New Composables Needed | 0-1 (optional `useLocalWallpaper`) |
| Complexity | Low-Medium |
| Estimated Effort | 2-4 hours |

The migration is straightforward because:
1. Composables already exist with proper architecture
2. Pattern is substitution, not creation
3. Main challenge is SettingPage.vue reactive binding (clear options available)

## Sources

### Primary (HIGH confidence)
- Existing codebase analysis — composables, stores, views
- Vue 3 Composition API documentation — computed, reactive patterns
- Pinia best practices — store composition within composables
- TypeScript interfaces — composable return types

### Secondary (MEDIUM confidence)
- Vue 3 Composables best practices — Vue.js official guide
- ESLint `no-restricted-imports` — layer enforcement

### Tertiary (LOW confidence)
- None identified — architecture is well-understood from codebase analysis

---

## Appendix: Migration Patterns

### Pattern A: Simple State Substitution

**Before:**
```typescript
const wallpaperStore = useWallpaperStore()
const downloadPath = computed(() => wallpaperStore.settings.downloadPath)
```

**After:**
```typescript
const { settings } = useSettings()
const downloadPath = computed(() => settings.value.downloadPath)
```

### Pattern B: Wallpaper List State

**Before:**
```typescript
const wallpaperStore = useWallpaperStore()
// Template: :page-data="wallpaperStore.totalPageData"
// Template: :loading="wallpaperStore.loading"
// Template: :error="wallpaperStore.error"
```

**After:**
```typescript
const { wallpapers, loading, error } = useWallpaperList()
// Template: :page-data="wallpapers"
// Template: :loading="loading"
// Template: :error="error"
```

### Pattern C: Download List State

**Before:**
```typescript
const downloadStore = useDownloadStore()
const downloadList = computed(() => downloadStore.downloadingList)
const downloadFinishedList = computed(() => downloadStore.finishedList)
```

**After:**
```typescript
const { downloadingList, finishedList } = useDownload()
// Use directly - no wrapper computed needed (already ComputedRef)
```

### Pattern D: Settings Form Binding (Recommended)

**Before:**
```typescript
const wallpaperStore = useWallpaperStore()
const settings = wallpaperStore.settings  // Direct reactive reference
// Template: v-model="settings.downloadPath"
```

**After (Option A - Explicit Updates):**
```typescript
const { settings, update } = useSettings()
const localSettings = reactive({ ...settings.value })

const handleSave = async () => {
  await update(localSettings)
}
// Template: v-model="localSettings.downloadPath"
// Save button triggers handleSave()
```

---

## Appendix: ESLint Enforcement Rule

To prevent future violations after migration:

```javascript
// eslint.config.js (flat config)
{
  rules: {
    'no-restricted-imports': ['error', {
      patterns: [{
        group: ['@/stores/*'],
        importNames: ['useWallpaperStore', 'useDownloadStore'],
        message: 'Views must import stores via composables, not directly. Use useWallpaperList, useDownload, or useSettings instead.'
      }]
    }]
  }
}
```

---

*Research completed: 2026-04-27*
*Ready for roadmap: yes*
*Milestone: v2.2 Store 分层迁移*
