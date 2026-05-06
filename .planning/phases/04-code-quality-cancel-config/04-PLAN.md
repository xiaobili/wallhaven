# Phase 4: 代码质量（取消机制与配置）- Plan

**Phase Number:** 4
**Phase Name:** 代码质量（取消机制与配置）
**Created:** 2026-05-06
**Status:** Ready for execution
**Mode:** standard

---

## Frontmatter

```yaml
wave: 1
depends_on: []
files_modified:
  - src/config/constants.ts (新建)
  - src/services/wallpaper.service.ts
  - src/clients/api.client.ts
  - src/composables/wallpaper/useWallpaperList.ts
  - electron/main/ipc/handlers/download.handler.ts
  - src/services/wallpaperApi.ts
autonomous: true
requirements:
  - QUAL-03
  - QUAL-04
```

---

## Phase Goal

为异步操作添加取消机制（AbortController 支持），并将分散的配置值集中管理到统一的配置模块，提升代码质量和可维护性。

---

## Must-Haves (Goal-Backward Verification)

完成本阶段后，以下条件必须满足：

- [ ] 壁纸搜索请求可以在组件卸载时被取消
- [ ] 配置值集中在 `src/config/constants.ts` 中管理
- [ ] 无硬编码魔法值分散在代码中
- [ ] TypeScript 编译通过，无类型错误
- [ ] 所有现有功能正常工作（无功能回归）
- [ ] 无内存泄漏（AbortController 正确清理）

---

## Task 4.1: 配置集中化

### Metadata

```yaml
task_id: 4.1
type: execute
priority: HIGH
estimated_time: 30min
files_modified:
  - src/config/constants.ts (新建)
  - electron/main/ipc/handlers/download.handler.ts
  - src/services/wallpaper.service.ts
  - src/services/wallpaperApi.ts
requirements: [QUAL-04]
```

### Context

将分散在多个文件中的硬编码配置值集中到 `src/config/constants.ts`，按功能域分组管理。

### Read First

**MANDATORY** - 执行前必须读取以下文件：

- `electron/main/ipc/handlers/download.handler.ts:65-67` - 查看现有的 BACKOFF_BASE_MS, BACKOFF_MAX_MS, MAX_RETRIES 定义
- `src/services/wallpaper.service.ts:34-35` - 查看现有的缓存配置 maxSize, ttl
- `src/services/wallpaperApi.ts:28` - 查看现有的 CACHE_TTL 定义
- `.planning/codebase/CONVENTIONS.md` - 了解项目的常量命名规范（UPPER_SNAKE_CASE）

### Action

#### 步骤 1: 创建配置文件

创建 `src/config/constants.ts`，包含以下配置：

```typescript
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

#### 步骤 2: 更新 download.handler.ts

在 `electron/main/ipc/handlers/download.handler.ts` 文件中：

1. **删除** 第 65-67 行的硬编码定义：
   ```typescript
   // 删除这三行
   const BACKOFF_BASE_MS = 2000
   const BACKOFF_MAX_MS = 30000
   const MAX_RETRIES = 3
   ```

2. **添加** 导入语句（在文件顶部）：
   ```typescript
   // 注意：主进程文件需要使用相对路径导入 src 目录下的文件
   import { DOWNLOAD_CONFIG } from '../../src/config/constants.js'

   // 解构导入
   const { BACKOFF_BASE_MS, BACKOFF_MAX_MS, MAX_RETRIES } = DOWNLOAD_CONFIG
   ```

#### 步骤 3: 更新 wallpaper.service.ts

在 `src/services/wallpaper.service.ts` 文件中：

1. **添加** 导入语句：
   ```typescript
   import { CACHE_CONFIG } from '@/config/constants'
   ```

2. **修改** 第 33-35 行的缓存配置：
   ```typescript
   // 修改前：
   private cache = new LRUCache<string, CacheItem>({
     maxSize: 50 * 1024 * 1024,
     ttl: 5 * 60 * 1000,
     ...
   })

   // 修改后：
   private cache = new LRUCache<string, CacheItem>({
     maxSize: CACHE_CONFIG.SEARCH_MAX_SIZE_BYTES,
     ttl: CACHE_CONFIG.SEARCH_TTL_MS,
     ...
   })
   ```

#### 步骤 4: 更新 wallpaperApi.ts

在 `src/services/wallpaperApi.ts` 文件中：

1. **添加** 导入语句：
   ```typescript
   import { CACHE_CONFIG } from '@/config/constants'
   ```

2. **删除** 第 28 行的硬编码定义：
   ```typescript
   // 删除这一行
   const CACHE_TTL = 5 * 60 * 1000
   ```

3. **修改** 第 66 行的 ttl 使用：
   ```typescript
   // 修改前：
   ttl: CACHE_TTL,

   // 修改后：
   ttl: CACHE_CONFIG.SEARCH_TTL_MS,
   ```

### Acceptance Criteria

执行完成后，验证以下条件：

- [ ] `src/config/constants.ts` 文件存在且包含 DOWNLOAD_CONFIG, CACHE_CONFIG, DATABASE_CONFIG, API_CONFIG 导出
- [ ] `electron/main/ipc/handlers/download.handler.ts` 不包含硬编码的 BACKOFF_BASE_MS, BACKOFF_MAX_MS, MAX_RETRIES 定义
- [ ] `src/services/wallpaper.service.ts` 使用 CACHE_CONFIG.SEARCH_MAX_SIZE_BYTES 和 CACHE_CONFIG.SEARCH_TTL_MS
- [ ] `src/services/wallpaperApi.ts` 不包含硬编码的 CACHE_TTL 定义
- [ ] 运行 `npm run typecheck` 无错误
- [ ] 运行 `npm run build` 成功

### Verification Commands

```bash
# 检查配置文件存在
test -f src/config/constants.ts && echo "✓ Config file exists"

# 检查导入语句
grep -q "from '@/config/constants'" src/services/wallpaper.service.ts && echo "✓ wallpaper.service.ts imports config"
grep -q "from '../../src/config/constants.js'" electron/main/ipc/handlers/download.handler.ts && echo "✓ download.handler.ts imports config"

# 检查硬编码值已删除
! grep -q "^const BACKOFF_BASE_MS = 2000" electron/main/ipc/handlers/download.handler.ts && echo "✓ BACKOFF_BASE_MS removed"
! grep -q "^const CACHE_TTL = 5" src/services/wallpaperApi.ts && echo "✓ CACHE_TTL removed"

# 类型检查
npm run typecheck

# 构建
npm run build
```

---

## Task 4.2: 壁纸搜索添加取消机制

### Metadata

```yaml
task_id: 4.2
type: execute
priority: HIGH
estimated_time: 45min
files_modified:
  - src/services/wallpaper.service.ts
  - src/clients/api.client.ts
  - src/composables/wallpaper/useWallpaperList.ts
requirements: [QUAL-03]
```

### Context

为壁纸搜索的 `search` 方法添加 AbortController 支持，使请求可以在组件卸载时被取消。根据 GitNexus 分析，此方法影响范围 HIGH（4 个受影响项，19 个执行流程）。

### Read First

**MANDATORY** - 执行前必须读取以下文件：

- `src/services/wallpaper.service.ts:102-182` - 完整阅读 search 方法实现
- `src/clients/api.client.ts` - 了解 API 客户端的 get 方法签名
- `src/composables/wallpaper/useWallpaperList.ts:85-121, 128-174, 180-213` - 阅读 fetch, goToPage, loadMore 方法
- `.planning/codebase/ARCHITECTURE.md` - 了解分层架构约束
- `.planning/phases/04-code-quality-cancel-config/04-CONTEXT.md` - 了解决策 D-01, D-03, D-07, D-08

### Action

#### 步骤 1: 修改 wallpaper.service.ts search 方法

在 `src/services/wallpaper.service.ts` 文件中：

1. **修改** search 方法签名（第 103 行）：
   ```typescript
   // 修改前：
   async search(params: GetParams | null): Promise<IpcResponse<WallpaperSearchResult>>

   // 修改后：
   async search(
     params: GetParams | null,
     options?: { signal?: AbortSignal }
   ): Promise<IpcResponse<WallpaperSearchResult>>
   ```

2. **添加** 取消检查（在第 125 行 API 调用前）：
   ```typescript
   // 获取 API Key
   const apiKey = await this.getApiKey()

   // 添加：检查是否已取消
   if (options?.signal?.aborted) {
     return {
       success: false,
       error: {
         code: 'ABORTED',
         message: '搜索请求已取消',
       },
     }
   }

   // 调用 API
   const result = await apiClient.get<WallpaperSearchResult>('/search', filteredParams, apiKey, options)
   ```

#### 步骤 2: 修改 api.client.ts get 方法

在 `src/clients/api.client.ts` 文件中：

1. **修改** get 方法签名：
   ```typescript
   // 修改前：
   async get<T>(url: string, params?: Record<string, unknown>, apiKey?: string): Promise<IpcResponse<T>>

   // 修改后：
   async get<T>(
     url: string,
     params?: Record<string, unknown>,
     apiKey?: string,
     options?: { signal?: AbortSignal }
   ): Promise<IpcResponse<T>>
   ```

2. **传递** signal 到 axios 调用：
   ```typescript
   // 找到 axios.get 调用，添加 signal 参数
   const response = await axios.get(url, {
     params,
     headers,
     timeout: 30000,
     signal: options?.signal, // 添加这一行
   })
   ```

#### 步骤 3: 修改 useWallpaperList.ts

在 `src/composables/wallpaper/useWallpaperList.ts` 文件中：

1. **添加** AbortController 管理变量（在 useWallpaperList 函数内顶部）：
   ```typescript
   export function useWallpaperList(): UseWallpaperListReturn {
     const store = useWallpaperStore()
     const { showError } = useAlert()

     /** 上次查询参数（用于检测变化） */
     let lastQueryParams: GetParams | null = null

     /** 搜索请求 AbortController */
     let searchAbortController: AbortController | null = null

     // ... 其余代码
   ```

2. **修改** fetch 方法（第 85-121 行）：
   ```typescript
   const fetch = async (params: GetParams | null): Promise<boolean> => {
     // 取消前一个请求
     searchAbortController?.abort()

     // 检测搜索条件是否变化
     if (isParamsChanged(params)) {
       store.clearPageCache()
       lastQueryParams = params ? { ...params } : null
     }

     // 创建新的 AbortController
     searchAbortController = new AbortController()

     store.loading = true
     store.error = false

     try {
       const result = await wallpaperService.search(params, {
         signal: searchAbortController.signal,
       })

       // 如果请求被取消，静默返回
       if (!result.success && result.error?.code === 'ABORTED') {
         console.debug('Search request aborted:', params)
         return false
       }

       if (!result.success) {
         showError(result.error?.message || '获取壁纸失败')
         store.error = true
         store.loading = false
         return false
       }

       // ... 其余成功处理逻辑保持不变
       store.queryParams = params
       lastQueryParams = params ? { ...params } : null

       const pageData = toPageData(result.data!)
       store.totalPageData = {
         sections: [pageData],
         totalPage: pageData.totalPage,
         currentPage: pageData.currentPage,
       }

       store.setCachedPage(pageData.currentPage, pageData)
       store.currentPageData = { ...pageData }
       store.totalCount = result.data!.meta.total

       store.loading = false
       return true
     } catch (error) {
       // 处理取消错误
       if (error instanceof Error && error.name === 'AbortError') {
         console.debug('Search request aborted:', params)
         return false
       }

       showError(error instanceof Error ? error.message : '获取壁纸失败')
       store.error = true
       store.loading = false
       return false
     } finally {
       searchAbortController = null
     }
   }
   ```

3. **修改** goToPage 方法（第 128-174 行）：
   ```typescript
   const goToPage = async (page: number): Promise<boolean> => {
     // ... 边界检查代码保持不变

     // 从 API 加载时添加取消支持
     searchAbortController?.abort()
     searchAbortController = new AbortController()

     store.loading = true
     store.error = false

     try {
       const params: GetParams = { ...store.queryParams, page } as GetParams
       const result = await wallpaperService.search(params, {
         signal: searchAbortController.signal,
       })

       // 处理取消
       if (!result.success && result.error?.code === 'ABORTED') {
         console.debug('Page load request aborted:', page)
         return false
       }

       // ... 其余成功处理逻辑保持不变

     } catch (error) {
       if (error instanceof Error && error.name === 'AbortError') {
         console.debug('Page load request aborted:', page)
         return false
       }

       showError(error instanceof Error ? error.message : '获取壁纸失败')
       store.error = true
       store.loading = false
       return false
     } finally {
       searchAbortController = null
     }
   }
   ```

4. **修改** loadMore 方法（第 180-213 行）：
   ```typescript
   const loadMore = async (): Promise<boolean> => {
     // ... 前置检查代码保持不变

     searchAbortController?.abort()
     searchAbortController = new AbortController()

     store.loading = true

     try {
       const nextPage = store.totalPageData.currentPage + 1
       const params = { ...store.queryParams, page: nextPage }

       const result = await wallpaperService.search(params, {
         signal: searchAbortController.signal,
       })

       // 处理取消
       if (!result.success && result.error?.code === 'ABORTED') {
         console.debug('Load more request aborted')
         return false
       }

       // ... 其余成功处理逻辑保持不变

     } catch (error) {
       if (error instanceof Error && error.name === 'AbortError') {
         console.debug('Load more request aborted')
         return false
       }

       showError(error instanceof Error ? error.message : '加载更多失败')
       store.loading = false
       return false
     } finally {
       searchAbortController = null
     }
   }
   ```

5. **添加** onUnmounted 清理钩子（在 return 语句前）：
   ```typescript
   import { computed, onUnmounted, type ComputedRef } from 'vue'

   // ... 在 useWallpaperList 函数内，return 语句前添加

   // 组件卸载时取消进行中的请求
   onUnmounted(() => {
     searchAbortController?.abort()
   })

   return {
     // ... 原有返回值
   }
   ```

### Acceptance Criteria

执行完成后，验证以下条件：

- [ ] `src/services/wallpaper.service.ts` 的 search 方法接受可选的 `{ signal?: AbortSignal }` 参数
- [ ] `src/clients/api.client.ts` 的 get 方法传递 signal 到 axios 调用
- [ ] `src/composables/wallpaper/useWallpaperList.ts` 在 fetch, goToPage, loadMore 方法中使用 AbortController
- [ ] `useWallpaperList.ts` 在 onUnmounted 钩子中清理 AbortController
- [ ] 取消的错误被静默处理，不显示错误消息
- [ ] 运行 `npm run typecheck` 无错误
- [ ] 运行 `npm run build` 成功

### Verification Commands

```bash
# 检查方法签名
grep -q "async search(" src/services/wallpaper.service.ts && grep -q "options?: { signal?: AbortSignal }" src/services/wallpaper.service.ts && echo "✓ search method signature updated"

# 检查 signal 传递
grep -q "signal: options?.signal" src/clients/api.client.ts && echo "✓ signal passed to axios"

# 检查 AbortController 使用
grep -q "searchAbortController = new AbortController()" src/composables/wallpaper/useWallpaperList.ts && echo "✓ AbortController created"

# 检查 onUnmounted 清理
grep -q "onUnmounted(() => {" src/composables/wallpaper/useWallpaperList.ts && grep -q "searchAbortController?.abort()" src/composables/wallpaper/useWallpaperList.ts && echo "✓ Cleanup in onUnmounted"

# 类型检查
npm run typecheck

# 构建
npm run build
```

---

## Task 4.3: 验证取消机制和配置管理

### Metadata

```yaml
task_id: 4.3
type: verify
priority: HIGH
estimated_time: 30min
files_modified: []
requirements: [QUAL-03, QUAL-04]
```

### Context

验证取消机制正常工作，配置值正确应用，无内存泄漏和功能回归。

### Read First

**MANDATORY** - 执行前必须读取以下文件：

- `.planning/codebase/ARCHITECTURE.md` - 了解测试要点
- `.planning/codebase/CONCERNS.md` - 确认解决的技术债务 MEDIUM-05, LOW-03

### Action

#### 步骤 1: 功能测试

手动测试以下场景：

1. **正常壁纸搜索**
   - 打开应用，进入在线壁纸页面
   - 搜索壁纸，验证搜索结果正常显示
   - 验证收藏状态正确显示

2. **快速切换页面（取消测试）**
   - 搜索壁纸后，快速点击不同页码
   - 验证上一个请求被取消（控制台无错误）
   - 验证最终显示的是最后一个请求的结果

3. **快速切换搜索条件**
   - 快速切换不同的搜索关键词
   - 验证请求正确取消和重新发起

4. **组件卸载清理**
   - 发起搜索请求后，立即导航到其他页面
   - 验证控制台无错误
   - 验证无内存泄漏（多次切换后内存稳定）

#### 步骤 2: 下载功能验证

测试下载重试逻辑：

1. 添加下载任务
2. 模拟网络错误（断开网络）
3. 验证重试逻辑正常工作（使用 BACKOFF_BASE_MS, MAX_RETRIES 等配置）

#### 步骤 3: GitNexus 变更检测

运行 GitNexus 变更检测，确认修改范围：

```bash
# 检测变更范围
npx gitnexus detect-changes
```

预期变更：
- `src/config/constants.ts` (新建)
- `src/services/wallpaper.service.ts` (search 方法)
- `src/clients/api.client.ts` (get 方法)
- `src/composables/wallpaper/useWallpaperList.ts` (AbortController 管理)
- `electron/main/ipc/handlers/download.handler.ts` (配置导入)
- `src/services/wallpaperApi.ts` (配置导入)

#### 步骤 4: TypeScript 类型检查

```bash
npm run typecheck
```

预期结果：无类型错误

#### 步骤 5: 构建验证

```bash
npm run build
```

预期结果：构建成功

### Acceptance Criteria

执行完成后，验证以下条件：

- [ ] 壁纸搜索功能正常，搜索结果正确显示
- [ ] 快速切换页面时，控制台无取消错误（只有 debug 日志）
- [ ] 快速切换搜索条件时，最终结果正确
- [ ] 组件卸载时无错误，无内存泄漏
- [ ] 下载重试逻辑正常工作
- [ ] GitNexus 变更检测范围符合预期
- [ ] TypeScript 类型检查通过
- [ ] 构建成功

### Verification Commands

```bash
# GitNexus 变更检测
npx gitnexus detect-changes

# TypeScript 类型检查
npm run typecheck

# 构建
npm run build

# 功能测试（手动）
# 1. 正常搜索
# 2. 快速切换页面
# 3. 快速切换搜索条件
# 4. 组件卸载测试
# 5. 下载重试测试
```

---

## Wave Summary

本阶段包含 **1 个 wave**，共 **3 个任务**：

**Wave 1 (并行执行):**
- Task 4.1: 配置集中化（30min）
- Task 4.2: 壁纸搜索添加取消机制（45min）
- Task 4.3: 验证取消机制和配置管理（30min）

**总预计时间:** 1小时45分钟

---

## Verification

完成所有任务后，验证以下全局条件：

- [ ] 所有 3 个任务的 acceptance_criteria 满足
- [ ] TypeScript 编译无错误
- [ ] 构建成功
- [ ] GitNexus 变更检测范围符合预期
- [ ] 无功能回归
- [ ] 无性能退化
- [ ] 无内存泄漏

---

## Threat Model

本阶段不涉及用户输入处理、文件上传、外部系统集成等安全敏感操作，风险等级：**LOW**。

潜在风险：
- 配置值被恶意修改：配置文件在源代码中，通过 git 版本控制，风险可控
- AbortController 滥用：仅用于内部请求取消，不暴露给外部接口

---

## Rollback Plan

如果发现问题，按以下步骤回滚：

1. **配置回滚:**
   ```bash
   git revert <commit-hash-config>
   ```

2. **取消机制回滚:**
   ```bash
   git revert <commit-hash-abort>
   ```

3. **验证回滚:**
   - 运行 `npm run typecheck`
   - 运行 `npm run build`
   - 运行功能测试

---

## Notes

- 任务执行顺序：建议先执行 Task 4.1（低风险），再执行 Task 4.2（高风险），最后执行 Task 4.3（验证）
- AbortController 集成遵循 Vue 最佳实践，使用 onUnmounted 清理
- 配置集中化不改变运行时行为，仅改变定义位置
- 取消机制采用"静默取消"策略，不显示错误消息

---

*Plan created: 2026-05-06*
*Ready for execution*
