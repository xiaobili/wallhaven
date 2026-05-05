---
name: services
description: "Skill for the Services area of wallhaven. 80 symbols across 14 files."
---

# Services

80 symbols | 14 files | Cohesion: 95%

## When to Use

- Working with code in `src/`
- Understanding how load, update, reset work
- Modifying services-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/services/download.service.ts` | getDownloadPath, simpleDownload, startDownload, resumeDownload, cleanupOrphanFiles (+8) |
| `src/services/settings.service.ts` | get, set, update, getDefaults, reset (+4) |
| `src/composables/download/useDownload.ts` | startDownload, resumeDownload, cleanupOrphanFiles, pauseDownload, cancelDownload (+4) |
| `src/services/wallpaperApi.ts` | generateCacheKey, getFromCache, setCache, isProduction, callWallhavenAPIViaIPC (+3) |
| `src/services/wallpaper.service.ts` | generateCacheKey, getFromCache, setCache, getApiKey, search (+3) |
| `src/services/collections.service.ts` | create, rename, setDefault, clearCache, getAll (+2) |
| `src/composables/settings/useSettings.ts` | load, update, reset, saveChanges, selectFolder |
| `src/composables/favorites/useCollections.ts` | load, create, rename, setDefault |
| `src/services/window.service.ts` | minimize, maximize, close, isMaximized |
| `src/repositories/window.repository.ts` | minimize, maximize, close, isMaximized |

## Entry Points

Start here when exploring this area:

- **`load`** (Function) — `src/composables/settings/useSettings.ts:66`
- **`update`** (Function) — `src/composables/settings/useSettings.ts:85`
- **`reset`** (Function) — `src/composables/settings/useSettings.ts:104`
- **`saveChanges`** (Function) — `src/composables/settings/useSettings.ts:154`
- **`loadSettings`** (Function) — `src/stores/modules/wallpaper/index.ts:110`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `load` | Function | `src/composables/settings/useSettings.ts` | 66 |
| `update` | Function | `src/composables/settings/useSettings.ts` | 85 |
| `reset` | Function | `src/composables/settings/useSettings.ts` | 104 |
| `saveChanges` | Function | `src/composables/settings/useSettings.ts` | 154 |
| `loadSettings` | Function | `src/stores/modules/wallpaper/index.ts` | 110 |
| `cancelCurrentRequest` | Function | `src/services/wallpaperApi.ts` | 188 |
| `searchWallpapers` | Function | `src/services/wallpaperApi.ts` | 200 |
| `getWallpaperDetail` | Function | `src/services/wallpaperApi.ts` | 249 |
| `startDownload` | Function | `src/composables/download/useDownload.ts` | 222 |
| `resumeDownload` | Function | `src/composables/download/useDownload.ts` | 271 |
| `cleanupOrphanFiles` | Function | `src/composables/download/useDownload.ts` | 484 |
| `load` | Function | `src/composables/favorites/useCollections.ts` | 33 |
| `create` | Function | `src/composables/favorites/useCollections.ts` | 40 |
| `rename` | Function | `src/composables/favorites/useCollections.ts` | 51 |
| `setDefault` | Function | `src/composables/favorites/useCollections.ts` | 81 |
| `loadCollections` | Function | `src/stores/modules/favorites/index.ts` | 78 |
| `loadAll` | Function | `src/stores/modules/favorites/index.ts` | 88 |
| `loadCounts` | Function | `src/stores/modules/favorites/index.ts` | 95 |
| `saveCustomParams` | Function | `src/composables/wallpaper/useWallpaperList.ts` | 259 |
| `loadSavedParams` | Function | `src/composables/wallpaper/useWallpaperList.ts` | 275 |

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
| Clients | 2 calls |
| Wallpaper | 1 calls |
| Favorites | 1 calls |

## How to Explore

1. `gitnexus_context({name: "load"})` — see callers and callees
2. `gitnexus_query({query: "services"})` — find related execution flows
3. Read key files listed above for implementation details
