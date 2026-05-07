---
name: handlers
description: "Skill for the Handlers area of wallhaven. 39 symbols across 14 files."
---

# Handlers

39 symbols | 14 files | Cohesion: 78%

## When to Use

- Working with code in `electron/`
- Understanding how createErrorResponse, withTransaction, registerWindowHandlers work
- Modifying handlers-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `electron/main/ipc/handlers/download.handler.ts` | getStateFilePath, writeStateFile, readStateFile, shouldPersistState, cleanupDownload (+8) |
| `electron/main/ipc/handlers/download-queue.ts` | remove, clear, getQueueInstance, has, enqueue (+2) |
| `electron/main/database.ts` | withTransaction, getAppSetting, getDownloadPath, getMaxConcurrentDownloads |
| `electron/main/ipc/handlers/base.ts` | getImageDimensions, generateThumbnail, logHandler |
| `electron/main/ipc/handlers/store.handler.ts` | keyToTable, registerStoreHandlers |
| `src/types/ipc.ts` | isResumeDownloadParams, isPendingDownload |
| `src/errors/index.ts` | createErrorResponse |
| `electron/main/ipc/handlers/window.handler.ts` | registerWindowHandlers |
| `electron/main/ipc/handlers/wallpaper.handler.ts` | registerWallpaperHandlers |
| `electron/main/ipc/handlers/index.ts` | registerAllHandlers |

## Entry Points

Start here when exploring this area:

- **`createErrorResponse`** (Function) — `src/errors/index.ts:61`
- **`withTransaction`** (Function) — `electron/main/database.ts:245`
- **`registerWindowHandlers`** (Function) — `electron/main/ipc/handlers/window.handler.ts:6`
- **`registerWallpaperHandlers`** (Function) — `electron/main/ipc/handlers/wallpaper.handler.ts:9`
- **`registerStoreHandlers`** (Function) — `electron/main/ipc/handlers/store.handler.ts:41`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `createErrorResponse` | Function | `src/errors/index.ts` | 61 |
| `withTransaction` | Function | `electron/main/database.ts` | 245 |
| `registerWindowHandlers` | Function | `electron/main/ipc/handlers/window.handler.ts` | 6 |
| `registerWallpaperHandlers` | Function | `electron/main/ipc/handlers/wallpaper.handler.ts` | 9 |
| `registerStoreHandlers` | Function | `electron/main/ipc/handlers/store.handler.ts` | 41 |
| `registerAllHandlers` | Function | `electron/main/ipc/handlers/index.ts` | 69 |
| `registerFileHandlers` | Function | `electron/main/ipc/handlers/file.handler.ts` | 13 |
| `registerFavoritesHandlers` | Function | `electron/main/ipc/handlers/favorites.handler.ts` | 13 |
| `getQueueInstance` | Function | `electron/main/ipc/handlers/download-queue.ts` | 189 |
| `registerCacheHandlers` | Function | `electron/main/ipc/handlers/cache.handler.ts` | 12 |
| `getImageDimensions` | Function | `electron/main/ipc/handlers/base.ts` | 18 |
| `generateThumbnail` | Function | `electron/main/ipc/handlers/base.ts` | 40 |
| `logHandler` | Function | `electron/main/ipc/handlers/base.ts` | 85 |
| `registerApiHandlers` | Function | `electron/main/ipc/handlers/api.handler.ts` | 12 |
| `isResumeDownloadParams` | Function | `src/types/ipc.ts` | 425 |
| `isPendingDownload` | Function | `src/types/ipc.ts` | 442 |
| `executeDownload` | Function | `electron/main/ipc/handlers/download.handler.ts` | 317 |
| `registerDownloadHandlers` | Function | `electron/main/ipc/handlers/download.handler.ts` | 721 |
| `getAppSetting` | Function | `electron/main/database.ts` | 263 |
| `getDownloadPath` | Function | `electron/main/database.ts` | 285 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `RegisterDownloadHandlers → _getActiveCount` | cross_community | 4 |
| `RegisterDownloadHandlers → _onDequeue` | cross_community | 4 |
| `RegisterAllHandlers → Has` | cross_community | 4 |
| `RegisterAllHandlers → _emitProgress` | cross_community | 4 |
| `RegisterAllHandlers → LogHandler` | cross_community | 4 |
| `RegisterAllHandlers → _getActiveCount` | cross_community | 4 |
| `RegisterFavoritesHandlers → GetDbPath` | cross_community | 4 |
| `RegisterFavoritesHandlers → InitializeSchema` | cross_community | 4 |
| `RegisterFavoritesHandlers → RunMigration` | cross_community | 4 |
| `RegisterFavoritesHandlers → StartPeriodicCheckpoint` | cross_community | 4 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Main | 4 calls |

## How to Explore

1. `gitnexus_context({name: "createErrorResponse"})` — see callers and callees
2. `gitnexus_query({query: "handlers"})` — find related execution flows
3. Read key files listed above for implementation details
