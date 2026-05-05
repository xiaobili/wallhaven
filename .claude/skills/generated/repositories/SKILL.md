---
name: repositories
description: "Skill for the Repositories area of wallhaven. 13 symbols across 2 files."
---

# Repositories

13 symbols | 2 files | Cohesion: 100%

## When to Use

- Working with code in `src/`
- Understanding how createCollection, renameCollection, deleteCollection work
- Modifying repositories-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/repositories/favorites.repository.ts` | createError, createCollection, renameCollection, deleteCollection, setDefaultCollection (+3) |
| `src/repositories/download.repository.ts` | withSerialAccess, get, set, add, remove |

## Entry Points

Start here when exploring this area:

- **`createCollection`** (Method) — `src/repositories/favorites.repository.ts:47`
- **`renameCollection`** (Method) — `src/repositories/favorites.repository.ts:61`
- **`deleteCollection`** (Method) — `src/repositories/favorites.repository.ts:80`
- **`setDefaultCollection`** (Method) — `src/repositories/favorites.repository.ts:97`
- **`addFavorite`** (Method) — `src/repositories/favorites.repository.ts:131`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `createCollection` | Method | `src/repositories/favorites.repository.ts` | 47 |
| `renameCollection` | Method | `src/repositories/favorites.repository.ts` | 61 |
| `deleteCollection` | Method | `src/repositories/favorites.repository.ts` | 80 |
| `setDefaultCollection` | Method | `src/repositories/favorites.repository.ts` | 97 |
| `addFavorite` | Method | `src/repositories/favorites.repository.ts` | 131 |
| `removeFavorite` | Method | `src/repositories/favorites.repository.ts` | 153 |
| `moveFavorite` | Method | `src/repositories/favorites.repository.ts` | 166 |
| `get` | Method | `src/repositories/download.repository.ts` | 33 |
| `set` | Method | `src/repositories/download.repository.ts` | 51 |
| `add` | Method | `src/repositories/download.repository.ts` | 59 |
| `remove` | Method | `src/repositories/download.repository.ts` | 75 |
| `createError` | Function | `src/repositories/favorites.repository.ts` | 13 |
| `withSerialAccess` | Function | `src/repositories/download.repository.ts` | 17 |

## How to Explore

1. `gitnexus_context({name: "createCollection"})` — see callers and callees
2. `gitnexus_query({query: "repositories"})` — find related execution flows
3. Read key files listed above for implementation details
