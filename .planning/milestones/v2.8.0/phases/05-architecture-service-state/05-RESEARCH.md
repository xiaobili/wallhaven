# Phase 5: 架构优化（服务层与状态管理）- Research

**Phase:** 05-architecture-service-state
**Research Date:** 2026-05-06

---

## 1. 现有架构分析

### 1.1 分层架构

项目采用严格分层架构：
```
Views → Composables → Services → Repositories → Clients
```

ESLint 规则强制 Views 层禁止直接导入 stores。

### 1.2 Service 层缓存现状

| Service | 缓存属性 | 类型 | TTL | 用途 |
|---------|---------|------|-----|------|
| WallpaperServiceImpl | `cache` | LRUCache | 5分钟 | 搜索结果缓存 |
| WallpaperServiceImpl | `favoriteStatusCache` | Map | 无限 | 收藏状态缓存 |
| FavoritesServiceImpl | `cachedFavorites` | Array/null | 无限 | 收藏项列表 |
| CollectionsServiceImpl | `cachedCollections` | Array/null | 无限 | 收藏夹列表 |
| SettingsServiceImpl | `cachedSettings` | Object/null | 无限 | 设置缓存 |

### 1.3 状态管理现状

**Pinia Stores:**
- `useWallpaperStore` - 包含 `pageCache`（Map），与 WallpaperService.cache 功能重叠
- `useFavoritesStore` - 包含 `favorites`、`collections`，与 Service 缓存重复
- `useDownloadStore` - 下载任务状态

**状态同步问题：**
- Store 的 `loadFavorites()` 调用 Service 的 `getAll()`
- Service 有缓存，Store 也有状态
- 双重缓存导致同步复杂

---

## 2. DownloadService 架构违规分析

### 2.1 问题代码位置

`src/services/download.service.ts` 直接导入和使用 `electronClient`：

```typescript
// 第 13 行
import { electronClient } from '@/clients'

// 第 43 行 - 事件监听
electronClient.onDownloadProgress((data) => {...})

// 第 84 行 - 选择文件夹
const selectResult = await electronClient.selectFolder()

// 第 136 行 - 文件存在检查
const existsResult = await electronClient.fileExists(fullPath)

// 第 141 行 - 下载壁纸
return electronClient.downloadWallpaper({...})

// 第 165 行 - 开始下载任务
return electronClient.startDownloadTask({...})

// 第 178 行 - 暂停任务
return electronClient.pauseDownloadTask(taskId)

// 第 186 行 - 取消任务
return electronClient.cancelDownloadTask(taskId)

// 第 206 行 - 恢复任务
return electronClient.resumeDownloadTask(params)

// 第 214 行 - 获取待恢复任务
return electronClient.getPendingDownloads()

// 第 262 行 - 清理孤儿文件
return electronClient.cleanupOrphanFiles(pathResult.data)
```

### 2.2 现有 Repository 模式参考

`src/repositories/download.repository.ts` 展示了正确的模式：
- 使用 `electronClient` 进行 IPC 调用
- 封装存储逻辑（CRUD 操作）
- 返回 `IpcResponse<T>` 格式

### 2.3 解决方案

创建 `src/repositories/download-task.repository.ts`，封装所有下载任务相关的 IPC 调用：

```typescript
// 新文件需要封装的方法：
export const downloadTaskRepository = {
  selectFolder(): Promise<IpcResponse<string>>,
  fileExists(path: string): Promise<IpcResponse<boolean>>,
  downloadWallpaper(params): Promise<IpcResponse<string>>,
  startDownloadTask(params): Promise<IpcResponse<string>>,
  pauseDownloadTask(taskId): Promise<IpcResponse<void>>,
  cancelDownloadTask(taskId): Promise<IpcResponse<void>>,
  resumeDownloadTask(params): Promise<IpcResponse<string>>,
  getPendingDownloads(): Promise<IpcResponse<PendingDownload[]>>,
  cleanupOrphanFiles(path): Promise<IpcResponse<{...}>>,
  onDownloadProgress(callback): void,
}
```

---

## 3. 缓存迁移策略

### 3.1 LRUCache 在 Store 中的使用

**现有 WallpaperService LRUCache 配置：**
```typescript
private cache = new LRUCache<string, CacheItem>({
  maxSize: CACHE_CONFIG.SEARCH_MAX_SIZE_BYTES, // 50 MB
  ttl: CACHE_CONFIG.SEARCH_TTL_MS, // 5 分钟
  sizeCalculation: (value) => JSON.stringify(value.data).length,
})
```

**Store 中使用 LRUCache 的方式：**
```typescript
// useWallpaperStore 内部
import LRUCache from 'lru-cache'

// 私有缓存实例
const searchCache = new LRUCache<string, CacheItem>({...})

// 暴露缓存操作方法
function getCachedSearch(key: string) {...}
function setCachedSearch(key: string, data: unknown) {...}
function clearSearchCache() {...}
```

### 3.2 迁移优先级

按依赖关系排序：

1. **Wave 1: useFavoritesStore 迁移**
   - FavoritesServiceImpl.cachedFavorites → useFavoritesStore
   - CollectionsServiceImpl.cachedCollections → useFavoritesStore
   - WallpaperServiceImpl.favoriteStatusCache → useFavoritesStore
   - 原因：收藏功能相对独立，影响范围小

2. **Wave 2: useWallpaperStore 迁移**
   - WallpaperServiceImpl.cache (LRUCache) → useWallpaperStore
   - SettingsServiceImpl.cachedSettings → useWallpaperStore
   - 原因：壁纸搜索是核心功能，依赖收藏状态缓存

3. **Wave 3: Service 职责修复**
   - 创建 download-task.repository.ts
   - 重构 DownloadServiceImpl 使用 Repository
   - 移除所有 Service 缓存代码

### 3.3 无状态 Service 层模式

迁移后的 Service 层只做：
- 数据转换
- 错误格式化
- 业务规则验证

```typescript
// 示例：无状态的 WallpaperService
class WallpaperServiceImpl {
  // 不再有 cache 属性
  
  async search(params, options?): Promise<IpcResponse<...>> {
    // 直接调用 Repository
    const result = await wallpaperRepository.search(params, options)
    
    // 只做数据转换
    if (result.success && result.data) {
      result.data = this.transformResults(result.data)
    }
    
    return result
  }
  
  private transformResults(data) {
    // 纯转换逻辑，无状态
    return data
  }
}
```

---

## 4. 关键文件清单

### 4.1 需要修改的文件

| 文件 | 修改类型 | 影响 |
|------|---------|------|
| `src/stores/modules/favorites/index.ts` | 添加缓存 | 高 |
| `src/stores/modules/wallpaper/index.ts` | 添加缓存 | 高 |
| `src/services/wallpaper.service.ts` | 移除缓存，简化方法 | 高 |
| `src/services/favorites.service.ts` | 移除缓存，简化方法 | 高 |
| `src/services/collections.service.ts` | 移除缓存，简化方法 | 高 |
| `src/services/settings.service.ts` | 移除缓存，简化方法 | 中 |
| `src/services/download.service.ts` | 使用 Repository | 高 |
| `src/composables/favorites/useFavorites.ts` | 更新调用方式 | 中 |
| `src/composables/favorites/useCollections.ts` | 更新调用方式 | 中 |
| `src/composables/wallpaper/useWallpaperList.ts` | 更新调用方式 | 中 |

### 4.2 需要创建的文件

| 文件 | 用途 |
|------|------|
| `src/repositories/download-task.repository.ts` | 下载任务 IPC 调用封装 |

### 4.3 需要更新的导出

| 文件 | 更新内容 |
|------|---------|
| `src/repositories/index.ts` | 导出 downloadTaskRepository |

---

## 5. 风险评估

### 5.1 高风险点

1. **状态同步**：迁移期间可能存在 Store 和 Service 缓存并存
   - 缓解：按 Wave 顺序迁移，每个 Wave 完成后验证

2. **收藏功能中断**：favoritesService.cachedFavorites 被多处引用
   - 缓解：先更新所有引用点，再删除旧缓存

3. **下载功能破坏**：downloadService 重构影响下载核心流程
   - 缓解：创建 Repository 后，Service 方法逐个迁移

### 5.2 回滚策略

- 每个提交独立可回滚
- 使用 GitNexus detect_changes 验证修改范围

---

## 6. 验证清单

- [ ] 所有 Service 无缓存属性
- [ ] DownloadService 不直接导入 electronClient
- [ ] 所有 Store 持有各自的缓存实例
- [ ] Composable 层调用方式正确
- [ ] TypeScript 编译通过
- [ ] 功能测试：收藏、壁纸搜索、下载

---

*Research completed: 2026-05-06*
