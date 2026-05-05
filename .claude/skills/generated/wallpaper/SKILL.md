---
name: wallpaper
description: "Skill for the Wallpaper area of wallhaven. 26 symbols across 10 files."
---

# Wallpaper

26 symbols | 10 files | Cohesion: 82%

## When to Use

- Working with code in `src/`
- Understanding how isParamsChanged, fetch, goToPage work
- Modifying wallpaper-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/composables/wallpaper/useWallpaperList.ts` | toPageData, isParamsChanged, fetch, goToPage, loadMore (+2) |
| `src/composables/wallpaper/useWallpaperSelection.ts` | useWallpaperSelection, generateFilename, flattenWallpapers, clear, downloadSelected |
| `src/composables/wallpaper/useWallpaperDownload.ts` | useWallpaperDownload, generateFilename, download |
| `src/composables/wallpaper/useWallpaperSetter.ts` | setWallpaper, downloadWallpaperFile, setBgFromUrl |
| `src/composables/settings/useSettings.ts` | useSettings, getDefaults |
| `src/stores/modules/wallpaper/index.ts` | createDefaultSettings, useWallpaperStore |
| `src/services/download.service.ts` | onProgress |
| `src/composables/download/useDownload.ts` | useDownload |
| `src/stores/modules/download/index.ts` | useDownloadStore |
| `src/services/wallpaper.service.ts` | setWallpaper |

## Entry Points

Start here when exploring this area:

- **`isParamsChanged`** (Function) — `src/composables/wallpaper/useWallpaperList.ts:75`
- **`fetch`** (Function) — `src/composables/wallpaper/useWallpaperList.ts:84`
- **`goToPage`** (Function) — `src/composables/wallpaper/useWallpaperList.ts:127`
- **`loadMore`** (Function) — `src/composables/wallpaper/useWallpaperList.ts:179`
- **`refresh`** (Function) — `src/composables/wallpaper/useWallpaperList.ts:235`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `isParamsChanged` | Function | `src/composables/wallpaper/useWallpaperList.ts` | 75 |
| `fetch` | Function | `src/composables/wallpaper/useWallpaperList.ts` | 84 |
| `goToPage` | Function | `src/composables/wallpaper/useWallpaperList.ts` | 127 |
| `loadMore` | Function | `src/composables/wallpaper/useWallpaperList.ts` | 179 |
| `refresh` | Function | `src/composables/wallpaper/useWallpaperList.ts` | 235 |
| `useWallpaperSelection` | Function | `src/composables/wallpaper/useWallpaperSelection.ts` | 83 |
| `useWallpaperDownload` | Function | `src/composables/wallpaper/useWallpaperDownload.ts` | 51 |
| `useDownload` | Function | `src/composables/download/useDownload.ts` | 71 |
| `useDownloadStore` | Function | `src/stores/modules/download/index.ts` | 5 |
| `useWallpaperList` | Function | `src/composables/wallpaper/useWallpaperList.ts` | 65 |
| `useSettings` | Function | `src/composables/settings/useSettings.ts` | 57 |
| `getDefaults` | Function | `src/composables/settings/useSettings.ts` | 123 |
| `useWallpaperStore` | Function | `src/stores/modules/wallpaper/index.ts` | 17 |
| `setWallpaper` | Function | `src/composables/wallpaper/useWallpaperSetter.ts` | 60 |
| `downloadWallpaperFile` | Function | `src/composables/wallpaper/useWallpaperSetter.ts` | 86 |
| `setBgFromUrl` | Function | `src/composables/wallpaper/useWallpaperSetter.ts` | 106 |
| `flattenWallpapers` | Function | `src/composables/wallpaper/useWallpaperSelection.ts` | 61 |
| `clear` | Function | `src/composables/wallpaper/useWallpaperSelection.ts` | 126 |
| `downloadSelected` | Function | `src/composables/wallpaper/useWallpaperSelection.ts` | 140 |
| `download` | Function | `src/composables/wallpaper/useWallpaperDownload.ts` | 57 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `Refresh → IsProduction` | cross_community | 5 |
| `Refresh → GetErrorCode` | cross_community | 5 |
| `Refresh → GetErrorMessage` | cross_community | 5 |
| `Fetch → IsProduction` | cross_community | 4 |
| `Fetch → GetErrorCode` | cross_community | 4 |
| `Fetch → GetErrorMessage` | cross_community | 4 |
| `LoadMore → IsProduction` | cross_community | 4 |
| `LoadMore → GetErrorCode` | cross_community | 4 |
| `LoadMore → GetErrorMessage` | cross_community | 4 |
| `GetWallpaperDetail → CreateDefaultSettings` | cross_community | 4 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Services | 5 calls |
| Favorites | 4 calls |

## How to Explore

1. `gitnexus_context({name: "isParamsChanged"})` — see callers and callees
2. `gitnexus_query({query: "wallpaper"})` — find related execution flows
3. Read key files listed above for implementation details
