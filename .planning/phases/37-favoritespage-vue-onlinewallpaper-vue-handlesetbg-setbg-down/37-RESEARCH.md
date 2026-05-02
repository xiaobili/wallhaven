# Phase 37: Composables 提取 (handleSetBg/setBg + downloadWallpaperFile) — Research

**Researched:** 2026-05-02
**Domain:** Vue 3 Composable extraction — deduplication of wallpaper download and set-background logic
**Confidence:** HIGH

## Summary

Phase 37 extracts duplicated `downloadWallpaperFile()` and `setBg()`/`handleSetBg()` logic from `FavoritesPage.vue` and `OnlineWallpaper.vue` into the existing `useWallpaperSetter` composable. Both views contain ~45 lines of identical `downloadWallpaperFile` code and nearly identical `setBg`/`handleSetBg` wrapper functions. The extraction consolidates them into two new composable methods — `downloadWallpaperFile()` (direct download) and `setBgFromUrl()` (download + set wallpaper in one call) — eliminating all duplication.

The existing `useWallpaperSetter` composable (`src/composables/wallpaper/useWallpaperSetter.ts`) currently exposes only `setWallpaper(imagePath)`. It uses `useAlert()` for notifications and delegates to `wallpaperService`. The extracted methods will add `useSettings()` as a new dependency (for download path management) and use the `electronClient` directly (consistent with the D-03 decision to bypass the download queue).

**Primary recommendation:** Extend `useWallpaperSetter` with two new methods per D-01/D-02 decisions. Define `DownloadResult` as an exported interface. The composable grows from ~70 lines to ~150 lines. Both views drop ~55 lines each.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| REQ-01 | 将 `downloadWallpaperFile` 提取到 `useWallpaperSetter` 作为新方法 | `downloadWallpaperFile` in both views is byte-for-byte identical (confirmed by source reading). Logic: get download path from settings, prompt folder if unset, save path, generate filename, call `electronClient.downloadWallpaper()`, return structured result. |
| REQ-02 | 在 `useWallpaperSetter` 中添加 `setBgFromUrl()` 高便捷方法 | Both views' `setBg`/`handleSetBg` follow identical pattern: call `downloadWallpaperFile()`, check result, call `setWallpaper()`. `setBgFromUrl` wraps this in the composable. |
| REQ-03 | 更新 `FavoritesPage.vue` 使用提取后的 composable | `handleSetBg` (lines 201-217) and `downloadWallpaperFile` (lines 221-268) to be replaced with one-line composable calls. |
| REQ-04 | 更新 `OnlineWallpaper.vue` 使用提取后的 composable | `setBg` (lines 312-328) and `downloadWallpaperFile` (lines 344-391) to be replaced with one-line composable calls. |
| REQ-05 | 删除 View 中重复的 `downloadWallpaperFile` 和 `setBg`/`handleSetBg` 函数 | Both functions in both views become dead code after extraction. Total removal: ~110 lines. |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Wallpaper download (direct, no queue) | Composable Layer | Client Layer (IPC) | `downloadWallpaperFile()` orchestrates settings access + IPC call. Actual download happens in main process via `electronClient.downloadWallpaper()`. |
| Set wallpaper from URL | Composable Layer | — | `setBgFromUrl()` composes `downloadWallpaperFile()` + existing `setWallpaper()`. Pure orchestration, no secondary tier involvement. |
| Set wallpaper from file path | Composable Layer | Service Layer | Existing `setWallpaper(imagePath)` delegates to `wallpaperService.setWallpaper()`. |
| Download path selection | Composable Layer | Client Layer (IPC) | `useSettings.selectFolder()` opens system dialog via IPC. Settings persistence via `useSettings.update()`. |
| User interaction (button click) | View Layer (Browser) | — | Views emit events or call composable methods directly. Composable handles all business logic. |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vue 3 (Composition API) | 3.5.32 | Reactive state, composable pattern | Project framework |
| TypeScript | 6.0.0 | Type safety for composable interface | Project language |
| Pinia | 3.0.4 | Settings store backing `useSettings` | Project state management |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `useAlert` | (in-repo) | Toast notifications for success/error | New `setBgFromUrl` uses it for user feedback |
| `useSettings` | (in-repo) | Download path management (read, select folder, save) | `downloadWallpaperFile` uses it to resolve save directory |
| `electronClient` | (in-repo) | IPC bridge for `downloadWallpaper()` | Direct download bypassing the queue |

### Alternatives Considered
No alternatives — D-01 explicitly locks composable extension to `useWallpaperSetter`, and all libraries are existing in-repo assets.

## Architecture Patterns

### Pattern 1: Composable Extension (Adding Methods to Existing Composable)

**What:** Extend an existing composable with new methods instead of creating a new composable file. The composable returns a union of old and new methods.

**When to use:** When new functionality is semantically related to the existing composable's domain ("wallpaper setting") and shares its internal dependencies.

**Example (planned):**

```typescript
// src/composables/wallpaper/useWallpaperSetter.ts

export interface UseWallpaperSetterReturn {
  loading: Ref<boolean>
  setWallpaper: (imagePath: string) => Promise<boolean>
  // New:
  downloadWallpaperFile: (imgItem: WallpaperItem) => Promise<DownloadResult>
  setBgFromUrl: (imgItem: WallpaperItem) => Promise<void>
}

export function useWallpaperSetter(): UseWallpaperSetterReturn {
  const { showError, showSuccess } = useAlert()
  const { settings, selectFolder, update: updateSettings } = useSettings()
  const loading = ref(false)

  // Existing
  const setWallpaper = async (imagePath: string): Promise<boolean> => { /* unchanged */ }

  // New
  const downloadWallpaperFile = async (imgItem: WallpaperItem): Promise<DownloadResult> => {
    let downloadPath = settings.value.downloadPath
    if (!downloadPath) {
      const selectResult = await selectFolder()
      if (!selectResult.success || !selectResult.data) {
        return { success: false, filePath: null, error: '未选择下载目录' }
      }
      await updateSettings({ downloadPath: selectResult.data })
      downloadPath = selectResult.data
    }

    let ext = '.jpg'
    if (imgItem.path) {
      const match = imgItem.path.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/i)
      if (match) ext = match[0]
    }
    const filename = `wallhaven-${imgItem.id}${ext}`

    const { electronClient } = await import('@/clients')
    const result = await electronClient.downloadWallpaper({
      url: imgItem.path,
      filename,
      saveDir: downloadPath,
    })

    return {
      success: result.success,
      filePath: result.data || null,
      error: result.error?.message || null,
    }
  }

  const setBgFromUrl = async (imgItem: WallpaperItem): Promise<void> => {
    try {
      const downloadResult = await downloadWallpaperFile(imgItem)
      if (!downloadResult.success || !downloadResult.filePath) {
        showError('下载壁纸失败: ' + (downloadResult.error || '未知错误'))
        return
      }
      await setWallpaper(downloadResult.filePath)
    } catch (error: any) {
      console.error('设置壁纸错误:', error)
      showError('设置壁纸失败: ' + error.message)
    }
  }

  return {
    loading,
    setWallpaper,
    downloadWallpaperFile,
    setBgFromUrl,
  }
}
```

### Pattern 2: Direct Download (Bypass Queue)

**What:** Download a wallpaper file directly via `electronClient.downloadWallpaper()` without going through the `useDownload` queue system. This is for the "quick set as wallpaper" use case where queueing/pausing/resuming is irrelevant.

**When to use:** Per D-03, for any "set as wallpaper" flow where the user expects immediate download + set, not queued download management.

**Key difference from `useDownload.addTask()`:**
| Aspect | useDownload | downloadWallpaperFile |
|--------|------------|----------------------|
| Queue | Yes (waiting/paused/resumed) | No (fire and forget) |
| Progress tracking | Yes (bytes, speed, ETA) | No |
| Use case | Bulk download management | Quick set-as-wallpaper |
| IPC call | `startDownloadTask()` via service | `downloadWallpaper()` direct via client |

### Anti-Patterns to Avoid

- **Don't create a separate composable** for what is semantically wallpaper-setting logic. D-01 explicitly says merge into `useWallpaperSetter`.
- **Don't route through `useDownload`** — D-03 explicitly says keep the set-bg download path independent from the download queue.
- **Don't accept the inline return type** in both views (`Promise<{ success, filePath, error }>`). Extract to a proper `DownloadResult` interface per D-04.

## Don't Hand-Roll

No external dependencies needed for this phase. All code is existing in-repo patterns:
- Console logging: `console.error(...)` (existing pattern in both views)
- Alert notifications: `showError()` / `showSuccess()` from `useAlert()` (existing pattern)
- Dynamic import: `await import('@/clients')` (existing pattern in both views)
- Settings access: `useSettings()` (existing in both views)

## Common Pitfalls

### Pitfall 1: Circular or Duplicate `useSettings` Instantiation

**What goes wrong:** `useWallpaperSetter` currently has no `useSettings` dependency. Adding it means every caller that already instantiates `useSettings` will now have a separate instance. If the composable reads `settings.value.downloadPath` from its own instance, it might get stale data if the view's instance was updated but this one wasn't.

**Why it happens:** `useSettings()` creates a new composable instance each call. Because settings are backed by a Pinia store (which is reactive and shared), multiple instances read the same underlying store, so this is safe.

**How to avoid:** Verify that `useSettings` reads from the shared Pinia store (`useWallpaperStore`), not from local state. Confirmed: `useSettings().settings` is `computed(() => store.settings)` which reads from the shared store. Multiple instances always see the same data.

**Warning signs:** If `downloadWallpaperFile` uses a locally-cached `downloadPath` instead of `settings.value.downloadPath` every call, it can become stale.

### Pitfall 2: `loading` Ref Semantics Confusion

**What goes wrong:** The existing `loading` ref tracks `setWallpaper` only. After adding `downloadWallpaperFile` and `setBgFromUrl`, callers might expect `loading` to cover the full `setBgFromUrl` operation, but the reactively-bound `loading` only tracks the inner `setWallpaper` call.

**Why it happens:** Currently `loading` is set `true` in `setWallpaper` and `false` in the `finally` block. If `setBgFromUrl` sets `setWallpaper` internally, the `loading` ref will correctly spike during the `setWallpaper` phase, but not during the download phase.

**How to avoid:** Options:
1. Add a separate `downloading` ref for `downloadWallpaperFile` (clean separation but more refs).
2. Expand `loading` scope to cover both download and set phases (simpler but less granular).
3. Keep as-is — Views don't bind the `loading` state to any UI element currently (neither view uses `loading` from `useWallpaperSetter` in their templates — both only call the methods imperatively).

Recommended: Keep `loading` tracking only `setWallpaper` (status quo). Neither view currently reads `loading` in template, so changing scope has no behavioral impact.

### Pitfall 3: `electronClient` Dynamic Import Path Differs

**What goes wrong:** Both views use dynamic import `await import('@/clients')` and destructure `electronClient`. If the composable uses a static import `import { electronClient } from '@/clients'`, it works identically but may affect tree-shaking.

**How to avoid:** Use the same dynamic import pattern in the composable to be consistent, or use a static import — either works. The dynamic import pattern was likely chosen because `electronClient` may not be available in all environments (e.g., vitest). Either approach is fine; recommendation: use the same dynamic import pattern for consistency.

**Warning signs:** Build errors or `electronClient is not defined` in test environments if static import is chosen.

### Pitfall 4: `setBgFromUrl` Error Handling Duplication

**What goes wrong:** The `setBgFromUrl` method includes try-catch with `showError` — this is the same pattern from both views. If a caller also wraps the call in try-catch (e.g., an inline event handler), errors get handled twice: once by the composable, once by the caller.

**How to avoid:** The composable handles errors internally (shows appropriate toast messages). Callers (Views) should NOT add their own try-catch around `setBgFromUrl`. This is a one-liner in the View: `const handleSetBg = (item: WallpaperItem): Promise<void> => setBgFromUrl(item)`. Document this convention.

## Code Examples

### DownloadResult Interface

Source: [VERIFIED: codebase analysis — both views return identical shapes]

```typescript
// To be defined in useWallpaperSetter.ts (or imported from types)
export interface DownloadResult {
  success: boolean
  filePath: string | null
  error: string | null
}
```

### View After Extraction (FavoritesPage.vue)

Source: [VERIFIED: source reading — FavoritesPage.vue lines 201-268]

```vue
<script setup lang="ts">
import {
  useWallpaperSetter,
  // ... other imports
} from '@/composables'

const { setWallpaper, downloadWallpaperFile, setBgFromUrl } = useWallpaperSetter()

// handleSetBg becomes a one-liner:
const handleSetBg = (imgItem: WallpaperItem): Promise<void> => {
  return setBgFromUrl(imgItem)
}
// downloadWallpaperFile function is completely removed
</script>
```

### View After Extraction (OnlineWallpaper.vue)

Source: [VERIFIED: source reading — OnlineWallpaper.vue lines 312-391]

```vue
<script setup lang="ts">
const { setWallpaper, downloadWallpaperFile, setBgFromUrl } = useWallpaperSetter()

// setBg becomes a one-liner:
const setBg = (imgItem: WallpaperItem): Promise<void> => {
  return setBgFromUrl(imgItem)
}
// downloadWallpaperFile function is completely removed
</script>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Duplicated `downloadWallpaperFile` in 2 views (~45 lines each) | Single copy in `useWallpaperSetter` | Phase 37 | Bug fixes to download logic now apply to both views automatically |
| Duplicated `setBg`/`handleSetBg` in 2 views (~16 lines each) | Single `setBgFromUrl` in composable | Phase 37 | Consistent error handling, one-line view integration |
| Raw return object `Promise<{success, filePath, error}>` (inline type) | Named `DownloadResult` interface | Phase 37 | Reusable, importable, documented type |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `useSettings()` can be called inside `useWallpaperSetter()` and works correctly with the shared Pinia store | Architecture Patterns | LOW — confirmed by reading useSettings.ts source, it reads from shared Pinia store |
| A2 | Neither view currently binds `loading` from `useWallpaperSetter` to any template UI | Common Pitfalls | LOW — confirmed by reading both views' templates and script sections |
| A3 | `downloadWallpaperFile` in both views is byte-for-byte identical | Summary | LOW — confirmed by reading both views line-by-line |
| A4 | `setBg` (OnlineWallpaper) and `handleSetBg` (FavoritesPage) are functionally identical | Summary | MEDIUM — same logic, but naming differs in event wiring; verify both use the same parameter convention |

## Open Questions

None — all decisions are locked in CONTEXT.md. The implementation path is clear.

## Environment Availability

Step 2.6: SKIPPED (no external dependencies — this phase modifies only in-repo TypeScript files; no new tools, runtimes, or services required).

## Validation Architecture

Skipped — `workflow.nyquist_validation` is explicitly set to `false` in `.planning/config.json`.

## Security Domain

Skipped — `security_enforcement` is not configured; this phase involves no authentication, session management, access control, cryptography, or input validation changes. The `electronClient.downloadWallpaper()` IPC call is unchanged and was already used by both views.

## Sources

### Primary (HIGH confidence)
- [VERIFIED: codebase reading] `src/views/FavoritesPage.vue` — full source of duplicate functions
- [VERIFIED: codebase reading] `src/views/OnlineWallpaper.vue` — full source of duplicate functions
- [VERIFIED: codebase reading] `src/composables/wallpaper/useWallpaperSetter.ts` — current composable structure
- [VERIFIED: codebase reading] `src/composables/settings/useSettings.ts` — settings composable API
- [VERIFIED: codebase reading] `src/clients/electron.client.ts` — `downloadWallpaper()` IPC method
- [VERIFIED: codebase reading] `src/composables/index.ts` — composable export barrel
- [VERIFIED: codebase reading] `src/types/index.ts` — WallpaperItem type definition
- [VERIFIED: codebase reading] `.planning/codebase/CONVENTIONS.md` — composable and naming conventions
- [VERIFIED: codebase reading] `.planning/phases/37-.../37-CONTEXT.md` — all 4 locked decisions

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all dependencies are in-repo; no external packages
- Architecture: HIGH — composable extension pattern is well-established in this codebase; confirmed by prior phases
- Pitfalls: HIGH — all risks identified through direct code reading and cross-referencing with composable patterns

**Research date:** 2026-05-02
**Valid until:** N/A (codebase-specific, no external version dependencies)
