---
phase: 38-downloadwallpaperfile-layer-refactor-dedup
plan: 02
completed: 2026-05-02
status: complete
tasks:
  - task: 1
    name: Add simpleDownload() method to DownloadService
    status: complete
  - task: 2
    name: Refactor useWallpaperSetter.downloadWallpaperFile to delegate to service
    status: complete
---

# Plan 38-02 Summary: simpleDownload service method + composable delegation

## Objective
Add `simpleDownload()` method to `DownloadService` with path resolution (reusing `getDownloadPath()`), duplicate detection (using `electronClient.fileExists()`), and transparent return for existing files. Then refactor `useWallpaperSetter.downloadWallpaperFile()` to delegate to the service.

## Changes Made

### 1. src/services/download.service.ts
- Added `simpleDownload(url, filename)` public method with:
  - **Path resolution**: Reuses `getDownloadPath()` to resolve the download directory
  - **Duplicate detection**: Constructs full target path, checks via `electronClient.fileExists()`
  - **Transparent return**: When file exists, returns existing path with `{ success: true, data: fullPath }` — no user notification
  - **Download execution**: Calls `electronClient.downloadWallpaper({ url, filename, saveDir })`

### 2. src/composables/wallpaper/useWallpaperSetter.ts
- Added `downloadService` to imports from `@/services`
- Removed `useSettings` import (no longer needed for path resolution)
- Replaced `downloadWallpaperFile` body to delegate entirely to `downloadService.simpleDownload()`
- Removed: direct `electronClient` dynamic import, path resolution logic, folder selection, settings update
- Preserved: filename generation, `DownloadResult` return type, `setBgFromUrl` flow

## Layer Architecture After Refactor
```
View → useWallpaperSetter.downloadWallpaperFile()
         → downloadService.simpleDownload()
              → getDownloadPath() [path resolution]
              → electronClient.fileExists() [duplicate detection]
              → electronClient.downloadWallpaper() [download]
```

## Verification
- Type-check: passed
- All acceptance criteria met (verified via grep)
- `simpleDownload` exported via `downloadService` (existing re-export from `src/services/index.ts`)

## Self-Check: PASSED
