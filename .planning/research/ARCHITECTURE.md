# Architecture Research: Favorites Feature Integration

## Research Question

**How should the favorites feature integrate with existing layered architecture? What new components/layers needed?**

---

## Executive Summary

The favorites feature integrates cleanly into the existing 5-layer architecture (Client → Repository → Service → Composable → View). This research identifies the integration points, new components required, and build order.

### Key Finding

**No new IPC channels required.** The favorites feature uses existing generic `store-get/set/delete` channels, following the pattern established by `downloadRepository`.

---

## Current Architecture Overview

### Layer Stack

```
┌─────────────────────────────────────────────────────────────┐
│                      View Layer                              │
│  (OnlineWallpaper, LocalWallpaper, DownloadWallpaper,       │
│   SettingPage, ImagePreview, WallpaperList)                  │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                   Composable Layer                           │
│  (useWallpaperList, useDownload, useSettings, useAlert,     │
│   useWallpaperSetter, useLocalFiles)                         │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    Service Layer                             │
│  (wallpaperService, downloadService, settingsService,       │
│   windowService)                                             │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                  Repository Layer                            │
│  (wallpaperRepository, downloadRepository, settingsRepository│
│   windowRepository)                                          │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    Client Layer                              │
│  (electronClient, apiClient)                                 │
│  STORAGE_KEYS: appSettings, downloadFinishedList,           │
│                wallpaperQueryParams                          │
└─────────────────────────────────────────────────────────────┘
```

### Key Patterns

1. **IpcResponse Wrapper**: All async operations return `IpcResponse<T>` with `{ success, data?, error? }`
2. **Store vs Repository Split**:
   - Store: Reactive state management (Pinia)
   - Repository: Data persistence (electron-store via electronClient)
3. **Service as Orchestrator**: Services coordinate repositories and handle business logic
4. **Composable as View Interface**: Composables expose computed refs and methods, hiding implementation

---

## Integration Points

### 1. Client Layer — Minimal Changes

| Component | Status | Change Required |
|-----------|--------|-----------------|
| `electronClient` | Existing | No change (uses generic `storeGet`/`storeSet`) |
| `apiClient` | Existing | No change |
| `STORAGE_KEYS` | Existing | **Add**: `FAVORITES_LIST` |

**New Storage Key:**
```typescript
// src/clients/constants.ts
export const STORAGE_KEYS = {
  APP_SETTINGS: 'appSettings',
  DOWNLOAD_FINISHED_LIST: 'downloadFinishedList',
  WALLPAPER_QUERY_PARAMS: 'wallpaperQueryParams',
  FAVORITES_LIST: 'favoritesList',  // NEW
} as const
```

### 2. Repository Layer — New Component

| Component | Status | Change Required |
|-----------|--------|-----------------|
| `wallpaperRepository` | Existing | No change |
| `downloadRepository` | Existing | No change |
| `settingsRepository` | Existing | No change |
| `windowRepository` | Existing | No change |
| `favoritesRepository` | **NEW** | Create |

**New Repository Pattern (follow `downloadRepository`):**
```typescript
// src/repositories/favorites.repository.ts
import type { IpcResponse } from '@/shared/types/ipc'
import type { FavoriteItem } from '@/types'
import { electronClient, STORAGE_KEYS } from '@/clients'

const MAX_FAVORITES = 200  // Reasonable limit

export const favoritesRepository = {
  async get(): Promise<IpcResponse<FavoriteItem[]>> { ... },
  async set(items: FavoriteItem[]): Promise<IpcResponse<void>> { ... },
  async add(item: FavoriteItem): Promise<IpcResponse<void>> { ... },
  async remove(id: string): Promise<IpcResponse<void>> { ... },
  async clear(): Promise<IpcResponse<void>> { ... },
  async exists(wallpaperId: string): Promise<boolean> { ... },
}
```

**Exports Update:**
```typescript
// src/repositories/index.ts
export { favoritesRepository } from './favorites.repository'
```

### 3. Service Layer — New Component

| Component | Status | Change Required |
|-----------|--------|-----------------|
| `wallpaperService` | Existing | No change |
| `downloadService` | Existing | No change |
| `settingsService` | Existing | No change |
| `windowService` | Existing | No change |
| `favoritesService` | **NEW** | Create |

**New Service Pattern (follow `downloadService`):**
```typescript
// src/services/favorites.service.ts
import type { IpcResponse } from '@/shared/types/ipc'
import type { FavoriteItem, WallpaperItem } from '@/types'
import { favoritesRepository } from '@/repositories'

class FavoritesServiceImpl {
  async getAll(): Promise<IpcResponse<FavoriteItem[]>> { ... }
  async add(wallpaper: WallpaperItem): Promise<IpcResponse<void>> { ... }
  async remove(wallpaperId: string): Promise<IpcResponse<void>> { ... }
  async toggle(wallpaper: WallpaperItem): Promise<IpcResponse<{ added: boolean }>> { ... }
  async isFavorite(wallpaperId: string): Promise<boolean> { ... }
  async clear(): Promise<IpcResponse<void>> { ... }
}

export const favoritesService = new FavoritesServiceImpl()
```

**Exports Update:**
```typescript
// src/services/index.ts
export { favoritesService, type FavoritesListResult } from './favorites.service'
```

### 4. Composable Layer — New Component

| Component | Status | Change Required |
|-----------|--------|-----------------|
| `useWallpaperList` | Existing | No change |
| `useDownload` | Existing | No change |
| `useSettings` | Existing | No change |
| `useAlert` | Existing | No change |
| `useWallpaperSetter` | Existing | No change |
| `useLocalFiles` | Existing | No change |
| `useFavorites` | **NEW** | Create |

**New Composable Pattern (follow `useDownload`):**
```typescript
// src/composables/favorites/useFavorites.ts
import { computed, ref, type ComputedRef, type Ref } from 'vue'
import { favoritesService } from '@/services'
import { useAlert } from '@/composables'
import type { FavoriteItem, WallpaperItem } from '@/types'

export interface UseFavoritesReturn {
  // State
  favorites: ComputedRef<FavoriteItem[]>
  loading: ComputedRef<boolean>
  favoriteIds: ComputedRef<Set<string>>  // For O(1) lookup
  
  // Methods
  load: () => Promise<boolean>
  add: (wallpaper: WallpaperItem) => Promise<boolean>
  remove: (wallpaperId: string) => Promise<boolean>
  toggle: (wallpaper: WallpaperItem) => Promise<{ added: boolean }>
  isFavorite: (wallpaperId: string) => boolean
  clear: () => Promise<boolean>
}

export function useFavorites(): UseFavoritesReturn { ... }
```

**Exports Update:**
```typescript
// src/composables/index.ts
export { useFavorites, type UseFavoritesReturn } from './favorites/useFavorites'
```

### 5. View Layer — Modified + New

| Component | Status | Change Required |
|-----------|--------|-----------------|
| `OnlineWallpaper.vue` | Existing | **Modify**: Add favorite button integration |
| `LocalWallpaper.vue` | Existing | No change |
| `DownloadWallpaper.vue` | Existing | No change |
| `SettingPage.vue` | Existing | No change |
| `ImagePreview.vue` | Existing | **Modify**: Add favorite button to preview |
| `WallpaperList.vue` | Existing | **Modify**: Add favorite indicator to cards |
| `FavoritesWallpaper.vue` | **NEW** | Create favorites browsing page |
| `Main.vue` | Existing | **Modify**: Add navigation item for favorites |

### 6. Router — Modified

**Add New Route:**
```typescript
// src/router/index.ts
const routes: RouteRecordRaw[] = [
  // ...existing routes...
  {
    path: '/favorites',
    name: 'FavoritesWallpaper',
    component: () => import('@/views/FavoritesWallpaper.vue'),
    meta: {
      title: '我的收藏',
      icon: 'fas fa-star',
    },
  },
]
```

### 7. Types — New Definitions

**Add to `src/types/index.ts`:**
```typescript
/**
 * 收藏项
 */
export interface FavoriteItem {
  id: string              // Unique ID (same as wallpaper ID for dedup)
  wallpaperId: string     // Wallhaven wallpaper ID
  url: string             // Full resolution URL
  thumbs: WallpaperThumb  // Thumbnails
  resolution: string      // e.g. "1920x1080"
  fileSize: number        // File size in bytes
  addedAt: string         // ISO timestamp when favorited
}
```

### 8. IPC Channels — No New Channels

The favorites feature uses existing generic store channels:
- `store-get` — Read favorites list
- `store-set` — Save favorites list
- `store-delete` — Clear favorites

**No new IPC handler required.** This follows the pattern used by `downloadRepository` for finished downloads.

---

## Data Flow Diagram

### Add to Favorites Flow

```
User clicks ★ on wallpaper card
    │
    ▼
WallpaperList.vue / ImagePreview.vue
    │ @toggle-favorite
    ▼
OnlineWallpaper.vue
    │ useFavorites().add(wallpaper)
    ▼
useFavorites (composable)
    │ favoritesService.add(wallpaper)
    ▼
favoritesService
    │ favoritesRepository.add(item)
    ▼
favoritesRepository
    │ electronClient.storeSet(STORAGE_KEYS.FAVORITES_LIST, items)
    ▼
electronClient
    │ window.electronAPI.storeSet({ key, value })
    ▼
IPC: 'store-set'
    │
    ▼
Main Process: electron-store writes to disk
```

### Load Favorites Flow

```
App startup / Favorites page mounted
    │
    ▼
useFavorites().load()
    │
    ▼
favoritesService.getAll()
    │
    ▼
favoritesRepository.get()
    │
    ▼
electronClient.storeGet(STORAGE_KEYS.FAVORITES_LIST)
    │
    ▼
IPC: 'store-get'
    │
    ▼
Main Process: electron-store reads from disk
    │
    ▼
Returns: FavoriteItem[] → Service → Composable → View
```

---

## Component Summary

### New Components (7 files)

| Layer | File | Purpose |
|-------|------|---------|
| Client | `constants.ts` (modify) | Add `FAVORITES_LIST` storage key |
| Types | `index.ts` (modify) | Add `FavoriteItem` interface |
| Repository | `favorites.repository.ts` | Data persistence |
| Service | `favorites.service.ts` | Business logic |
| Composable | `favorites/useFavorites.ts` | View interface |
| View | `FavoritesWallpaper.vue` | Favorites browsing page |
| Router | `index.ts` (modify) | Add `/favorites` route |

### Modified Components (5 files)

| Layer | File | Change |
|-------|------|--------|
| View | `OnlineWallpaper.vue` | Import useFavorites, add toggle logic |
| View | `ImagePreview.vue` | Add favorite button |
| View | `WallpaperList.vue` | Add favorite indicator + event emission |
| View | `Main.vue` | Add navigation item for favorites |
| Exports | `repositories/index.ts` | Export favoritesRepository |
| Exports | `services/index.ts` | Export favoritesService |
| Exports | `composables/index.ts` | Export useFavorites |

---

## Build Order

### Phase 1: Foundation (Data Layer)
1. `src/types/index.ts` — Add `FavoriteItem` type
2. `src/clients/constants.ts` — Add `FAVORITES_LIST` storage key
3. `src/repositories/favorites.repository.ts` — Create repository
4. `src/repositories/index.ts` — Export repository

### Phase 2: Business Logic
5. `src/services/favorites.service.ts` — Create service
6. `src/services/index.ts` — Export service

### Phase 3: View Interface
7. `src/composables/favorites/useFavorites.ts` — Create composable
8. `src/composables/index.ts` — Export composable

### Phase 4: UI Integration
9. `src/views/FavoritesWallpaper.vue` — Create favorites page
10. `src/router/index.ts` — Add route
11. `src/Main.vue` — Add navigation item

### Phase 5: Feature Integration
12. `src/components/WallpaperList.vue` — Add favorite indicator
13. `src/components/ImagePreview.vue` — Add favorite button
14. `src/views/OnlineWallpaper.vue` — Wire up favorite logic

---

## Architecture Decisions

### Decision 1: No New IPC Channels
**Rationale:** Favorites use simple CRUD operations on a JSON list. The existing `store-get/set/delete` channels are sufficient. This minimizes IPC surface area and follows the pattern of `downloadRepository`.

**Alternative Considered:** Dedicated IPC channels (`favorites-get`, `favorites-add`, etc.) would add complexity without benefit for this use case.

### Decision 2: In-Memory Favorite IDs Set
**Rationale:** For O(1) `isFavorite()` checks, the composable maintains a `Set<string>` of favorite IDs alongside the full list. This is kept in sync by the composable's internal logic.

### Decision 3: WallpaperItem → FavoriteItem Transformation
**Rationale:** Store minimal data needed for display (thumbnail, resolution, URL) rather than the full `WallpaperItem`. This reduces storage size and the favorite remains valid even if the original API data changes.

### Decision 4: ID as Wallpaper ID
**Rationale:** Use the Wallhaven wallpaper ID as the unique identifier. This enables deduplication and allows `isFavorite()` checks without iterating the list.

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Storage overflow | Low | Medium | Implement 200-item limit with LRU eviction |
| Data migration | None | N/A | New feature, no existing data to migrate |
| Performance on large lists | Low | Low | Set for O(1) lookups, limit on stored items |
| Sync issues | Low | Medium | Single source of truth in repository layer |

---

## Validation Checklist

- [x] All integration points identified
- [x] New components explicitly listed
- [x] Modified components explicitly listed
- [x] Build order considers dependencies
- [x] Follows existing patterns (repository, service, composable)
- [x] No breaking changes to existing functionality
- [x] No new IPC channels required
- [x] Types defined before implementation

---

## Downstream Consumer Notes

### For Requirements Phase
- Define `FavoriteItem` structure precisely
- Specify max storage limit behavior
- Define toggle behavior (add/remove)

### For Planning Phase
- Follow build order strictly (dependencies)
- Each phase can be independently tested
- No parallel work across phases (sequential deps)

### For Implementation Phase
- Use existing patterns as templates
- `downloadRepository` is the best reference for `favoritesRepository`
- `useDownload` is the best reference for `useFavorites`

---

*Research completed: 2026-04-28*
*For: v2.5 Favorites Feature*
