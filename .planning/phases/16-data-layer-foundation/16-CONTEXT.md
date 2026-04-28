# Phase 16: Data Layer Foundation - Context

**Gathered:** 2026-04-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Establish type definitions, storage constants, and repository layer for favorites persistence. This is the foundation layer that all subsequent phases (17-21) depend on.

**核心交付物：**
1. Type definitions (`src/types/favorite.ts`) — Collection, FavoriteItem, FavoritesData interfaces
2. Storage constants (`src/clients/constants.ts`) — FAVORITES_DATA key
3. Favorites Repository (`src/repositories/favorites.repository.ts`) — CRUD operations for collections and favorites
4. Repository exports (`src/repositories/index.ts`)

**需求覆盖：** PERS-02, COLL-04

**阶段边界：**
- 仅创建数据层基础设施（types、constants、repository）
- 不创建 service 层（Phase 17）
- 不创建 composable 层（Phase 18）
- 不创建 UI（Phase 19-21）

**当前状态：**
- ✅ 已有 `electronClient` 封装所有 electronAPI 方法
- ✅ 已有 `STORAGE_KEYS` 常量管理模式
- ✅ 已有 repository 层模式（settings、download、wallpaper）
- ❌ 无 favorites 相关类型定义
- ❌ 无 favorites 相关存储常量
- ❌ 无 favorites 相关 repository

</domain>

<decisions>
## Implementation Decisions

### Type Definitions (PERS-02)

- **D-01:** Collection 接口设计
  ```typescript
  interface Collection {
    id: string           // UUID
    name: string         // 用户可见名称
    isDefault: boolean   // 是否为默认收藏夹（不可删除）
    createdAt: string    // ISO 8601 时间戳
    updatedAt: string    // ISO 8601 时间戳
  }
  ```
  - 理由：`id` 使用 UUID 便于后续扩展；`isDefault` 标记默认收藏夹（COLL-04）；时间戳支持排序和审计

- **D-02:** FavoriteItem 接口设计
  ```typescript
  interface FavoriteItem {
    wallpaperId: string  // Wallhaven 壁纸 ID
    collectionId: string // 所属收藏夹 ID
    addedAt: string      // ISO 8601 时间戳
    wallpaperData: WallpaperItem // 快照数据（避免额外查询）
  }
  ```
  - 理由：`wallpaperData` 存储快照，避免每次浏览收藏时重新查询 API；支持离线浏览收藏

- **D-03:** FavoritesData 接口设计（根存储结构）
  ```typescript
  interface FavoritesData {
    collections: Collection[]
    favorites: FavoriteItem[]
    version: number      // 数据版本号（便于未来迁移）
  }
  ```
  - 理由：扁平化结构便于查询；`version` 字段支持未来数据格式迁移

### Storage Constants (PERS-02)

- **D-04:** 存储键命名
  - 添加 `FAVORITES_DATA: 'favoritesData'` 到 `STORAGE_KEYS`
  - 理由：遵循现有命名约定（APP_SETTINGS, DOWNLOAD_FINISHED_LIST）

### Repository Design (PERS-02, COLL-04)

- **D-05:** Repository 方法设计
  ```typescript
  // Collection 操作
  getCollections(): Promise<IpcResponse<Collection[]>>
  createCollection(name: string): Promise<IpcResponse<Collection>>
  renameCollection(id: string, name: string): Promise<IpcResponse<Collection>>
  deleteCollection(id: string): Promise<IpcResponse<void>>  // 会检查 isDefault

  // Favorite 操作
  getFavorites(collectionId?: string): Promise<IpcResponse<FavoriteItem[]>>
  addFavorite(item: FavoriteItem): Promise<IpcResponse<FavoriteItem>>
  removeFavorite(wallpaperId: string, collectionId: string): Promise<IpcResponse<void>>
  moveFavorite(wallpaperId: string, fromCollectionId: string, toCollectionId: string): Promise<IpcResponse<FavoriteItem>>

  // 查询方法
  isFavorite(wallpaperId: string): Promise<IpcResponse<boolean>>
  getCollectionsForWallpaper(wallpaperId: string): Promise<IpcResponse<Collection[]>>
  ```
  - 理由：覆盖所有 CRUD 操作和查询需求；返回统一的 `IpcResponse<T>` 格式

- **D-06:** 默认收藏夹处理（COLL-04）
  - Repository 初始化时检查是否存在默认收藏夹
  - 如果不存在，自动创建名为 "收藏" (Favorites) 的默认收藏夹
  - `deleteCollection` 方法检查 `isDefault`，如果是默认收藏夹则返回错误
  - 理由：确保用户始终有一个可用的收藏夹

- **D-07:** 错误处理设计
  - 定义 `FavoritesError` 错误码：
    - `COLLECTION_NOT_FOUND` — 收藏夹不存在
    - `COLLECTION_IS_DEFAULT` — 无法删除默认收藏夹
    - `COLLECTION_NAME_EXISTS` — 收藏夹名称已存在
    - `FAVORITE_NOT_FOUND` — 收藏项不存在
    - `FAVORITE_ALREADY_EXISTS` — 壁纸已在该收藏夹中
    - `STORAGE_ERROR` — 存储读写错误
  - 理由：明确的错误码便于上层处理和用户提示

### Claude's Discretion

- UUID 生成方式（可用 `crypto.randomUUID()` 或 uuid 库）
- 时间戳格式的具体实现
- Repository 内部缓存策略（是否缓存 collections/favorites 避免频繁读取）
- 错误消息的中文文案

</decisions>

<specifics>
## Specific Ideas

- 数据结构设计参考现有 `AppSettings` 和 `DownloadItem` 模式
- Repository 方法命名参考现有 `settingsRepository` 和 `downloadRepository` 模式
- 默认收藏夹名称使用中文 "收藏"，与应用语言一致

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 项目规划
- `.planning/PROJECT.md` — 项目核心价值、约束条件
- `.planning/REQUIREMENTS.md` — PERS-02, COLL-04 详细需求
- `.planning/ROADMAP.md` — Phase 16 定义和成功标准

### 前置阶段上下文
- `.planning/phases/15-imagepreview-navigation/15-CONTEXT.md` — 前一阶段上下文
- `.planning/phases/14-electronapi-layer-refactor/14-CONTEXT.md` — 分层架构参考

### 代码库分析
- `.planning/codebase/ARCHITECTURE.md` — 现有架构、分层结构

### 关键代码文件（现有模式参考）

#### 类型定义参考
- `src/types/index.ts` — 现有类型定义模式（WallpaperItem, DownloadItem 等）

#### 存储常量参考
- `src/clients/constants.ts` — STORAGE_KEYS 定义模式

#### Repository 模式参考
- `src/repositories/settings.repository.ts` — 基础 CRUD 模式
- `src/repositories/download.repository.ts` — 复杂状态管理模式
- `src/repositories/index.ts` — 导出模式

#### Client 层参考
- `src/clients/electron.client.ts` — storeGet/storeSet 方法

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

#### STORAGE_KEYS 模式
```typescript
// src/clients/constants.ts
export const STORAGE_KEYS = {
  APP_SETTINGS: 'appSettings',
  DOWNLOAD_FINISHED_LIST: 'downloadFinishedList',
  WALLPAPER_QUERY_PARAMS: 'wallpaperQueryParams',
} as const
```

#### Repository 方法模式
```typescript
// src/repositories/settings.repository.ts
export const settingsRepository = {
  async get(): Promise<IpcResponse<AppSettings | null>> {
    return electronClient.storeGet<AppSettings>(STORAGE_KEYS.APP_SETTINGS)
  },
  async set(settings: AppSettings): Promise<IpcResponse<void>> {
    return electronClient.storeSet(STORAGE_KEYS.APP_SETTINGS, settings)
  },
  // ...
}
```

#### IpcResponse 格式
```typescript
interface IpcResponse<T> {
  success: boolean
  data?: T
  error?: { code: string; message: string }
}
```

### Established Patterns

- **命名约定**：Repository 使用对象导出，方法使用 async/await
- **返回格式**：统一使用 `IpcResponse<T>` 包装结果
- **存储方式**：通过 `electronClient.storeGet/storeSet` 操作 electron-store
- **错误处理**：使用错误码 + 消息格式，便于上层处理

### Integration Points

- `src/types/favorite.ts` — 新建文件，需要导出到 `src/types/index.ts`
- `src/clients/constants.ts` — 扩展 STORAGE_KEYS
- `src/repositories/favorites.repository.ts` — 新建文件
- `src/repositories/index.ts` — 添加 favoritesRepository 导出

</code_context>

<deferred>
## Deferred Ideas

None — 本阶段为基础设施，功能明确。

### 后续阶段

- Phase 17: Business Layer (Service) — 创建 favorites.service.ts 和 collections.service.ts
- Phase 18: Composable Layer — 创建 useFavorites.ts 和 useCollections.ts
- Phase 19-21: UI 层实现

</deferred>

---

*Phase: 16-data-layer-foundation*
*Context gathered: 2026-04-28*
