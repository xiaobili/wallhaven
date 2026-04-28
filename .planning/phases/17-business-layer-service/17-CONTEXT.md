# Phase 17: Business Layer (Service) - Context

**Gathered:** 2026-04-28
**Status:** Ready for planning
**Mode:** --auto (autonomous)

<domain>
## Phase Boundary

Implement business logic for collections and favorites management with error handling. This is the service layer that sits between composables (Phase 18) and repository (Phase 16).

**核心交付物：**
1. Collections Service (`src/services/collections.service.ts`) — 收藏夹管理业务逻辑
2. Favorites Service (`src/services/favorites.service.ts`) — 收藏项管理业务逻辑
3. Service exports (`src/services/index.ts`) — 导出新服务

**需求覆盖：** PERS-01, PERS-03

**阶段边界：**
- 仅创建 service 层（collections.service.ts, favorites.service.ts）
- 不创建 composable 层（Phase 18）
- 不创建 UI（Phase 19-21）
- 依赖 Phase 16 的 repository 层

**当前状态：**
- ✅ Phase 16 完成 — favoritesRepository 已实现所有 CRUD 操作
- ✅ 类型定义完成 — Collection, FavoriteItem, FavoritesData, FavoritesErrorCodes
- ✅ 存储常量完成 — STORAGE_KEYS.FAVORITES_DATA
- ❌ 无 favorites 相关 service

</domain>

<decisions>
## Implementation Decisions

### Service Organization (PERS-01)

- **D-01:** 双服务架构
  - `collections.service.ts` — 收藏夹管理（创建、重命名、删除、查询）
  - `favorites.service.ts` — 收藏项管理（添加、移除、移动、查询）
  - 理由：遵循单一职责原则；与 repository 方法分组一致；便于独立测试和维护

### Memory Caching Strategy (PERS-01)

- **D-02:** 服务层内存缓存
  ```typescript
  class CollectionsServiceImpl {
    private cachedCollections: Collection[] | null = null
    private cachedData: FavoritesData | null = null
    // ...
  }
  ```
  - 理由：避免重复 IPC 调用；与 `settingsService` 模式一致；提升性能
  - 缓存失效：数据变更时清除缓存；提供 `clearCache()` 方法

### Error Handling Strategy (PERS-03)

- **D-03:** 统一错误响应格式
  - 所有方法返回 `IpcResponse<T>`
  - 错误码使用 `FavoritesErrorCodes`
  - 中文错误消息便于 UI 直接展示
  - 理由：与现有 service 层模式一致；composables 可统一处理

- **D-04:** 存储错误处理
  - 捕获 repository 层返回的错误
  - 转换为用户友好的中文消息
  - 记录错误日志便于调试
  - 理由：用户不应看到技术性错误信息

### Collections Service Design

- **D-05:** CollectionsService 方法设计
  ```typescript
  class CollectionsServiceImpl {
    // 查询
    getAll(): Promise<IpcResponse<Collection[]>>
    getById(id: string): Promise<IpcResponse<Collection | null>>
    getDefault(): Promise<IpcResponse<Collection | null>>
    
    // 操作
    create(name: string): Promise<IpcResponse<Collection>>
    rename(id: string, name: string): Promise<IpcResponse<Collection>>
    delete(id: string): Promise<IpcResponse<void>>
    
    // 缓存
    clearCache(): void
  }
  ```
  - 理由：覆盖 COLL-01, COLL-02, COLL-03, COLL-04 需求；方法命名清晰

### Favorites Service Design

- **D-06:** FavoritesService 方法设计
  ```typescript
  class FavoritesServiceImpl {
    // 查询
    getAll(): Promise<IpcResponse<FavoriteItem[]>>
    getByCollection(collectionId: string): Promise<IpcResponse<FavoriteItem[]>>
    isFavorite(wallpaperId: string): Promise<IpcResponse<boolean>>
    getCollectionsForWallpaper(wallpaperId: string): Promise<IpcResponse<Collection[]>>
    
    // 操作
    add(wallpaperId: string, collectionId: string, wallpaperData: WallpaperItem): Promise<IpcResponse<FavoriteItem>>
    remove(wallpaperId: string, collectionId: string): Promise<IpcResponse<void>>
    move(wallpaperId: string, fromCollectionId: string, toCollectionId: string): Promise<IpcResponse<FavoriteItem>>
    
    // 缓存
    clearCache(): void
  }
  ```
  - 理由：覆盖 FAV-01, FAV-02, FAV-03, FAV-04, FAV-05, FAV-06 需求

### Cross-Service Dependencies

- **D-07:** 服务独立性
  - `collectionsService` 和 `favoritesService` 相互独立
  - 都依赖 `favoritesRepository`
  - 验证逻辑在 repository 层已实现
  - 理由：避免循环依赖；repository 已处理跨实体验证

### Claude's Discretion

- 缓存粒度（缓存完整 FavoritesData 还是分别缓存 collections/favorites）
- 缓存更新策略（写后更新 vs 写后清除）
- 错误日志格式
- 服务单例命名（collectionsService vs favoritesService）

</decisions>

<specifics>
## Specific Ideas

- 服务类命名遵循 `XxxServiceImpl` + `export const xxxService = new XxxServiceImpl()` 模式
- 缓存使用 `private cachedXxx: Type | null = null` 模式
- 错误消息使用中文，与应用语言一致
- 服务方法参数使用对象解构或多个参数（根据复杂度决定）

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 项目规划
- `.planning/PROJECT.md` — 项目核心价值、约束条件
- `.planning/REQUIREMENTS.md` — PERS-01, PERS-03 详细需求
- `.planning/ROADMAP.md` — Phase 17 定义和成功标准

### 前置阶段上下文
- `.planning/phases/16-data-layer-foundation/16-CONTEXT.md` — Repository 层设计决策
- `.planning/phases/14-electronapi-layer-refactor/14-CONTEXT.md` — 分层架构参考

### 代码库分析
- `.planning/codebase/ARCHITECTURE.md` — 现有架构、分层结构

### 关键代码文件（现有模式参考）

#### Service 模式参考
- `src/services/settings.service.ts` — 内存缓存模式、错误处理模式
- `src/services/download.service.ts` — 进度订阅、复杂业务逻辑模式
- `src/services/index.ts` — 导出模式

#### Repository 层（Phase 16 交付物）
- `src/repositories/favorites.repository.ts` — 所有 CRUD 操作
- `src/repositories/index.ts` — 导出

#### 类型定义
- `src/types/favorite.ts` — Collection, FavoriteItem, FavoritesData, FavoritesErrorCodes

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

#### SettingsService 缓存模式
```typescript
// src/services/settings.service.ts
class SettingsServiceImpl {
  private cachedSettings: AppSettings | null = null

  async get(): Promise<IpcResponse<AppSettings | null>> {
    if (this.cachedSettings) {
      return { success: true, data: this.cachedSettings }
    }
    const result = await settingsRepository.get()
    if (result.success && result.data) {
      this.cachedSettings = result.data
    }
    return result
  }

  async set(settings: AppSettings): Promise<IpcResponse<void>> {
    const result = await settingsRepository.set(settings)
    if (result.success) {
      this.cachedSettings = { ...settings }
    }
    return result
  }

  clearCache(): void {
    this.cachedSettings = null
  }
}
```

#### Service 导出模式
```typescript
// src/services/index.ts
export { settingsService } from './settings.service'
export { downloadService, type DownloadProgressData, type ProgressCallback } from './download.service'
```

#### Repository 方法（Phase 16 已实现）
```typescript
// src/repositories/favorites.repository.ts
export const favoritesRepository = {
  // Collection 操作
  getCollections(): Promise<IpcResponse<Collection[]>>
  createCollection(name: string): Promise<IpcResponse<Collection>>
  renameCollection(id: string, name: string): Promise<IpcResponse<Collection>>
  deleteCollection(id: string): Promise<IpcResponse<void>>

  // Favorite 操作
  getFavorites(collectionId?: string): Promise<IpcResponse<FavoriteItem[]>>
  addFavorite(item: FavoriteItem): Promise<IpcResponse<FavoriteItem>>
  removeFavorite(wallpaperId: string, collectionId: string): Promise<IpcResponse<void>>
  moveFavorite(wallpaperId: string, fromCollectionId: string, toCollectionId: string): Promise<IpcResponse<FavoriteItem>>

  // 查询方法
  isFavorite(wallpaperId: string): Promise<IpcResponse<boolean>>
  getCollectionsForWallpaper(wallpaperId: string): Promise<IpcResponse<Collection[]>>
}
```

### Established Patterns

- **服务类模式**：`class XxxServiceImpl` + `export const xxxService = new XxxServiceImpl()`
- **缓存模式**：私有 `cachedXxx` 字段 + `clearCache()` 方法
- **返回格式**：统一使用 `IpcResponse<T>` 包装结果
- **错误处理**：使用 `FavoritesErrorCodes` + 中文消息
- **依赖注入**：直接导入 repository，不使用 DI 框架

### Integration Points

- `src/services/collections.service.ts` — 新建文件
- `src/services/favorites.service.ts` — 新建文件
- `src/services/index.ts` — 添加 collectionsService 和 favoritesService 导出

</code_context>

<deferred>
## Deferred Ideas

None — 本阶段为业务层实现，功能明确。

### 后续阶段

- Phase 18: Composable Layer — 创建 useFavorites.ts 和 useCollections.ts
- Phase 19: Collections Management UI — 收藏夹管理界面
- Phase 20: Favorites Operations UI — 收藏操作界面
- Phase 21: Favorites Browsing UI — 收藏浏览界面

</deferred>

---

*Phase: 17-business-layer-service*
*Context gathered: 2026-04-28 (auto mode)*
