---
name: wallpaper
description: "Skill for the Wallpaper area of wallhaven. 35 symbols across 10 files."
---

# Wallpaper

35 symbols | 10 files | Cohesion: 65%

## When to Use

- Working with code in `src/`
- Understanding how setWallpaper, downloadWallpaperFile, setBgFromUrl work
- Modifying wallpaper-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/composables/wallpaper/useWallpaperList.ts` | saveCustomParams, loadSavedParams, useWallpaperList, toPageData, isParamsChanged (+6) |
| `src/composables/wallpaper/useWallpaperSetter.ts` | setWallpaper, downloadWallpaperFile, setBgFromUrl, useWallpaperSetter |
| `src/composables/local/useLocalFiles.ts` | readDirectory, openFolder, deleteFile, useLocalFiles |
| `src/composables/download/useDownload.ts` | startDownload, pauseDownload, cancelDownload, useDownload |
| `src/stores/modules/wallpaper/index.ts` | clearPageCache, getCachedPage, setCachedPage |
| `src/services/wallpaper.service.ts` | saveQueryParams, loadQueryParams |
| `src/repositories/wallpaper.repository.ts` | getQueryParams, setQueryParams |
| `src/composables/settings/useSettings.ts` | update, saveChanges |
| `src/composables/core/useAlert.ts` | showError, useAlert |
| `src/services/download.service.ts` | onProgress |

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
| `startDownload` | Function | `src/composables/download/useDownload.ts` | 222 |
| `pauseDownload` | Function | `src/composables/download/useDownload.ts` | 249 |
| `cancelDownload` | Function | `src/composables/download/useDownload.ts` | 357 |
| `showError` | Function | `src/composables/core/useAlert.ts` | 107 |
| `useWallpaperSetter` | Function | `src/composables/wallpaper/useWallpaperSetter.ts` | 51 |
| `useWallpaperList` | Function | `src/composables/wallpaper/useWallpaperList.ts` | 65 |
| `useLocalFiles` | Function | `src/composables/local/useLocalFiles.ts` | 45 |
| `useDownload` | Function | `src/composables/download/useDownload.ts` | 71 |
| `useAlert` | Function | `src/composables/core/useAlert.ts` | 57 |
| `isParamsChanged` | Function | `src/composables/wallpaper/useWallpaperList.ts` | 75 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `Fetch → CreateErrorResponse` | cross_community | 6 |
| `LoadMore → CreateErrorResponse` | cross_community | 6 |
| `GoToPage → CreateErrorResponse` | cross_community | 6 |
| `Refresh → IsAvailable` | cross_community | 6 |
| `UpdateItemFavoriteStatus → CreateErrorResponse` | cross_community | 6 |
| `SetBgFromUrl → CreateErrorResponse` | cross_community | 6 |
| `Fetch → IsAvailable` | cross_community | 5 |
| `LoadMore → IsAvailable` | cross_community | 5 |
| `GoToPage → IsAvailable` | cross_community | 5 |
| `Refresh → IsProduction` | cross_community | 5 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Favorites | 3 calls |
| Services | 3 calls |
| Clients | 2 calls |
| Download | 1 calls |
| Handlers | 1 calls |

## How to Explore

1. `gitnexus_context({name: "setWallpaper"})` — see callers and callees
2. `gitnexus_query({query: "wallpaper"})` — find related execution flows
3. Read key files listed above for implementation details
