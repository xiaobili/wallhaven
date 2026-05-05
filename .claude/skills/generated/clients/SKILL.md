---
name: clients
description: "Skill for the Clients area of wallhaven. 57 symbols across 5 files."
---

# Clients

57 symbols | 5 files | Cohesion: 55%

## When to Use

- Working with code in `src/`
- Understanding how getHeartState work
- Modifying clients-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/clients/electron.client.ts` | isAvailable, storeClear, favoritesCreateCollection, favoritesDeleteCollection, favoritesGetByCollection (+37) |
| `src/services/download.service.ts` | constructor, registerProgressListener, pauseDownload, cancelDownload, simpleDownload (+1) |
| `src/clients/api.client.ts` | isProduction, getErrorCode, getErrorMessage, get, post |
| `src/repositories/window.repository.ts` | minimize, close, maximize |
| `src/utils/heart.ts` | getHeartState |

## Entry Points

Start here when exploring this area:

- **`getHeartState`** (Function) — `src/utils/heart.ts:27`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `getHeartState` | Function | `src/utils/heart.ts` | 27 |
| `constructor` | Method | `src/services/download.service.ts` | 42 |
| `registerProgressListener` | Method | `src/services/download.service.ts` | 52 |
| `pauseDownload` | Method | `src/services/download.service.ts` | 191 |
| `cancelDownload` | Method | `src/services/download.service.ts` | 199 |
| `minimize` | Method | `src/repositories/window.repository.ts` | 15 |
| `close` | Method | `src/repositories/window.repository.ts` | 29 |
| `isAvailable` | Method | `src/clients/electron.client.ts` | 34 |
| `storeClear` | Method | `src/clients/electron.client.ts` | 148 |
| `favoritesCreateCollection` | Method | `src/clients/electron.client.ts` | 200 |
| `favoritesDeleteCollection` | Method | `src/clients/electron.client.ts` | 250 |
| `favoritesGetByCollection` | Method | `src/clients/electron.client.ts` | 300 |
| `favoritesRemove` | Method | `src/clients/electron.client.ts` | 360 |
| `favoritesIsFavorite` | Method | `src/clients/electron.client.ts` | 418 |
| `favoritesGetPaginated` | Method | `src/clients/electron.client.ts` | 472 |
| `favoritesGetStatusMap` | Method | `src/clients/electron.client.ts` | 524 |
| `readDirectory` | Method | `src/clients/electron.client.ts` | 573 |
| `deleteFile` | Method | `src/clients/electron.client.ts` | 625 |
| `pauseDownloadTask` | Method | `src/clients/electron.client.ts` | 741 |
| `cancelDownloadTask` | Method | `src/clients/electron.client.ts` | 766 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `Enqueue → CreateErrorResponse` | cross_community | 8 |
| `Enqueue → IsAvailable` | cross_community | 7 |
| `Refresh → CreateErrorResponse` | cross_community | 7 |
| `RegisterDownloadHandlers → CreateErrorResponse` | cross_community | 6 |
| `ExecuteWithRetry → CreateErrorResponse` | cross_community | 6 |
| `SearchWallpapers → CreateErrorResponse` | cross_community | 6 |
| `Fetch → CreateErrorResponse` | cross_community | 6 |
| `Enqueue → IsProduction` | cross_community | 6 |
| `Enqueue → GetErrorCode` | cross_community | 6 |
| `LoadMore → CreateErrorResponse` | cross_community | 6 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Services | 1 calls |

## How to Explore

1. `gitnexus_context({name: "getHeartState"})` — see callers and callees
2. `gitnexus_query({query: "clients"})` — find related execution flows
3. Read key files listed above for implementation details
