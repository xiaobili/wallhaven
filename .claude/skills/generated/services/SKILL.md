---
name: services
description: "Skill for the Services area of wallhaven. 57 symbols across 11 files."
---

# Services

57 symbols | 11 files | Cohesion: 98%

## When to Use

- Working with code in `src/`
- Understanding how load, update, reset work
- Modifying services-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/services/download.service.ts` | getDownloadPath, startDownload, resumeDownload, cleanupOrphanFiles, constructor (+7) |
| `src/composables/download/useDownload.ts` | startDownload, resumeDownload, cleanupOrphanFiles, pauseDownload, cancelDownload (+4) |
| `src/services/settings.service.ts` | get, set, update, getDefaults, reset (+3) |
| `src/services/wallpaperApi.ts` | generateCacheKey, getFromCache, setCache, isProduction, callWallhavenAPIViaIPC (+3) |
| `src/composables/settings/useSettings.ts` | load, update, reset, saveChanges, selectFolder |
| `src/services/window.service.ts` | minimize, maximize, close, isMaximized |
| `src/repositories/window.repository.ts` | minimize, maximize, close, isMaximized |
| `src/services/wallpaper.service.ts` | saveQueryParams, loadQueryParams |
| `src/composables/wallpaper/useWallpaperList.ts` | saveCustomParams, loadSavedParams |
| `src/composables/local/useLocalFiles.ts` | openFolder, deleteFile |

## Entry Points

Start here when exploring this area:

- **`load`** (Function) — `src/composables/settings/useSettings.ts:66`
- **`update`** (Function) — `src/composables/settings/useSettings.ts:85`
- **`reset`** (Function) — `src/composables/settings/useSettings.ts:104`
- **`saveChanges`** (Function) — `src/composables/settings/useSettings.ts:154`
- **`loadSettings`** (Function) — `src/stores/modules/wallpaper/index.ts:131`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `load` | Function | `src/composables/settings/useSettings.ts` | 66 |
| `update` | Function | `src/composables/settings/useSettings.ts` | 85 |
| `reset` | Function | `src/composables/settings/useSettings.ts` | 104 |
| `saveChanges` | Function | `src/composables/settings/useSettings.ts` | 154 |
| `loadSettings` | Function | `src/stores/modules/wallpaper/index.ts` | 131 |
| `cancelCurrentRequest` | Function | `src/services/wallpaperApi.ts` | 188 |
| `searchWallpapers` | Function | `src/services/wallpaperApi.ts` | 200 |
| `getWallpaperDetail` | Function | `src/services/wallpaperApi.ts` | 249 |
| `startDownload` | Function | `src/composables/download/useDownload.ts` | 223 |
| `resumeDownload` | Function | `src/composables/download/useDownload.ts` | 272 |
| `cleanupOrphanFiles` | Function | `src/composables/download/useDownload.ts` | 485 |
| `saveCustomParams` | Function | `src/composables/wallpaper/useWallpaperList.ts` | 343 |
| `loadSavedParams` | Function | `src/composables/wallpaper/useWallpaperList.ts` | 359 |
| `selectFolder` | Function | `src/composables/settings/useSettings.ts` | 175 |
| `pauseDownload` | Function | `src/composables/download/useDownload.ts` | 250 |
| `cancelDownload` | Function | `src/composables/download/useDownload.ts` | 358 |
| `restorePendingDownloads` | Function | `src/composables/download/useDownload.ts` | 429 |
| `handleProgress` | Function | `src/composables/download/useDownload.ts` | 89 |
| `removeFinished` | Function | `src/composables/download/useDownload.ts` | 385 |
| `clearFinished` | Function | `src/composables/download/useDownload.ts` | 400 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `GetWallpaperDetail → CreateDefaultSettings` | cross_community | 4 |
| `SaveChanges → Get` | intra_community | 4 |
| `SaveChanges → GetDefaults` | intra_community | 4 |
| `SaveChanges → Set` | intra_community | 4 |
| `SetBgFromUrl → GetDownloadPath` | cross_community | 4 |
| `Reset → Set` | intra_community | 3 |
| `Reset → GetDefaults` | intra_community | 3 |
| `UseSettings → GetDefaults` | cross_community | 3 |
| `CleanupOrphanFiles → GetDownloadPath` | intra_community | 3 |
| `StartDownload → GetDownloadPath` | intra_community | 3 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Wallpaper | 1 calls |

## How to Explore

1. `gitnexus_context({name: "load"})` — see callers and callees
2. `gitnexus_query({query: "services"})` — find related execution flows
3. Read key files listed above for implementation details
