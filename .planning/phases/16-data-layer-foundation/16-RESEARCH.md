# Phase 16: Data Layer Foundation - Research

**Researched:** 2026-04-28
**Status:** Ready for planning

---

## Research Objective

Answer: "What do I need to know to PLAN this phase well?"

---

## 1. Existing Repository Patterns

### 1.1 Repository Structure

All repositories in the codebase follow a consistent pattern:

```typescript
// Pattern: Object literal with async methods returning IpcResponse<T>
export const xxxRepository = {
  async get(): Promise<IpcResponse<T>> { ... },
  async set(value: T): Promise<IpcResponse<void>> { ... },
  async delete(): Promise<IpcResponse<void>> { ... },
}
```

### 1.2 Repository Types Analyzed

| Repository | File | Pattern |
|------------|------|---------|
| settingsRepository | `settings.repository.ts` | Simple get/set/delete + extra operations (selectFolder, clearAppCache) |
| downloadRepository | `download.repository.ts` | Collection-based with add/remove/clear + business constraints (MAX_FINISHED_ITEMS) |
| wallpaperRepository | `wallpaper.repository.ts` | Focused on query params persistence + setWallpaper operation |

### 1.3 Key Implementation Patterns

#### A. Default Value Handling
```typescript
// From downloadRepository.get()
async get(): Promise<IpcResponse<FinishedDownloadItem[]>> {
  const result = await electronClient.storeGet<FinishedDownloadItem[]>(STORAGE_KEYS.DOWNLOAD_FINISHED_LIST)
  
  if (result.success) {
    // Return data or empty array as default
    return { success: true, data: result.data || [] }
  }
  
  // On failure, still return empty array with error
  return { success: false, data: [], error: result.error }
}
```

**Pattern:** Always provide a sensible default value in the response data field.

#### B. Chained Operations
```typescript
// From downloadRepository.add()
async add(item: FinishedDownloadItem): Promise<IpcResponse<void>> {
  const result = await this.get()
  if (!result.success) {
    return { success: false, error: result.error }
  }
  
  // Business logic: add to head, limit length
  const items = [item, ...(result.data ?? [])].slice(0, MAX_FINISHED_ITEMS)
  return this.set(items)
}
```

**Pattern:** Get → Transform → Set pattern for collection modifications.

#### C. Business Constraints in Repository
```typescript
// From downloadRepository
const MAX_FINISHED_ITEMS = 50

async set(items: FinishedDownloadItem[]): Promise<IpcResponse<void>> {
  const limitedItems = items.slice(0, MAX_FINISHED_ITEMS)
  return electronClient.storeSet(STORAGE_KEYS.DOWNLOAD_FINISHED_LIST, limitedItems)
}
```

**Pattern:** Repository can enforce simple constraints; complex business logic belongs in service layer.

---

## 2. Type Definition Patterns

### 2.1 Type Organization

Types are defined in `src/types/index.ts` with clear sections:

```typescript
// ==================== 壁纸相关类型 ====================

export interface WallpaperItem {
  id: string
  // ... properties
}

// ==================== 下载任务相关类型 ====================

export type DownloadState = 'downloading' | 'paused' | 'waiting' | 'completed' | 'failed'

export interface DownloadItem {
  id: string
  // ... properties
  state: DownloadState
}
```

### 2.2 Type Naming Conventions

| Type | Pattern |
|------|---------|
| Entity | `XxxItem` (e.g., `WallpaperItem`, `DownloadItem`) |
| Collection | Not explicitly named, use `XxxItem[]` |
| State Enum | `XxxState` (e.g., `DownloadState`) |
| Settings | `XxxSettings` (e.g., `AppSettings`) |
| Props | `XxxProps` (e.g., `SearchBarProps`) |

### 2.3 Shared Types Location

IPC-related shared types are in `src/shared/types/ipc.ts`:

```typescript
// IpcResponse - the universal response wrapper
export interface IpcResponse<T = unknown> {
  success: boolean
  data?: T
  error?: IpcErrorInfo
}

export interface IpcErrorInfo {
  code: string
  message: string
}
```

---

## 3. Storage Key Patterns

### 3.1 Current Pattern

```typescript
// src/clients/constants.ts
export const STORAGE_KEYS = {
  APP_SETTINGS: 'appSettings',
  DOWNLOAD_FINISHED_LIST: 'downloadFinishedList',
  WALLPAPER_QUERY_PARAMS: 'wallpaperQueryParams',
} as const

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS]
```

### 3.2 Naming Convention

- **Constant name**: SCREAMING_SNAKE_CASE (e.g., `APP_SETTINGS`)
- **Storage key**: camelCase (e.g., `appSettings`)
- **Semantic naming**: Describes what is stored, not implementation details

### 3.3 Required Addition

```typescript
FAVORITES_DATA: 'favoritesData'
```

---

## 4. Electron Store Usage

### 4.1 Client Layer

All electron-store operations go through `electronClient`:

```typescript
// src/clients/electron.client.ts

// Get data
async storeGet<T>(key: string): Promise<IpcResponse<T | null>>

// Set data (handles Vue proxy stripping)
async storeSet(key: string, value: unknown): Promise<IpcResponse<void>>

// Delete key
async storeDelete(key: string): Promise<IpcResponse<void>>

// Clear all
async storeClear(): Promise<IpcResponse<void>>
```

### 4.2 Vue Proxy Handling

**Important:** `storeSet` automatically strips Vue reactive proxies:

```typescript
async storeSet(key: string, value: unknown): Promise<IpcResponse<void>> {
  // Deep clone to remove Vue reactive proxy, avoiding IPC clone errors
  const plainValue = JSON.parse(JSON.stringify(value))
  const result = await window.electronAPI.storeSet({ key, value: plainValue })
  // ...
}
```

**Implication:** No need to manually serialize data before storage.

---

## 5. Error Handling Patterns

### 5.1 Error Codes Structure

```typescript
// src/errors/types.ts
export const ErrorCodes = {
  // Store errors
  STORE_ERROR: 'STORE_ERROR',
  STORE_READ_ERROR: 'STORE_READ_ERROR',
  STORE_WRITE_ERROR: 'STORE_WRITE_ERROR',
  STORE_DELETE_ERROR: 'STORE_DELETE_ERROR',
  // ...
} as const
```

### 5.2 IpcResponse Error Format

```typescript
// Error response
{
  success: false,
  error: {
    code: 'ERROR_CODE',
    message: 'Human readable message'
  }
}

// Success response with data
{
  success: true,
  data: <actual data>
}

// Success response without data
{
  success: true
}
```

### 5.3 Recommended Favorites Error Codes

Based on the existing pattern and D-07 from CONTEXT:

```typescript
// Add to ErrorCodes or create FavoritesErrorCodes
FAVORITES_COLLECTION_NOT_FOUND: 'FAVORITES_COLLECTION_NOT_FOUND'
FAVORITES_COLLECTION_IS_DEFAULT: 'FAVORITES_COLLECTION_IS_DEFAULT'
FAVORITES_COLLECTION_NAME_EXISTS: 'FAVORITES_COLLECTION_NAME_EXISTS'
FAVORITES_FAVORITE_NOT_FOUND: 'FAVORITES_FAVORITE_NOT_FOUND'
FAVORITES_ALREADY_EXISTS: 'FAVORITES_ALREADY_EXISTS'
FAVORITES_STORAGE_ERROR: 'FAVORITES_STORAGE_ERROR'
```

---

## 6. Integration Points

### 6.1 File Changes Required

| File | Change Type | Description |
|------|-------------|-------------|
| `src/types/favorite.ts` | **NEW** | Type definitions for Collection, FavoriteItem, FavoritesData |
| `src/types/index.ts` | **MODIFY** | Export new types |
| `src/clients/constants.ts` | **MODIFY** | Add FAVORITES_DATA to STORAGE_KEYS |
| `src/repositories/favorites.repository.ts` | **NEW** | Repository implementation |
| `src/repositories/index.ts` | **MODIFY** | Export favoritesRepository |

### 6.2 Import Patterns

```typescript
// From repository to clients
import { electronClient, STORAGE_KEYS } from '@/clients'

// From repository to types
import type { IpcResponse } from '@/shared/types/ipc'
import type { ... } from '@/types'
```

---

## 7. Default Collection Initialization

### 7.1 Required Behavior (COLL-04)

The system must provide a default "Favorites" collection that cannot be deleted.

### 7.2 Implementation Strategy

Based on D-06 from CONTEXT:

```typescript
// In favoritesRepository
const DEFAULT_COLLECTION: Collection = {
  id: 'default-favorites', // or use crypto.randomUUID()
  name: '收藏', // Chinese as per app language
  isDefault: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

// Check and initialize on first access
async getData(): Promise<IpcResponse<FavoritesData>> {
  const result = await electronClient.storeGet<FavoritesData>(STORAGE_KEYS.FAVORITES_DATA)
  
  if (result.success && result.data === null) {
    // First time: initialize with default collection
    const initialData: FavoritesData = {
      collections: [DEFAULT_COLLECTION],
      favorites: [],
      version: 1,
    }
    await electronClient.storeSet(STORAGE_KEYS.FAVORITES_DATA, initialData)
    return { success: true, data: initialData }
  }
  
  return result as IpcResponse<FavoritesData>
}
```

### 7.3 Default Collection Protection

```typescript
async deleteCollection(id: string): Promise<IpcResponse<void>> {
  const data = await this.getData()
  if (!data.success) return { success: false, error: data.error }
  
  const collection = data.data.collections.find(c => c.id === id)
  
  if (!collection) {
    return {
      success: false,
      error: { code: 'COLLECTION_NOT_FOUND', message: '收藏夹不存在' }
    }
  }
  
  if (collection.isDefault) {
    return {
      success: false,
      error: { code: 'COLLECTION_IS_DEFAULT', message: '无法删除默认收藏夹' }
    }
  }
  
  // Proceed with deletion...
}
```

---

## 8. UUID Generation Options

### 8.1 Available Methods

1. **crypto.randomUUID()** - Native browser/Electron API
   - Available in Node.js 14.17+ and modern browsers
   - No dependencies needed
   - Returns standard UUID v4

2. **uuid package** - Popular npm package
   - Requires adding dependency
   - More features (different UUID versions)

### 8.2 Recommendation

Use `crypto.randomUUID()` for simplicity:

```typescript
const newCollection: Collection = {
  id: crypto.randomUUID(),
  name,
  isDefault: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}
```

---

## 9. Caching Considerations

### 9.1 Current Repository Pattern

Existing repositories do NOT cache data - they read from electron-store on every operation.

### 9.2 Rationale

- electron-store is fast for small data
- Avoids sync issues between cache and storage
- Simpler code

### 9.3 Recommendation for Favorites

Follow the same pattern: **no caching in repository layer**.

If caching is needed, it should be added in the **service layer** (Phase 17) or **composable layer** (Phase 18) using Vue's reactive primitives.

---

## 10. Planning Checklist

Before planning, ensure:

- [ ] Review CONTEXT.md decisions (D-01 through D-07)
- [ ] Understand IpcResponse format for all return types
- [ ] Know the default collection initialization flow
- [ ] Understand the "read first, then write" pattern for collection modifications
- [ ] Know where to add error codes (extend existing vs. new file)
- [ ] Understand export patterns for types and repositories

---

## 11. Key Code Files to Reference During Implementation

| File | Purpose |
|------|---------|
| `src/types/index.ts` | Type definition pattern |
| `src/shared/types/ipc.ts` | IpcResponse type |
| `src/clients/constants.ts` | STORAGE_KEYS pattern |
| `src/clients/electron.client.ts` | storeGet/storeSet methods |
| `src/repositories/download.repository.ts` | Best reference for collection-based repository |
| `src/repositories/settings.repository.ts` | Simple repository pattern |
| `src/repositories/index.ts` | Export pattern |
| `src/errors/types.ts` | Error code pattern |

---

## 12. Risks and Considerations

### 12.1 Data Migration

The `version` field in `FavoritesData` supports future schema migrations:
- When data format changes, increment version
- Add migration logic to handle old versions

### 12.2 Storage Size

- Each `FavoriteItem` stores a `wallpaperData` snapshot
- Consider storage size if user has many favorites
- This is acceptable for MVP; can optimize later

### 12.3 Data Consistency

When modifying collections:
- Always use "read → modify → write" pattern
- No transactions in electron-store, but low collision risk for single-user app

---

*Research completed: 2026-04-28*
*Ready for: `/gsd-plan-phase 16`*
