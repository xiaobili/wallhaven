# Phase 4: 代码质量（取消机制与配置）- Research

**Research Date:** 2026-05-06
**Phase:** 04-code-quality-cancel-config
**Requirements:** QUAL-03 (异步操作取消机制), QUAL-04 (配置值集中管理)

---

## Executive Summary

本阶段研究为异步操作添加取消机制（AbortController 支持）和将分散的配置值集中管理。研究重点包括：

1. **AbortController 集成点**：壁纸搜索和下载任务
2. **清理策略**：Vue onUnmounted 生命周期钩子
3. **配置集中化**：创建 src/config/constants.ts
4. **现有模式复用**：Phase 3 错误处理格式

**关键发现：**
- 壁纸搜索方法 `search` 被 3 个 composable 方法直接调用，影响范围 HIGH
- 现有代码没有 AbortController 使用记录
- 硬编码配置值分散在 3 个文件中（download.handler.ts, wallpaper.service.ts, wallpaperApi.ts）
- 需要与现有的暂停/恢复下载机制保持兼容

---

## 1. AbortController 取消机制研究

### 1.1 现有异步操作分析

根据 GitNexus 分析，需要添加取消支持的关键方法：

| 方法 | 文件 | 调用者 | 影响范围 |
|------|------|--------|----------|
| `search` | wallpaper.service.ts | fetch, goToPage, loadMore | HIGH (4 个受影响项) |
| 下载任务 | download.handler.ts | useDownload | MEDIUM (已有暂停/恢复) |

**影响分析详情：**
- `search` 方法被 `useWallpaperList` 的 3 个方法直接调用
- 间接影响 `refresh` 方法（通过 goToPage）
- 受影响模块：Wallpaper (4 hits)
- 受影响执行流程：19 个

### 1.2 AbortController API 模式

#### 标准 Web API 模式
```typescript
// 1. 创建 AbortController
const controller = new AbortController()
const signal = controller.signal

// 2. 传递给异步操作
asyncOperation({ signal })

// 3. 取消操作
controller.abort()

// 4. 异步操作中检查 signal
if (signal?.aborted) {
  throw new Error('Operation aborted')
}
```

#### Vue Composable 集成模式
```typescript
import { onUnmounted } from 'vue'

export function useAsyncOperation() {
  let abortController: AbortController | null = null

  const execute = async () => {
    // 取消前一个请求
    abortController?.abort()

    // 创建新的 AbortController
    abortController = new AbortController()

    try {
      const result = await service.operation({ signal: abortController.signal })
      return result
    } finally {
      abortController = null
    }
  }

  // 组件卸载时清理
  onUnmounted(() => {
    abortController?.abort()
  })

  return { execute }
}
```

### 1.3 壁纸搜索取消方案

**目标方法：** `WallpaperServiceImpl.search(params)`

**修改方案：**
```typescript
// 修改前
async search(params: GetParams | null): Promise<IpcResponse<WallpaperSearchResult>>

// 修改后
async search(
  params: GetParams | null,
  options?: { signal?: AbortSignal }
): Promise<IpcResponse<WallpaperSearchResult>>
```

**实现要点：**
1. 添加可选的 `options` 参数，包含 `signal`
2. 在 API 调用前检查 `signal.aborted`
3. 传递 `signal` 给底层 HTTP 客户端（如果支持）
4. 被取消时返回静默失败（不显示错误）

**调用链分析：**
```
useWallpaperList.fetch()
  └── wallpaperService.search(params, { signal })
       └── apiClient.get('/search', params, apiKey, { signal })
            └── axios.get(url, { signal })  // Axios 原生支持
```

**需要修改的文件：**
1. `src/services/wallpaper.service.ts` - 添加 signal 参数
2. `src/clients/api.client.ts` - 传递 signal 到 axios
3. `src/composables/wallpaper/useWallpaperList.ts` - 管理 AbortController

### 1.4 下载任务取消方案

**决策参考：** CONTEXT.md D-02
- AbortController 仅用于取消**新下载请求的发起**
- 已开始的下载继续使用现有的暂停/恢复机制

**实现方案：**
```typescript
// useDownload.ts
const pendingRequests = new Map<string, AbortController>()

const startDownload = async (task: DownloadTask) => {
  // 创建 AbortController 用于取消请求发起
  const controller = new AbortController()
  pendingRequests.set(task.id, controller)

  try {
    // 仅在请求阶段可取消
    const result = await downloadClient.startDownload(task, { signal: controller.signal })

    // 一旦下载开始，移除 AbortController
    pendingRequests.delete(task.id)
    return result
  } catch (error) {
    pendingRequests.delete(task.id)
    throw error
  }
}

onUnmounted(() => {
  // 取消所有待发起的下载请求
  pendingRequests.forEach(controller => controller.abort())
  pendingRequests.clear()
})
```

**与现有暂停/恢复的兼容性：**
- AbortController: 控制下载请求的**发起阶段**
- 暂停/恢复: 控制下载**执行阶段**（已在 download.handler.ts 中实现）
- 两者互不干扰，职责明确

---

## 2. 配置集中化研究

### 2.1 现有硬编码值清单

| 文件 | 变量名 | 当前值 | 用途 | 优先级 |
|------|--------|--------|------|--------|
| `download.handler.ts:65` | BACKOFF_BASE_MS | 2000 | 重试基础延迟 | HIGH |
| `download.handler.ts:66` | BACKOFF_MAX_MS | 30000 | 重试最大延迟 | HIGH |
| `download.handler.ts:67` | MAX_RETRIES | 3 | 最大重试次数 | HIGH |
| `wallpaper.service.ts:34` | maxSize | 50MB | 缓存内存限制 | MEDIUM |
| `wallpaper.service.ts:35` | ttl | 5min | 缓存 TTL | MEDIUM |
| `wallpaperApi.ts:28` | CACHE_TTL | 5min | 缓存 TTL | LOW |

**重复定义：**
- `CACHE_TTL` 在 `wallpaper.service.ts` 和 `wallpaperApi.ts` 中重复定义（都是 5 分钟）

### 2.2 配置组织方案

**决策参考：** CONTEXT.md D-04, D-05
- 创建 `src/config/constants.ts`
- 按功能域分组

**推荐结构：**
```typescript
// src/config/constants.ts

/**
 * 应用配置常量
 * 集中管理所有硬编码值，便于维护和调整
 */

/**
 * 下载配置
 */
export const DOWNLOAD_CONFIG = {
  /** 重试基础延迟（毫秒） */
  BACKOFF_BASE_MS: 2000,
  /** 重试最大延迟（毫秒） */
  BACKOFF_MAX_MS: 30000,
  /** 最大重试次数 */
  MAX_RETRIES: 3,
  /** 进度更新间隔（毫秒）— Phase 1 优化 */
  PROGRESS_UPDATE_INTERVAL_MS: 300,
} as const

/**
 * 缓存配置
 */
export const CACHE_CONFIG = {
  /** 搜索结果缓存 TTL（毫秒） */
  SEARCH_TTL_MS: 5 * 60 * 1000, // 5 分钟
  /** 搜索结果缓存最大内存（字节） */
  SEARCH_MAX_SIZE_BYTES: 50 * 1024 * 1024, // 50 MB
  /** 收藏状态缓存 TTL（毫秒） */
  FAVORITE_STATUS_TTL_MS: 10 * 60 * 1000, // 10 分钟
} as const

/**
 * 数据库配置
 */
export const DATABASE_CONFIG = {
  /** WAL 检查点间隔（毫秒） */
  CHECKPOINT_INTERVAL_MS: 5 * 60 * 1000,
  /** WAL 大小阈值（字节） */
  WAL_SIZE_THRESHOLD_BYTES: 10 * 1024 * 1024,
} as const

/**
 * API 配置
 */
export const API_CONFIG = {
  /** 请求超时（毫秒） */
  REQUEST_TIMEOUT_MS: 30000,
  /** API 基础 URL */
  BASE_URL: 'https://wallhaven.cc/api/v1',
} as const
```

### 2.3 迁移策略

**步骤：**
1. 创建 `src/config/constants.ts`
2. 逐个迁移硬编码值
3. 更新引用点导入语句
4. 删除原位置的硬编码定义
5. 验证功能正常

**引用点更新示例：**
```typescript
// 修改前 - download.handler.ts
const BACKOFF_BASE_MS = 2000
const BACKOFF_MAX_MS = 30000
const MAX_RETRIES = 3

// 修改后 - download.handler.ts
import { DOWNLOAD_CONFIG } from '../../src/config/constants.js'

const { BACKOFF_BASE_MS, BACKOFF_MAX_MS, MAX_RETRIES } = DOWNLOAD_CONFIG
```

**注意事项：**
- 主进程文件需要使用 `.js` 扩展名导入（Electron 编译后）
- 使用 `as const` 确保类型安全
- 保持向后兼容（值不变）

---

## 3. 清理策略研究

### 3.1 Vue 生命周期清理

**决策参考：** CONTEXT.md D-07, D-08
- 使用 `onUnmounted` 钩子
- 静默取消，保持当前 Store 状态

**实现模式：**
```typescript
import { onUnmounted } from 'vue'

export function useWallpaperList() {
  let searchAbortController: AbortController | null = null

  const fetch = async (params: GetParams | null): Promise<boolean> => {
    // 取消前一个请求
    searchAbortController?.abort()

    // 创建新的 AbortController
    searchAbortController = new AbortController()

    try {
      const result = await wallpaperService.search(params, {
        signal: searchAbortController.signal
      })

      // 正常处理结果...
      return result.success
    } catch (error) {
      // 如果是取消错误，静默返回
      if (error instanceof Error && error.name === 'AbortError') {
        return false
      }
      // 其他错误正常处理
      throw error
    } finally {
      searchAbortController = null
    }
  }

  // 组件卸载时清理
  onUnmounted(() => {
    searchAbortController?.abort()
  })

  return { fetch }
}
```

### 3.2 Store 状态保持策略

**决策参考：** CONTEXT.md D-08
- 请求被取消时，保持当前 Store 状态不变
- 避免清空数据或设置错误状态
- 用户看到的是最后一次成功加载的数据

**实现要点：**
```typescript
try {
  const result = await wallpaperService.search(params, { signal })

  if (!result.success) {
    // 只有非取消错误才更新 Store
    store.error = true
    return false
  }

  // 成功时更新 Store
  store.queryParams = params
  store.totalPageData = transformData(result.data)
  return true
} catch (error) {
  if (error instanceof Error && error.name === 'AbortError') {
    // 取消错误：保持当前状态，静默返回
    console.debug('Request aborted:', params)
    return false
  }
  // 其他错误：正常处理
  throw error
}
```

---

## 4. 风险评估与缓解

### 4.1 高风险修改点

#### wallpaper.service.ts search 方法
**风险等级：** HIGH
**影响范围：** 4 个受影响项，19 个执行流程

**缓解措施：**
1. **渐进式修改**
   - 先添加可选参数，保持向后兼容
   - 逐步在调用点传递 signal
   - 不破坏现有调用方式

2. **充分测试**
   - 测试正常搜索流程
   - 测试页面切换取消
   - 测试快速连续请求
   - 测试并发请求

3. **监控点**
   - GitNexus detect_changes 验证修改范围
   - TypeScript 类型检查
   - 功能回归测试

#### download.handler.ts 配置迁移
**风险等级：** MEDIUM
**影响范围：** 下载重试逻辑

**缓解措施：**
1. 保持值不变，仅改变定义位置
2. 导入路径使用相对路径（Electron 主进程）
3. 验证下载重试逻辑正常工作

### 4.2 中风险修改点

#### API Client 修改
**风险等级：** MEDIUM
**影响范围：** 所有 API 调用

**缓解措施：**
1. signal 参数设为可选
2. 只在显式传递时使用
3. 不影响现有 API 调用

### 4.3 测试策略

**功能测试清单：**
- [ ] 正常壁纸搜索
- [ ] 快速切换页面（取消前一个请求）
- [ ] 快速切换搜索条件
- [ ] 组件卸载时的请求清理
- [ ] 下载任务发起后取消
- [ ] 下载进行中暂停/恢复（不受 AbortController 影响）
- [ ] 配置值正确应用

**性能验证：**
- [ ] 无内存泄漏（AbortController 正确清理）
- [ ] 无性能退化
- [ ] TypeScript 编译通过

---

## 5. 实现建议

### 5.1 任务执行顺序

**推荐顺序：**
1. **Task 4.2** - 配置集中化（低风险，独立）
2. **Task 4.1** - 取消机制（高风险，依赖理解）
3. **Task 4.3** - 验证测试

**理由：**
- 配置集中化不涉及运行时行为变更，风险最低
- 取消机制需要充分测试，放在中间有足够验证时间
- 验证测试在最后确认所有修改正常工作

### 5.2 AbortController 实现优先级

**P0 - 必须实现：**
- 壁纸搜索 `search` 方法

**P1 - 建议实现：**
- 下载请求发起阶段

**P2 - 可选实现：**
- 其他异步操作（本次阶段范围外）

### 5.3 配置迁移优先级

**必须迁移：**
- BACKOFF_BASE_MS, BACKOFF_MAX_MS, MAX_RETRIES
- 缓存 TTL 和大小配置

**建议迁移：**
- 数据库相关配置（为未来统一管理做准备）

---

## 6. 参考资源

### 6.1 相关文档
- `.planning/codebase/ARCHITECTURE.md` - 分层架构
- `.planning/codebase/CONCERNS.md` - MEDIUM-05, LOW-03
- `.planning/phases/03-code-quality-error-types/03-CONTEXT.md` - 错误处理模式

### 6.2 前序阶段
- Phase 1: 性能优化（下载与缓存）- 已完成
- Phase 2: 性能优化（查询与解析）- 已完成
- Phase 3: 代码质量（错误处理与类型）- 已完成

### 6.3 GitNexus 分析
- 受影响符号：`search` 方法
- 影响范围：HIGH (4 个受影响项)
- 受影响流程：19 个执行流程

---

## 7. 技术决策总结

| 决策点 | 选择 | 理由 |
|--------|------|------|
| 取消范围 | 搜索 + 下载 | 最频繁的异步操作 |
| 下载取消行为 | 仅取消新请求 | 与现有暂停/恢复兼容 |
| 配置存储方式 | TypeScript 常量 | 简洁高效，编译时确定 |
| 配置组织方式 | 按功能域分组 | 便于维护和扩展 |
| 清理触发时机 | onUnmounted | 遵循 Vue 最佳实践 |
| 取消后状态处理 | 保持现有状态 | 避免 UI 闪烁 |

---

*Research completed: 2026-05-06*
*Next step: Run gsd-planner to create PLAN.md*
