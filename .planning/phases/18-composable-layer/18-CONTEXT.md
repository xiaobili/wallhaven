# Phase 18: Composable Layer - Context

**Gathered:** 2026-04-28
**Status:** Ready for planning
**Mode:** --auto (autonomous)

<domain>
## Phase Boundary

Create Vue composables for reactive state management of collections and favorites. This is the composable layer that sits between views (Phase 19-21) and service layer (Phase 17).

**核心交付物：**
1. useCollections Composable (`src/composables/favorites/useCollections.ts`) — 收藏夹状态管理
2. useFavorites Composable (`src/composables/favorites/useFavorites.ts`) — 收藏项状态管理
3. Composable exports (`src/composables/index.ts`) — 导出新 composables

**需求覆盖：** COLL-05, FAV-05, FAV-06

**阶段边界：**
- 仅创建 composable 层（useCollections.ts, useFavorites.ts）
- 不创建 UI（Phase 19-21）
- 依赖 Phase 16 的 repository 层和 Phase 17 的 service 层

**当前状态：**
- ✅ Phase 16 完成 — favoritesRepository 已实现所有 CRUD 操作
- ✅ Phase 17 完成 — collectionsService 和 favoritesService 已实现业务逻辑
- ✅ 类型定义完成 — Collection, FavoriteItem, FavoritesData, FavoritesErrorCodes
- ✅ 存储常量完成 — STORAGE_KEYS.FAVORITES_DATA
- ❌ 无 favorites 相关 composables

</domain>

<decisions>
## Implementation Decisions

### State Management Architecture (COLL-05)

- **D-01:** 双 Composable 架构
  - `useCollections` — 收藏夹状态管理（列表、创建、重命名、删除）
  - `useFavorites` — 收藏项状态管理（添加、移除、移动、查询）
  - 理由：遵循单一职责原则；与 service 层架构一致；便于独立使用

- **D-02:** 使用内部 reactive state，不创建 Pinia store
  - Composables 内部使用 `ref`/`reactive` 管理状态
  - 不引入新的 Pinia store，简化架构
  - 理由：收藏功能状态相对独立，不需要全局 store；与 `useDownload` 模式一致（使用 store 是因为下载任务需要跨多个组件共享状态）

### favoriteIds Set for O(1) Lookup (FAV-05)

- **D-03:** favoriteIds Set 实现
  ```typescript
  // useFavorites 内部状态
  const favoriteIds = ref<Set<string>>(new Set())

  // 初始化时构建 Set
  const loadFavorites = async () => {
    const result = await favoritesService.getAll()
    if (result.success && result.data) {
      favorites.value = result.data
      // 构建 Set 用于 O(1) 查询
      favoriteIds.value = new Set(result.data.map(f => f.wallpaperId))
    }
  }

  // O(1) 查询方法
  const isFavorite = (wallpaperId: string): boolean => {
    return favoriteIds.value.has(wallpaperId)
  }
  ```
  - 理由：Success criteria 要求 O(1) 时间复杂度；Set 查找是 O(1)

- **D-04:** favoriteIds 同步更新
  - 添加收藏时：`favoriteIds.value.add(wallpaperId)`
  - 移除收藏时：检查是否在其他收藏夹中，若无则 `favoriteIds.value.delete(wallpaperId)`
  - 移动收藏时：无需更新（wallpaperId 不变）
  - 理由：保持 Set 与实际数据同步

### Multi-Collection Support (FAV-06)

- **D-05:** getCollectionsForWallpaper 实现
  ```typescript
  // 返回壁纸所属的所有收藏夹名称
  const getCollectionsForWallpaper = (wallpaperId: string): string[] => {
    const favoriteItems = favorites.value.filter(f => f.wallpaperId === wallpaperId)
    const collectionIds = favoriteItems.map(f => f.collectionId)
    return collections.value
      .filter(c => collectionIds.includes(c.id))
      .map(c => c.name)
  }
  ```
  - 理由：Success criteria 要求返回所有收藏夹名称；FAV-06 支持壁纸在多个收藏夹中

### Loading/Error State Handling

- **D-06:** 异步操作状态管理
  ```typescript
  const loading = ref(false)
  const error = ref<string | null>(null)

  const withLoading = async <T>(fn: () => Promise<T>): Promise<T | null> => {
    loading.value = true
    error.value = null
    try {
      return await fn()
    } catch (e) {
      error.value = e instanceof Error ? e.message : '操作失败'
      return null
    } finally {
      loading.value = false
    }
  }
  ```
  - 理由：提供一致的加载/错误状态；便于 UI 显示 loading indicator

- **D-07:** 错误提示使用 useAlert
  - 操作失败时调用 `showError(error.message)`
  - 理由：与现有 composables 模式一致（useDownload, useSettings）

### Cross-Composable Synchronization

- **D-08:** 独立 composables，通过 service 层缓存同步
  - `useCollections` 和 `useFavorites` 各自独立
  - 数据变更时调用 service 的 `clearCache()` 方法
  - 下次加载时从 service 获取最新数据
  - 理由：service 层已有缓存机制；避免复杂的 composable 间通信

- **D-09:** 可选的刷新机制
  ```typescript
  // 在 useFavorites 中
  const refreshAfterCollectionChange = async () => {
    await favoritesService.clearCache()
    await loadFavorites()
  }
  ```
  - 理由：当收藏夹被删除时，需要刷新 favorites 列表

### Return Interface Design

- **D-10:** useCollections 返回值
  ```typescript
  interface UseCollectionsReturn {
    // 状态
    collections: ComputedRef<Collection[]>
    loading: ComputedRef<boolean>
    error: ComputedRef<string | null>

    // 方法
    load: () => Promise<void>
    create: (name: string) => Promise<boolean>
    rename: (id: string, name: string) => Promise<boolean>
    delete: (id: string) => Promise<boolean>
    getById: (id: string) => Collection | undefined
    getDefault: () => Collection | undefined
  }
  ```

- **D-11:** useFavorites 返回值
  ```typescript
  interface UseFavoritesReturn {
    // 状态
    favorites: ComputedRef<FavoriteItem[]>
    favoriteIds: ComputedRef<Set<string>>  // 只读，用于 O(1) 查询
    loading: ComputedRef<boolean>
    error: ComputedRef<string | null>

    // 方法
    load: () => Promise<void>
    add: (wallpaperId: string, collectionId: string, wallpaperData: WallpaperItem) => Promise<boolean>
    remove: (wallpaperId: string, collectionId: string) => Promise<boolean>
    move: (wallpaperId: string, fromCollectionId: string, toCollectionId: string) => Promise<boolean>
    isFavorite: (wallpaperId: string) => boolean  // O(1)
    getCollectionsForWallpaper: (wallpaperId: string) => string[]
    getByCollection: (collectionId: string) => FavoriteItem[]
  }
  ```

### Claude's Discretion

- 初始加载时机（组件挂载时自动加载 vs 手动调用 load）
- Set 的 reactive 包装方式（`ref(new Set())` vs `reactive(new Set())`）
- 错误消息的具体文案
- 是否提供 `refresh` 方法强制重新加载

</decisions>

<specifics>
## Specific Ideas

- Composable 命名遵循 `useXxx` 模式，返回值接口命名为 `UseXxxReturn`
- 文件组织：`src/composables/favorites/useCollections.ts` 和 `src/composables/favorites/useFavorites.ts`
- 与现有 composables 模式保持一致（useSettings, useDownload）

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 项目规划
- `.planning/PROJECT.md` — 项目核心价值、约束条件
- `.planning/REQUIREMENTS.md` — COLL-05, FAV-05, FAV-06 详细需求
- `.planning/ROADMAP.md` — Phase 18 定义和成功标准

### 前置阶段上下文
- `.planning/phases/16-data-layer-foundation/16-CONTEXT.md` — Repository 层设计决策
- `.planning/phases/17-business-layer-service/17-CONTEXT.md` — Service 层设计决策

### 关键代码文件（现有模式参考）

#### Composable 模式参考
- `src/composables/settings/useSettings.ts` — 表单状态管理、错误处理模式
- `src/composables/download/useDownload.ts` — 复杂状态管理、进度订阅模式
- `src/composables/index.ts` — 导出模式

#### Service 层（Phase 17 交付物）
- `src/services/collections.service.ts` — 收藏夹业务逻辑
- `src/services/favorites.service.ts` — 收藏项业务逻辑
- `src/services/index.ts` — 导出

#### 类型定义
- `src/types/favorite.ts` — Collection, FavoriteItem, FavoritesData, FavoritesErrorCodes

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

#### useSettings 模式（表单状态管理）
```typescript
// src/composables/settings/useSettings.ts
export function useSettings(): UseSettingsReturn {
  const store = useWallpaperStore()
  const { showError, showSuccess } = useAlert()

  const load = async (): Promise<boolean> => {
    const result = await settingsService.get()
    if (result.success && result.data) {
      Object.assign(store.settings, result.data)
      return true
    }
    return false
  }

  const update = async (partial: Partial<AppSettings>): Promise<boolean> => {
    Object.assign(store.settings, partial)
    const result = await settingsService.update(partial)
    if (!result.success) {
      showError('保存设置失败')
      return false
    }
    return true
  }

  return {
    settings: computed(() => store.settings),
    load,
    update,
    // ...
  }
}
```

#### useDownload 模式（复杂状态管理）
```typescript
// src/composables/download/useDownload.ts
export function useDownload(): UseDownloadReturn {
  const store = useDownloadStore()
  const { showError, showWarning } = useAlert()

  return {
    downloadingList: computed(() => store.downloadingList),
    finishedList: computed(() => store.finishedList),
    addTask,
    startDownload,
    // ...
  }
}
```

### Established Patterns

- **Composable 命名**：`useXxx` 函数，返回 `UseXxxReturn` 接口
- **状态返回**：使用 `ComputedRef` 返回只读状态
- **错误处理**：使用 `useAlert` 的 `showError`/`showWarning`
- **Service 依赖**：直接导入 service，不使用 DI
- **返回值接口**：在 composable 文件内定义导出接口

### Integration Points

- `src/composables/favorites/useCollections.ts` — 新建文件
- `src/composables/favorites/useFavorites.ts` — 新建文件
- `src/composables/index.ts` — 添加 useCollections 和 useFavorites 导出

</code_context>

<deferred>
## Deferred Ideas

None — 本阶段为组合层实现，功能明确。

### 后续阶段

- Phase 19: Collections Management UI — 收藏夹管理界面
- Phase 20: Favorites Operations UI — 收藏操作界面
- Phase 21: Favorites Browsing UI — 收藏浏览界面

</deferred>

---

*Phase: 18-composable-layer*
*Context gathered: 2026-04-28 (auto mode)*
