# Phase 5: 架构优化（服务层与状态管理）- Context

**Gathered:** 2026-05-06
**Status:** Ready for planning

<domain>
## Phase Boundary

本阶段明确服务层职责边界（ARCH-01）和统一状态管理策略（ARCH-02），将 Service 层缓存迁移到 Pinia Store，修复 download.service 跳过 Repository 层的问题。这是架构清理阶段，不涉及功能变更或 UI 变化。

**覆盖需求：**
- ARCH-01: 服务层职责边界明确化
- ARCH-02: 状态管理统一化

</domain>

<decisions>
## Implementation Decisions

### Service 层职责边界
- **D-01:** 创建 `download.repository.ts`，将 `download.service.ts` 中的 `electronClient` 调用移至 Repository 层，符合分层架构规范

### 缓存迁移策略
- **D-02:** 将 Service 层缓存逻辑（LRU/TTL）迁移到 Store，Store 内部使用 LRUCache 实例保持缓存特性
- **D-04:** 将 `favoriteStatusCache`（Map<string, 0|1|2>）迁移到 `useFavoritesStore`，逻辑上收藏状态属于收藏功能

### Service 与 Store 职责
- **D-03:** Service 层转为无状态服务层，只做错误转换、数据转换、业务规则，不持有状态

### 迁移实施
- **D-05:** 迁移顺序 - 先迁移缓存到 Store，再修复 Service 职责边界
- **D-06:** 直接删除旧代码，不保留注释或双写过渡期

### Claude's Discretion
- 各 Service 的具体缓存迁移实现细节
- LRUCache 在 Store 中的封装方式
- 无状态 Service 的具体方法签名调整

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 架构参考
- `.planning/codebase/ARCHITECTURE.md` — 现有分层架构和各层职责定义
- `.planning/codebase/CONCERNS.md` — 技术债务清单（MEDIUM-06: 服务层职责边界模糊，MEDIUM-07: 状态管理分散）

### 前序阶段
- `.planning/phases/04-code-quality-cancel-config/04-CONTEXT.md` — 前序阶段上下文
- `.planning/phases/02-performance-query-parse/02-CONTEXT.md` — 收藏状态缓存优化背景

### 需求定义
- `.planning/REQUIREMENTS.md` — ARCH-01 和 ARCH-02 需求详情
- `.planning/ROADMAP.md` — Phase 5 任务定义

### 相关源码（需理解后再修改）
- `src/services/wallpaper.service.ts` — 包含 LRUCache 和 favoriteStatusCache
- `src/services/favorites.service.ts` — 包含 cachedFavorites 和 cachedData
- `src/services/collections.service.ts` — 包含 cachedCollections 和 cachedData
- `src/services/download.service.ts` — 直接调用 electronClient，需创建 Repository
- `src/services/settings.service.ts` — 包含 cachedSettings
- `src/stores/modules/favorites/index.ts` — 收藏 Store
- `src/stores/modules/wallpaper/index.ts` — 壁纸 Store

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`LRUCache`** (lru-cache): 已在 WallpaperService 中使用，可直接迁移到 Store
- **`IPC_ERROR_CODES`** (Phase 3): 可复用的错误码常量模式
- **`createErrorResponse`** (Phase 3): 标准化错误响应辅助函数
- **`CACHE_CONFIG`** (Phase 4): 集中的缓存配置常量

### Established Patterns
- **分层架构**: Views → Composables → Services → Repositories → Clients（ESLint 强制执行）
- **状态管理**: Pinia Store 管理应用状态
- **错误处理**: 所有异步操作返回 `IpcResponse<T>` 格式
- **缓存策略**: Service 层使用 LRUCache（TTL + maxSize）

### Integration Points
- `useWallpaperList` composable — 调用 wallpaperService.search()
- `useFavorites` composable — 调用 favoritesService.getAll()
- `useCollections` composable — 调用 collectionsService.getAll()
- `useDownload` composable — 调用 downloadService 方法
- `useSettings` composable — 调用 settingsService.get()

### 当前状态分散情况
| Service | 缓存属性 | 目标 Store |
|---------|---------|-----------|
| WallpaperServiceImpl | `cache` (LRUCache) | useWallpaperStore |
| WallpaperServiceImpl | `favoriteStatusCache` (Map) | useFavoritesStore |
| FavoritesServiceImpl | `cachedFavorites` | useFavoritesStore |
| CollectionsServiceImpl | `cachedCollections` | useFavoritesStore |
| SettingsServiceImpl | `cachedSettings` | useWallpaperStore |

</code_context>

<specifics>
## Specific Ideas

- 无状态服务层意味着 Service 方法应该只做转换和验证，不缓存结果
- Store 可以持有 LRUCache 实例来保持 TTL 和 LRU 特性
- 迁移后 Composable 应该主要与 Store 交互，Service 作为可选的数据转换层

</specifics>

<deferred>
## Deferred Ideas

None — 讨论保持在阶段范围内

</deferred>

---

*Phase: 05-architecture-service-state*
*Context gathered: 2026-05-06*
