---
name: clients
description: "Skill for the Clients area of wallhaven. 56 symbols across 10 files."
---

# Clients

56 symbols | 10 files | Cohesion: 95%

## When to Use

- Working with code in `src/`
- Understanding how BaseClient, isAvailable, createErrorResponse work
- Modifying clients-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/clients/favorites.client.ts` | getCollections, createCollection, renameCollection, deleteCollection, setDefaultCollection (+10) |
| `src/clients/download.client.ts` | downloadWallpaper, startTask, pauseTask, cancelTask, resumeTask (+4) |
| `src/clients/file.client.ts` | selectFolder, readDirectory, openFolder, deleteFile, fileExists (+1) |
| `src/clients/window.client.ts` | minimize, maximize, close, isMaximized, WindowClientImpl |
| `src/clients/base.client.ts` | isAvailable, createErrorResponse, createUnavailableResponse, safeCall, BaseClient |
| `src/clients/api.client.ts` | isProduction, getErrorCode, getErrorMessage, get, post |
| `src/clients/store.client.ts` | get, delete, clear, StoreClientImpl |
| `src/clients/cache.client.ts` | clear, getInfo, cleanupOrphanFiles, CacheClientImpl |
| `src/clients/wallpaper.client.ts` | set, WallpaperClientImpl |
| `src/services/download.service.ts` | simpleDownload |

## Entry Points

Start here when exploring this area:

- **`BaseClient`** (Class) — `src/clients/base.client.ts:12`
- **`isAvailable`** (Method) — `src/clients/base.client.ts:16`
- **`createErrorResponse`** (Method) — `src/clients/base.client.ts:23`
- **`createUnavailableResponse`** (Method) — `src/clients/base.client.ts:33`
- **`safeCall`** (Method) — `src/clients/base.client.ts:41`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `BaseClient` | Class | `src/clients/base.client.ts` | 12 |
| `isAvailable` | Method | `src/clients/base.client.ts` | 16 |
| `createErrorResponse` | Method | `src/clients/base.client.ts` | 23 |
| `createUnavailableResponse` | Method | `src/clients/base.client.ts` | 33 |
| `safeCall` | Method | `src/clients/base.client.ts` | 41 |
| `WindowClientImpl` | Class | `src/clients/window.client.ts` | 11 |
| `WallpaperClientImpl` | Class | `src/clients/wallpaper.client.ts` | 11 |
| `StoreClientImpl` | Class | `src/clients/store.client.ts` | 12 |
| `FileClientImpl` | Class | `src/clients/file.client.ts` | 11 |
| `FavoritesClientImpl` | Class | `src/clients/favorites.client.ts` | 22 |
| `DownloadClientImpl` | Class | `src/clients/download.client.ts` | 16 |
| `CacheClientImpl` | Class | `src/clients/cache.client.ts` | 11 |
| `simpleDownload` | Method | `src/services/download.service.ts` | 136 |
| `minimize` | Method | `src/clients/window.client.ts` | 15 |
| `maximize` | Method | `src/clients/window.client.ts` | 34 |
| `close` | Method | `src/clients/window.client.ts` | 53 |
| `isMaximized` | Method | `src/clients/window.client.ts` | 72 |
| `set` | Method | `src/clients/wallpaper.client.ts` | 15 |
| `get` | Method | `src/clients/store.client.ts` | 16 |
| `delete` | Method | `src/clients/store.client.ts` | 76 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `SetBgFromUrl → CreateErrorResponse` | cross_community | 6 |
| `ExecuteWithRetry → CreateErrorResponse` | cross_community | 5 |
| `Refresh → IsProduction` | cross_community | 5 |
| `Refresh → GetErrorCode` | cross_community | 5 |
| `Refresh → GetErrorMessage` | cross_community | 5 |
| `UpdateItemFavoriteStatus → CreateErrorResponse` | cross_community | 5 |
| `WaitWithBackoff → CreateErrorResponse` | cross_community | 5 |
| `SetBgFromUrl → IsAvailable` | cross_community | 5 |
| `ExecuteWithRetry → IsAvailable` | cross_community | 4 |
| `Fetch → IsProduction` | cross_community | 4 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Services | 1 calls |

## How to Explore

1. `gitnexus_context({name: "BaseClient"})` — see callers and callees
2. `gitnexus_query({query: "clients"})` — find related execution flows
3. Read key files listed above for implementation details
