---
name: main
description: "Skill for the Main area of wallhaven. 6 symbols across 2 files."
---

# Main

6 symbols | 2 files | Cohesion: 71%

## When to Use

- Working with code in `electron/`
- Understanding how runMigration, getDatabase work
- Modifying main-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `electron/main/database.ts` | getDbPath, initializeSchema, startPeriodicCheckpoint, startWalMonitor, getDatabase |
| `electron/main/migration.ts` | runMigration |

## Entry Points

Start here when exploring this area:

- **`runMigration`** (Function) — `electron/main/migration.ts:48`
- **`getDatabase`** (Function) — `electron/main/database.ts:173`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `runMigration` | Function | `electron/main/migration.ts` | 48 |
| `getDatabase` | Function | `electron/main/database.ts` | 173 |
| `getDbPath` | Function | `electron/main/database.ts` | 33 |
| `initializeSchema` | Function | `electron/main/database.ts` | 62 |
| `startPeriodicCheckpoint` | Function | `electron/main/database.ts` | 124 |
| `startWalMonitor` | Function | `electron/main/database.ts` | 146 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `RegisterDownloadHandlers → GetDbPath` | cross_community | 7 |
| `RegisterDownloadHandlers → InitializeSchema` | cross_community | 7 |
| `RegisterDownloadHandlers → RunMigration` | cross_community | 7 |
| `RegisterDownloadHandlers → StartPeriodicCheckpoint` | cross_community | 7 |
| `RegisterStoreHandlers → GetDbPath` | cross_community | 4 |
| `RegisterStoreHandlers → InitializeSchema` | cross_community | 4 |
| `RegisterStoreHandlers → RunMigration` | cross_community | 4 |
| `RegisterStoreHandlers → StartPeriodicCheckpoint` | cross_community | 4 |
| `RegisterFavoritesHandlers → GetDbPath` | cross_community | 4 |
| `RegisterFavoritesHandlers → InitializeSchema` | cross_community | 4 |

## How to Explore

1. `gitnexus_context({name: "runMigration"})` — see callers and callees
2. `gitnexus_query({query: "main"})` — find related execution flows
3. Read key files listed above for implementation details
