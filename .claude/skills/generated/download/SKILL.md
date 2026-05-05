---
name: download
description: "Skill for the Download area of wallhaven. 17 symbols across 7 files."
---

# Download

17 symbols | 7 files | Cohesion: 76%

## When to Use

- Working with code in `src/`
- Understanding how useFavorites, useCollections, loadHistory work
- Modifying download-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/stores/modules/download/index.ts` | loadDownloadHistory, updateProgress, completeDownload, generateId, addDownloadTask |
| `src/composables/download/useDownload.ts` | loadHistory, restorePendingDownloads, handleProgress, resumeDownload |
| `src/composables/core/useAlert.ts` | showAlert, showWarning, showInfo |
| `src/services/download.service.ts` | getFinishedRecords, saveFinishedRecord |
| `src/main.ts` | initializeApp |
| `src/composables/favorites/useFavorites.ts` | useFavorites |
| `src/composables/favorites/useCollections.ts` | useCollections |

## Entry Points

Start here when exploring this area:

- **`useFavorites`** (Function) — `src/composables/favorites/useFavorites.ts:48`
- **`useCollections`** (Function) — `src/composables/favorites/useCollections.ts:29`
- **`loadHistory`** (Function) — `src/composables/download/useDownload.ts:416`
- **`restorePendingDownloads`** (Function) — `src/composables/download/useDownload.ts:428`
- **`loadDownloadHistory`** (Function) — `src/stores/modules/download/index.ts:36`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `useFavorites` | Function | `src/composables/favorites/useFavorites.ts` | 48 |
| `useCollections` | Function | `src/composables/favorites/useCollections.ts` | 29 |
| `loadHistory` | Function | `src/composables/download/useDownload.ts` | 416 |
| `restorePendingDownloads` | Function | `src/composables/download/useDownload.ts` | 428 |
| `loadDownloadHistory` | Function | `src/stores/modules/download/index.ts` | 36 |
| `handleProgress` | Function | `src/composables/download/useDownload.ts` | 88 |
| `updateProgress` | Function | `src/stores/modules/download/index.ts` | 66 |
| `completeDownload` | Function | `src/stores/modules/download/index.ts` | 85 |
| `resumeDownload` | Function | `src/composables/download/useDownload.ts` | 271 |
| `showAlert` | Function | `src/composables/core/useAlert.ts` | 72 |
| `showWarning` | Function | `src/composables/core/useAlert.ts` | 117 |
| `showInfo` | Function | `src/composables/core/useAlert.ts` | 127 |
| `generateId` | Function | `src/stores/modules/download/index.ts` | 29 |
| `addDownloadTask` | Function | `src/stores/modules/download/index.ts` | 46 |
| `initializeApp` | Function | `src/main.ts` | 66 |
| `getFinishedRecords` | Method | `src/services/download.service.ts` | 242 |
| `saveFinishedRecord` | Method | `src/services/download.service.ts` | 235 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `DeleteCollection → ShowAlert` | cross_community | 4 |
| `Refresh → ShowAlert` | cross_community | 4 |
| `Refresh → ShowAlert` | cross_community | 4 |
| `Create → ShowAlert` | cross_community | 4 |
| `Rename → ShowAlert` | cross_community | 4 |
| `SetDefault → ShowAlert` | cross_community | 4 |
| `SaveChanges → ShowAlert` | cross_community | 4 |
| `SetBgFromUrl → ShowAlert` | cross_community | 4 |
| `HandleProgress → ShowAlert` | cross_community | 3 |
| `Fetch → ShowAlert` | cross_community | 3 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Wallpaper | 5 calls |
| Settings | 1 calls |

## How to Explore

1. `gitnexus_context({name: "useFavorites"})` — see callers and callees
2. `gitnexus_query({query: "download"})` — find related execution flows
3. Read key files listed above for implementation details
