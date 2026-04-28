# Phase 16: Data Layer Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-28
**Phase:** 16-data-layer-foundation
**Mode:** --auto (fully autonomous)
**Areas discussed:** Type definitions, Storage constants, Repository design, Default collection handling

---

## Type Definitions

| Option | Description | Selected |
|--------|-------------|----------|
| Flat structure with separate Collection/FavoriteItem interfaces | Simple interfaces with id, name, timestamps for Collection; wallpaperId, collectionId, snapshot data for FavoriteItem | ✓ |
| Nested structure with favorites inside collections | Each Collection contains an array of favorites | |
| Minimal structure (id only) | Only store essential IDs, query API for full data | |

**Auto-selected:** Flat structure with separate interfaces
**Notes:** Flat structure enables efficient queries; snapshot data in FavoriteItem avoids repeated API calls and supports offline browsing

---

## Storage Key Naming

| Option | Description | Selected |
|--------|-------------|----------|
| `FAVORITES_DATA` | Follow existing STORAGE_KEYS pattern | ✓ |
| `FAVORITES` | Shorter name | |
| Separate keys for collections and favorites | Two storage keys | |

**Auto-selected:** `FAVORITES_DATA` (follows existing pattern)
**Notes:** Consistent with `APP_SETTINGS`, `DOWNLOAD_FINISHED_LIST` naming convention

---

## Repository Method Design

| Option | Description | Selected |
|--------|-------------|----------|
| Full CRUD + Query methods | Complete set of methods for all operations | ✓ |
| Basic CRUD only | Minimal create/read/update/delete | |
| Repository + separate Query class | Split read and write concerns | |

**Auto-selected:** Full CRUD + Query methods
**Notes:** Covers all requirements from PERS-02, COLL-04 and future phases; follows existing repository patterns

---

## Default Collection Handling

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-create on first access | Create default collection if none exists | ✓ |
| Require explicit creation | User must create first collection | |
| Create in service layer | Business layer handles default creation | |

**Auto-selected:** Auto-create on first access in repository
**Notes:** Ensures COLL-04 requirement is met; repository layer guarantees default collection exists

---

## Error Handling

| Option | Description | Selected |
|--------|-------------|----------|
| Define specific error codes | COLLECTION_NOT_FOUND, COLLECTION_IS_DEFAULT, etc. | ✓ |
| Generic error messages | Simple string error messages | |
| Throw exceptions | Use try/catch with custom exceptions | |

**Auto-selected:** Define specific error codes
**Notes:** Consistent with existing IpcResponse pattern; enables user-friendly error messages in UI

---

## Claude's Discretion

The following areas were delegated to Claude's judgment:
- UUID generation implementation (crypto.randomUUID() recommended)
- Timestamp format specifics (ISO 8601)
- Repository internal caching strategy
- Chinese error message wording

---

## Deferred Ideas

None — discussion stayed within phase scope.

---

*Phase: 16-data-layer-foundation*
*Discussion log created: 2026-04-28*
