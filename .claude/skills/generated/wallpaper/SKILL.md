---
name: wallpaper
description: "Skill for the Wallpaper area of wallhaven. 28 symbols across 10 files."
---

# Wallpaper

28 symbols | 10 files | Cohesion: 87%

## When to Use

- Working with code in `src/`
- Understanding how isParamsChanged, fetch, goToPage work
- Modifying wallpaper-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/composables/wallpaper/useWallpaperList.ts` | toPageData, isParamsChanged, fetch, goToPage, loadMore (+2) |
| `src/composables/wallpaper/useWallpaperSelection.ts` | useWallpaperSelection, generateFilename, flattenWallpapers, clear, downloadSelected |
| `src/composables/wallpaper/useWallpaperSetter.ts` | setWallpaper, downloadWallpaperFile, setBgFromUrl |
| `src/composables/wallpaper/useWallpaperDownload.ts` | useWallpaperDownload, generateFilename, download |
| `src/services/wallpaper.service.ts` | search, setWallpaper |
| `src/services/download.service.ts` | simpleDownload, onProgress |
| `src/composables/settings/useSettings.ts` | useSettings, getDefaults |
| `src/stores/modules/wallpaper/index.ts` | createDefaultSettings, useWallpaperStore |
| `src/composables/download/useDownload.ts` | useDownload |
| `src/stores/modules/download/index.ts` | useDownloadStore |

## Entry Points

Start here when exploring this area:

- **`isParamsChanged`** (Function) — `src/composables/wallpaper/useWallpaperList.ts:78`
- **`fetch`** (Function) — `src/composables/wallpaper/useWallpaperList.ts:87`
- **`goToPage`** (Function) — `src/composables/wallpaper/useWallpaperList.ts:159`
- **`loadMore`** (Function) — `src/composables/wallpaper/useWallpaperList.ts:237`
- **`refresh`** (Function) — `src/composables/wallpaper/useWallpaperList.ts:319`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `isParamsChanged` | Function | `src/composables/wallpaper/useWallpaperList.ts` | 78 |
| `fetch` | Function | `src/composables/wallpaper/useWallpaperList.ts` | 87 |
| `goToPage` | Function | `src/composables/wallpaper/useWallpaperList.ts` | 159 |
| `loadMore` | Function | `src/composables/wallpaper/useWallpaperList.ts` | 237 |
| `refresh` | Function | `src/composables/wallpaper/useWallpaperList.ts` | 319 |
| `setWallpaper` | Function | `src/composables/wallpaper/useWallpaperSetter.ts` | 60 |
| `downloadWallpaperFile` | Function | `src/composables/wallpaper/useWallpaperSetter.ts` | 86 |
| `setBgFromUrl` | Function | `src/composables/wallpaper/useWallpaperSetter.ts` | 106 |
| `useWallpaperSelection` | Function | `src/composables/wallpaper/useWallpaperSelection.ts` | 97 |
| `useWallpaperDownload` | Function | `src/composables/wallpaper/useWallpaperDownload.ts` | 51 |
| `useDownload` | Function | `src/composables/download/useDownload.ts` | 72 |
| `useDownloadStore` | Function | `src/stores/modules/download/index.ts` | 5 |
| `useWallpaperList` | Function | `src/composables/wallpaper/useWallpaperList.ts` | 65 |
| `useSettings` | Function | `src/composables/settings/useSettings.ts` | 57 |
| `getDefaults` | Function | `src/composables/settings/useSettings.ts` | 123 |
| `useWallpaperStore` | Function | `src/stores/modules/wallpaper/index.ts` | 27 |
| `flattenWallpapers` | Function | `src/composables/wallpaper/useWallpaperSelection.ts` | 72 |
| `clear` | Function | `src/composables/wallpaper/useWallpaperSelection.ts` | 144 |
| `downloadSelected` | Function | `src/composables/wallpaper/useWallpaperSelection.ts` | 158 |
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
| Favorites | 3 calls |
| Clients | 2 calls |
| Services | 2 calls |

## How to Explore

1. `gitnexus_context({name: "isParamsChanged"})` — see callers and callees
2. `gitnexus_query({query: "wallpaper"})` — find related execution flows
3. Read key files listed above for implementation details
