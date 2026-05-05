---
name: errors
description: "Skill for the Errors area of wallhaven. 8 symbols across 4 files."
---

# Errors

8 symbols | 4 files | Cohesion: 100%

## When to Use

- Working with code in `src/`
- Understanding how StoreError, NetworkError, IpcError work
- Modifying errors-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/errors/StoreError.ts` | StoreError, toJSON |
| `src/errors/NetworkError.ts` | NetworkError, toJSON |
| `src/errors/IpcError.ts` | IpcError, toJSON |
| `src/errors/AppError.ts` | AppError, toJSON |

## Entry Points

Start here when exploring this area:

- **`StoreError`** (Class) — `src/errors/StoreError.ts:26`
- **`NetworkError`** (Class) — `src/errors/NetworkError.ts:27`
- **`IpcError`** (Class) — `src/errors/IpcError.ts:24`
- **`AppError`** (Class) — `src/errors/AppError.ts:21`
- **`toJSON`** (Method) — `src/errors/StoreError.ts:50`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `StoreError` | Class | `src/errors/StoreError.ts` | 26 |
| `NetworkError` | Class | `src/errors/NetworkError.ts` | 27 |
| `IpcError` | Class | `src/errors/IpcError.ts` | 24 |
| `AppError` | Class | `src/errors/AppError.ts` | 21 |
| `toJSON` | Method | `src/errors/StoreError.ts` | 50 |
| `toJSON` | Method | `src/errors/NetworkError.ts` | 88 |
| `toJSON` | Method | `src/errors/IpcError.ts` | 42 |
| `toJSON` | Method | `src/errors/AppError.ts` | 51 |

## How to Explore

1. `gitnexus_context({name: "StoreError"})` — see callers and callees
2. `gitnexus_query({query: "errors"})` — find related execution flows
3. Read key files listed above for implementation details
