---
name: wallpaper
description: "Skill for the Wallpaper area of wallhaven. 43 symbols across 11 files."
---

# Wallpaper

43 symbols | 11 files | Cohesion: 65%

## When to Use

- Working with code in `src/`
- Understanding how setWallpaper, downloadWallpaperFile, setBgFromUrl work
- Modifying wallpaper-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/composables/wallpaper/useWallpaperList.ts` | saveCustomParams, loadSavedParams, useWallpaperList, toPageData, isParamsChanged (+6) |
| `src/composables/download/useDownload.ts` | pauseDownload, cancelDownload, useDownload, addTask, startDownload |
| `src/composables/wallpaper/useWallpaperSelection.ts` | useWallpaperSelection, generateFilename, flattenWallpapers, clear, downloadSelected |
| `src/composables/wallpaper/useWallpaperSetter.ts` | setWallpaper, downloadWallpaperFile, setBgFromUrl, useWallpaperSetter |
| `src/composables/local/useLocalFiles.ts` | readDirectory, openFolder, deleteFile, useLocalFiles |
| `src/composables/wallpaper/useWallpaperDownload.ts` | useWallpaperDownload, generateFilename, download |
| `src/stores/modules/wallpaper/index.ts` | clearPageCache, getCachedPage, setCachedPage |
| `src/services/wallpaper.service.ts` | saveQueryParams, loadQueryParams |
| `src/repositories/wallpaper.repository.ts` | getQueryParams, setQueryParams |
| `src/composables/settings/useSettings.ts` | update, saveChanges |

## Entry Points

Start here when exploring this area:

- **`setWallpaper`** (Function) — `src/composables/wallpaper/useWallpaperSetter.ts:60`
- **`downloadWallpaperFile`** (Function) — `src/composables/wallpaper/useWallpaperSetter.ts:86`
- **`setBgFromUrl`** (Function) — `src/composables/wallpaper/useWallpaperSetter.ts:106`
- **`saveCustomParams`** (Function) — `src/composables/wallpaper/useWallpaperList.ts:259`
- **`loadSavedParams`** (Function) — `src/composables/wallpaper/useWallpaperList.ts:275`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `setWallpaper` | Function | `src/composables/wallpaper/useWallpaperSetter.ts` | 60 |
| `downloadWallpaperFile` | Function | `src/composables/wallpaper/useWallpaperSetter.ts` | 86 |
| `setBgFromUrl` | Function | `src/composables/wallpaper/useWallpaperSetter.ts` | 106 |
| `saveCustomParams` | Function | `src/composables/wallpaper/useWallpaperList.ts` | 259 |
| `loadSavedParams` | Function | `src/composables/wallpaper/useWallpaperList.ts` | 275 |
| `update` | Function | `src/composables/settings/useSettings.ts` | 85 |
| `saveChanges` | Function | `src/composables/settings/useSettings.ts` | 154 |
| `readDirectory` | Function | `src/composables/local/useLocalFiles.ts` | 53 |
| `openFolder` | Function | `src/composables/local/useLocalFiles.ts` | 67 |
| `deleteFile` | Function | `src/composables/local/useLocalFiles.ts` | 81 |
| `pauseDownload` | Function | `src/composables/download/useDownload.ts` | 249 |
| `cancelDownload` | Function | `src/composables/download/useDownload.ts` | 357 |
| `showError` | Function | `src/composables/core/useAlert.ts` | 107 |
| `useWallpaperSetter` | Function | `src/composables/wallpaper/useWallpaperSetter.ts` | 51 |
| `useWallpaperSelection` | Function | `src/composables/wallpaper/useWallpaperSelection.ts` | 83 |
| `useWallpaperList` | Function | `src/composables/wallpaper/useWallpaperList.ts` | 65 |
| `useWallpaperDownload` | Function | `src/composables/wallpaper/useWallpaperDownload.ts` | 53 |
| `useLocalFiles` | Function | `src/composables/local/useLocalFiles.ts` | 45 |
| `useDownload` | Function | `src/composables/download/useDownload.ts` | 71 |
| `useAlert` | Function | `src/composables/core/useAlert.ts` | 57 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `SetBgFromUrl → CreateErrorResponse` | cross_community | 6 |
| `Refresh → IsProduction` | cross_community | 5 |
| `Refresh → GetErrorCode` | cross_community | 5 |
| `Refresh → GetErrorMessage` | cross_community | 5 |
| `UpdateItemFavoriteStatus → CreateErrorResponse` | cross_community | 5 |
| `SetBgFromUrl → IsAvailable` | cross_community | 5 |
| `Fetch → IsProduction` | cross_community | 4 |
| `Fetch → GetErrorCode` | cross_community | 4 |
| `Fetch → GetErrorMessage` | cross_community | 4 |
| `DeleteCollection → ShowAlert` | cross_community | 4 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Services | 4 calls |
| Favorites | 2 calls |
| Download | 2 calls |
| Clients | 1 calls |
| Handlers | 1 calls |

## How to Explore

1. `gitnexus_context({name: "setWallpaper"})` — see callers and callees
2. `gitnexus_query({query: "wallpaper"})` — find related execution flows
3. Read key files listed above for implementation details
