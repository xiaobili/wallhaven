# Phase 17: Business Layer (Service) - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-28
**Phase:** 17-business-layer-service
**Mode:** --auto (autonomous)
**Areas discussed:** Service Organization, Caching Strategy, Error Handling, Service Design

---

## Service Organization

| Option | Description | Selected |
|--------|-------------|----------|
| Single Service | One `favoritesService` handling both collections and favorites | |
| Dual Services | Separate `collectionsService` and `favoritesService` | ✓ |

**Auto-selected:** Dual Services
**Rationale:** Follows single responsibility principle; aligns with repository method groupings; enables independent testing and maintenance. The roadmap explicitly mentions both services.

---

## Memory Caching Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| No Caching | Direct pass-through to repository | |
| Full Data Cache | Cache entire `FavoritesData` object | |
| Selective Cache | Cache collections and favorites separately | ✓ |

**Auto-selected:** Selective Cache (collections array + favorites array)
**Rationale:** Matches `settingsService` pattern; avoids redundant IPC calls; provides `clearCache()` for invalidation. Consistent with existing service layer architecture.

---

## Error Handling Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Exceptions | Throw errors, let composables catch | |
| IpcResponse | Return `IpcResponse<T>` with error codes | ✓ |

**Auto-selected:** IpcResponse with error codes
**Rationale:** Consistent with repository layer return type; composables can handle uniformly; user-friendly Chinese messages ready for UI display.

---

## Collections Service Methods

| Method | Description | Included |
|--------|-------------|----------|
| `getAll()` | Get all collections | ✓ |
| `getById(id)` | Get collection by ID | ✓ |
| `getDefault()` | Get default collection | ✓ |
| `create(name)` | Create new collection | ✓ |
| `rename(id, name)` | Rename collection | ✓ |
| `delete(id)` | Delete collection | ✓ |
| `clearCache()` | Clear memory cache | ✓ |

**Auto-selected:** All methods included
**Rationale:** Covers COLL-01, COLL-02, COLL-03, COLL-04 requirements. Method naming follows repository pattern.

---

## Favorites Service Methods

| Method | Description | Included |
|--------|-------------|----------|
| `getAll()` | Get all favorites | ✓ |
| `getByCollection(id)` | Get favorites in collection | ✓ |
| `isFavorite(wallpaperId)` | Check if wallpaper is favorited | ✓ |
| `getCollectionsForWallpaper(id)` | Get collections containing wallpaper | ✓ |
| `add(wallpaperId, collectionId, data)` | Add to collection | ✓ |
| `remove(wallpaperId, collectionId)` | Remove from collection | ✓ |
| `move(wallpaperId, fromId, toId)` | Move between collections | ✓ |
| `clearCache()` | Clear memory cache | ✓ |

**Auto-selected:** All methods included
**Rationale:** Covers FAV-01, FAV-02, FAV-03, FAV-04, FAV-05, FAV-06 requirements. Aligns with repository methods.

---

## Claude's Discretion

The following aspects were left to Claude's discretion (standard implementation details):

1. **Cache granularity** — Decided to cache `FavoritesData` as a whole for simplicity, with selective access methods
2. **Cache update strategy** — Decided to clear cache on any write operation (simpler, safer)
3. **Error log format** — Use `console.error` with service prefix like `[CollectionsService]`
4. **Singleton naming** — Use `collectionsService` and `favoritesService` (lowercase camelCase)

---

## Deferred Ideas

None — Phase 17 scope is well-defined by Phase 16 decisions and roadmap.

---

*Auto-mode discussion completed: 2026-04-28*
