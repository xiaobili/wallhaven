# 代码规范文档

> 最后更新: 2026-05-06

## 概述

本文档描述 Wallhaven 壁纸浏览器的代码风格、命名约定和编程模式。

---

## TypeScript 规范

### 类型定义

**优先使用 interface 而非 type**:
```typescript
// ✅ 推荐
interface WallpaperItem {
  id: string
  url: string
  resolution: string
}

// ❌ 避免 (除非需要联合类型、映射类型等)
type WallpaperItem = {
  id: string
  url: string
}
```

**使用类型守卫进行运行时验证**:
```typescript
// src/types/ipc.ts
export function isIpcErrorInfo(value: unknown): value is IpcErrorInfo {
  return (
    typeof value === 'object' &&
    value !== null &&
    'code' in value &&
    'message' in value &&
    typeof (value as IpcErrorInfo).code === 'string' &&
    typeof (value as IpcErrorInfo).message === 'string'
  )
}
```

### 导出风格

**统一导出模式**:
```typescript
// ✅ 推荐: 具名导出 + 统一导出入口
// src/services/wallpaper.service.ts
export class WallpaperServiceImpl { ... }
export const wallpaperService = new WallpaperServiceImpl()

// src/services/index.ts
export { wallpaperService } from './wallpaper.service'
```

---

## 命名约定

### 变量和函数

| 类型 | 命名风格 | 示例 |
|------|----------|------|
| 变量 | camelCase | `wallpaperList`, `selectedId` |
| 常量 | UPPER_SNAKE_CASE | `CACHE_TTL`, `MAX_RETRIES` |
| 函数 | camelCase | `getWallpaperList`, `handleDownload` |
| 类 | PascalCase | `WallpaperServiceImpl` |
| 接口 | PascalCase | `WallpaperItem`, `IpcResponse` |
| 类型别名 | PascalCase | `FavoritesStatusMapResponse` |

### 文件命名

| 类型 | 命名风格 | 示例 |
|------|----------|------|
| Vue 组件 | PascalCase | `WallpaperCard.vue` |
| Composable | camelCase + use 前缀 | `useWallpaperList.ts` |
| Service | camelCase + .service | `wallpaper.service.ts` |
| Repository | camelCase + .repository | `favorites.repository.ts` |
| Client | camelCase + .client | `download.client.ts` |
| Handler | kebab-case + .handler | `download.handler.ts` |
| 类型定义 | camelCase | `wallpaper.ts` |
| 测试文件 | 原名 + .spec.ts | `App.spec.ts` |

### IPC 通道命名

**kebab-case 风格**:
```typescript
// src/types/ipc.ts
export const IPC_CHANNELS = {
  SELECT_FOLDER: 'select-folder',
  START_DOWNLOAD_TASK: 'start-download-task',
  FAVORITES_GET_COLLECTIONS: 'favorites-get-collections',
}
```

---

## Vue 组件规范

### Composable 模式

**必须使用组合式 API**:
```vue
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useWallpaperList } from '@/composables'

const { wallpapers, loading, search } = useWallpaperList()

// 响应式状态
const selectedId = ref<string | null>(null)

// 计算属性
const hasSelection = computed(() => selectedId.value !== null)

// 生命周期
onMounted(() => {
  search()
})
</script>
```

### Props 定义

**使用 TypeScript 接口**:
```typescript
interface Props {
  wallpaper: WallpaperItem
  selectable?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  selectable: true
})
```

### Emits 定义

**使用类型化 emits**:
```typescript
interface Emits {
  (e: 'select', id: string): void
  (e: 'download', item: WallpaperItem): void
}

const emit = defineEmits<Emits>()
```

---

## 错误处理规范

### 错误类层次

```
AppError (基类)
├── NetworkError  (网络错误)
├── IpcError      (IPC 通信错误)
└── StoreError    (存储错误)
```

### AppError 使用

```typescript
// src/errors/AppError.ts
export class AppError extends Error {
  readonly code: string
  readonly context?: Record<string, unknown>
  readonly cause?: Error

  constructor(message: string, options?: AppErrorOptions) {
    super(message)
    this.name = 'AppError'
    this.code = options?.code ?? 'UNKNOWN_ERROR'
    this.context = options?.context
    this.cause = options?.cause
  }
}

// 使用示例
throw new AppError('下载失败', {
  code: 'DOWNLOAD_FAILED',
  context: { url, taskId },
  cause: originalError
})
```

### IPC 响应格式

**统一的响应结构**:
```typescript
interface IpcResponse<T = unknown> {
  success: boolean
  data?: T
  error?: IpcErrorInfo
}

interface IpcErrorInfo {
  code: string
  message: string
}
```

**Handler 模式**:
```typescript
ipcMain.handle('some-channel', async (event, params) => {
  try {
    const result = await doSomething(params)
    return { success: true, data: result }
  } catch (error) {
    const appError = error instanceof AppError
      ? error
      : new AppError('操作失败', { cause: error as Error })

    return {
      success: false,
      error: {
        code: appError.code,
        message: appError.message
      }
    }
  }
})
```

---

## 异步处理规范

### Promise 处理

**使用 async/await**:
```typescript
// ✅ 推荐
async function fetchWallpaper(id: string) {
  try {
    const response = await apiClient.get(`/w/${id}`)
    return { success: true, data: response.data }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

// ❌ 避免
function fetchWallpaper(id: string) {
  return apiClient.get(`/w/${id}`)
    .then(response => ({ success: true, data: response.data }))
    .catch(error => ({ success: false, error: error.message }))
}
```

### 并发控制

**使用 DownloadQueue 进行并发管理**:
```typescript
// electron/main/ipc/handlers/download-queue.ts
class DownloadQueue {
  private queue: Map<string, ActiveDownload> = new Map()
  private maxConcurrent = 3

  async enqueue(download: ActiveDownload) {
    this.queue.set(download.taskId, download)
    await this.processQueue()
  }
}
```

---

## 缓存规范

### Service 层缓存

**Map + TTL 模式**:
```typescript
class WallpaperServiceImpl {
  private cache = new Map<string, CacheItem>()
  private readonly CACHE_TTL = 5 * 60 * 1000  // 5 分钟
  private readonly MAX_CACHE_SIZE = 50

  private getFromCache(key: string): WallpaperSearchResult | null {
    const item = this.cache.get(key)
    if (!item) return null
    if (Date.now() - item.timestamp > this.CACHE_TTL) {
      this.cache.delete(key)
      return null
    }
    return item.data
  }

  private setCache(key: string, data: WallpaperSearchResult) {
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      const firstKey = this.cache.keys().next().value
      this.cache.delete(firstKey)
    }
    this.cache.set(key, { data, timestamp: Date.now() })
  }
}
```

---

## 注释规范

### JSDoc 格式

**类和方法注释**:
```typescript
/**
 * 壁纸服务实现
 * 提供壁纸搜索、详情获取等功能
 */
export class WallpaperServiceImpl {
  /**
   * 搜索壁纸
   * @param params 搜索参数
   * @returns 搜索结果
   */
  async search(params: GetParams | null): Promise<IpcResponse<WallpaperSearchResult>> {
    // ...
  }
}
```

### 代码注释

**解释 "为什么" 而非 "是什么"**:
```typescript
// ✅ 推荐
// WebP 格式需要更多字节才能解析尺寸，直接返回 0
// 后续可通过 sharp 库进行可靠解析
if (isWebP) {
  width = 0
  height = 0
}

// ❌ 避免
// 设置 width 为 0
width = 0
```

---

## 架构约束

### 分层依赖规则

**由 ESLint 强制执行**:
```javascript
// eslint.config.js
{
  files: ['src/views/**/*.{vue,ts}'],
  rules: {
    'no-restricted-imports': ['error', {
      patterns: [{
        group: ['@/stores/*'],
        message: 'Views must import from @/composables, not @/stores.'
      }]
    }]
  }
}
```

**依赖方向**:
```
Views → Composables → Services → Repositories → Clients
                ↓
              Stores
```

### 禁止的模式

```typescript
// ❌ Views 直接导入 stores
import { useWallpaperStore } from '@/stores'

// ✅ Views 通过 composables 访问
import { useWallpaperList } from '@/composables'
const { wallpapers } = useWallpaperList()
```

---

## 代码格式化

### Prettier 配置

```json
// .prettierrc.json
{
  "semi": false,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "none",
  "printWidth": 100
}
```

### ESLint 配置

```javascript
// eslint.config.js
export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...pluginVue.configs['flat/recommended'],
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off'
    }
  }
]
```

---

## Git 提交规范

### 提交消息格式

```
<type>(<scope>): <subject>

<body>

<footer>
```

**类型**:
- `feat`: 新功能
- `fix`: Bug 修复
- `docs`: 文档更新
- `style`: 代码格式
- `refactor`: 重构
- `test`: 测试
- `chore`: 构建/工具

**示例**:
```
feat(download): 添加断点续传支持

- 支持HTTP Range请求
- 添加下载状态持久化
- 实现指数退避重试

Closes #123
```

---

## 最佳实践

### 避免魔法数字

```typescript
// ❌ 避免
setTimeout(() => {}, 5000)

// ✅ 推荐
const DEBOUNCE_DELAY_MS = 5000
setTimeout(() => {}, DEBOUNCE_DELAY_MS)
```

### 使用类型守卫

```typescript
// ❌ 避免
const data = result as WallpaperItem

// ✅ 推荐
if (isWallpaperItem(result)) {
  const data = result
}
```

### 错误边界处理

```typescript
// ✅ 推荐: 始终处理错误情况
const result = await wallpaperService.search(params)
if (result.success) {
  // 处理成功情况
} else {
  // 处理错误情况
  console.error(result.error?.message)
}
```
