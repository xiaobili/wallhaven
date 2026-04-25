# Phase 1 Research: 基础设施与类型安全

**Research Date:** 2025-04-25
**Phase Goal:** 建立重构基础，不改变现有功能

---

## 1. Technical Context

### 1.1 当前技术栈

| 技术 | 版本 | 说明 |
|------|------|------|
| Electron | v41.2.2 | 主进程 IPC 处理 |
| Vue | v3.5.32 | Composition API |
| TypeScript | v6.0.0 | 类型系统 |
| Pinia | v3.0.4 | Setup Store 模式 |

### 1.2 现有代码结构

```
src/
├── types/
│   └── index.ts          # 所有类型定义（单文件，约 230 行）
├── main.ts               # 应用入口（无全局错误处理）
├── components/
│   └── Alert.vue         # Alert 组件（已支持 props）
└── stores/modules/wallpaper/
    └── actions.ts        # 存在 any 类型（第 13 行）

electron/preload/
└── index.ts              # ElectronAPI 接口定义（内联）

# 不存在的目录（需创建）
src/composables/          # ❌ 不存在
src/errors/               # ❌ 不存在
src/shared/types/         # ❌ 不存在
```

### 1.3 Alert 重复模式分析

当前 **4 个组件** 使用相同的 Alert 状态管理模式：

| 组件 | Alert 代码位置 | 代码行数 |
|------|----------------|----------|
| OnlineWallpaper.vue | L99-117 | ~18 行 |
| LocalWallpaper.vue | 类似位置 | ~15 行 |
| DownloadWallpaper.vue | 类似位置 | ~15 行 |
| SettingPage.vue | 类似位置 | ~15 行 |

**重复代码模式：**
```typescript
// 每个组件都重复以下代码
const alert = reactive({
  visible: false,
  type: 'info' as 'success' | 'error' | 'warning' | 'info',
  message: '',
  duration: 3000
})

const showAlert = (message, type = 'info', duration = 3000) => {
  alert.message = message
  alert.type = type
  alert.duration = duration
  alert.visible = true
}
```

### 1.4 现有 IPC 类型定义位置

当前 `ElectronAPI` 接口定义在 `electron/preload/index.ts:7-84`，包含：

- **文件操作**: `selectFolder`, `readDirectory`, `openFolder`, `deleteFile`
- **下载管理**: `downloadWallpaper`, `startDownloadTask`, `onDownloadProgress`
- **壁纸设置**: `setWallpaper`
- **设置管理**: `saveSettings`, `loadSettings`
- **API 代理**: `wallhavenApiRequest`
- **窗口控制**: `minimizeWindow`, `maximizeWindow`, `closeWindow`, `isMaximized`
- **Store 操作**: `storeGet`, `storeSet`, `storeDelete`, `storeClear`
- **缓存管理**: `clearAppCache`, `getCacheInfo`

**问题**：类型定义与实现耦合在同一文件，主进程无法引用。

---

## 2. Implementation Approaches

### ARCH-01: 创建 `src/types/` 目录结构

#### 方案 A：渐进式组织（推荐）

```
src/types/
├── index.ts              # 统一导出（保留现有内容）
├── domain/               # 领域类型（新增）
│   ├── wallpaper.ts      # WallpaperItem, PageData, TotalPageData
│   ├── download.ts       # DownloadItem, DownloadState
│   ├── settings.ts       # AppSettings, WallpaperFit
│   └── index.ts
├── api/                  # API 类型（新增）
│   ├── wallhaven.ts      # API 请求/响应类型
│   └── index.ts
└── ipc/                  # IPC 类型（新增，渲染进程专用）
    ├── channels.ts       # 通道名称常量
    ├── payloads.ts       # 请求/响应类型
    └── index.ts
```

**优点**：
- 现有代码无需修改（`@/types` 仍指向 index.ts）
- 后续阶段逐步迁移类型
- 清晰的领域边界

#### 方案 B：立即重构所有类型

将现有 `index.ts` 立即拆分到子目录。

**缺点**：
- 需要修改所有导入路径
- 阶段 1 变更范围过大
- 违反"最小变更"原则

**决策**：采用方案 A

---

### ARCH-02: 创建 `src/shared/types/ipc.ts`

#### 共享类型文件结构

```typescript
// src/shared/types/ipc.ts

// ==================== IPC 通道名称常量 ====================
export const IPC_CHANNELS = {
  // 文件操作
  SELECT_FOLDER: 'select-folder',
  READ_DIRECTORY: 'read-directory',
  OPEN_FOLDER: 'open-folder',
  DELETE_FILE: 'delete-file',
  
  // 下载
  DOWNLOAD_WALLPAPER: 'download-wallpaper',
  START_DOWNLOAD_TASK: 'start-download-task',
  DOWNLOAD_PROGRESS: 'download-progress',
  
  // ... 其他通道
} as const

// ==================== IPC 响应类型 ====================
export interface IpcResponse<T = unknown> {
  success: boolean
  data?: T
  error?: IpcErrorInfo
}

export interface IpcErrorInfo {
  code: string
  message: string
}

// ==================== 各通道的请求/响应类型 ====================
export interface SelectFolderResponse {
  path: string | null
}

export interface ReadDirectoryResponse {
  error: string | null
  files: LocalFile[]
}

// ... 其他类型定义
```

#### 目录位置选择

| 位置 | 优点 | 缺点 |
|------|------|------|
| `src/shared/types/ipc.ts` | Vite 可直接打包到渲染进程 | 需确保主进程也能访问 |
| `electron/shared/types/ipc.ts` | 主进程直接访问 | 渲染进程需相对路径导入 |

**推荐方案**：

```
src/shared/types/ipc.ts      # 主要类型定义
electron/shared/types/ipc.ts # 仅重新导出
```

或使用 Vite 的 `resolve.alias` 让主进程也能引用 `@/shared/types/ipc.ts`。

---

### ARCH-03: 创建 `src/errors/` 错误类定义

#### 错误类层次结构

```typescript
// src/errors/AppError.ts
export class AppError extends Error {
  readonly code: string
  readonly context?: Record<string, unknown>

  constructor(
    message: string,
    code: string = 'UNKNOWN_ERROR',
    context?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.context = context
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      context: this.context
    }
  }
}

// src/errors/IpcError.ts
export class IpcError extends AppError {
  readonly channel?: string

  constructor(message: string, channel?: string, context?: Record<string, unknown>) {
    super(message, 'IPC_ERROR', context)
    this.name = 'IpcError'
    this.channel = channel
  }
}

// src/errors/StoreError.ts
export class StoreError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'STORE_ERROR', context)
    this.name = 'StoreError'
  }
}

// src/errors/NetworkError.ts
export class NetworkError extends AppError {
  readonly statusCode?: number

  constructor(message: string, statusCode?: number, context?: Record<string, unknown>) {
    super(message, 'NETWORK_ERROR', context)
    this.name = 'NetworkError'
    this.statusCode = statusCode
  }
}
```

#### 错误码常量

```typescript
// src/errors/codes.ts
export const ErrorCodes = {
  // IPC 错误
  IPC_HANDLER_NOT_FOUND: 'IPC_HANDLER_NOT_FOUND',
  IPC_RESPONSE_PARSE_ERROR: 'IPC_RESPONSE_PARSE_ERROR',
  
  // Store 错误
  STORE_READ_ERROR: 'STORE_READ_ERROR',
  STORE_WRITE_ERROR: 'STORE_WRITE_ERROR',
  
  // 网络错误
  NETWORK_TIMEOUT: 'NETWORK_TIMEOUT',
  NETWORK_UNAUTHORIZED: 'NETWORK_UNAUTHORIZED',
} as const
```

---

### ARCH-04: 创建 `useAlert` composable

#### Composable 实现方案

```typescript
// src/composables/useAlert.ts
import { reactive } from 'vue'

export type AlertType = 'success' | 'error' | 'warning' | 'info'

export interface AlertState {
  visible: boolean
  type: AlertType
  message: string
  duration: number
}

export function useAlert() {
  const alert = reactive<AlertState>({
    visible: false,
    type: 'info',
    message: '',
    duration: 3000
  })

  const showAlert = (
    message: string,
    type: AlertType = 'info',
    duration: number = 3000
  ) => {
    alert.message = message
    alert.type = type
    alert.duration = duration
    alert.visible = true
  }

  const hideAlert = () => {
    alert.visible = false
  }

  // 便捷方法
  const showSuccess = (message: string, duration?: number) => 
    showAlert(message, 'success', duration)
  const showError = (message: string, duration?: number) => 
    showAlert(message, 'error', duration ?? 5000) // 错误默认更长显示时间
  const showWarning = (message: string, duration?: number) => 
    showAlert(message, 'warning', duration)
  const showInfo = (message: string, duration?: number) => 
    showAlert(message, 'info', duration)

  return {
    alert,
    showAlert,
    hideAlert,
    showSuccess,
    showError,
    showWarning,
    showInfo
  }
}
```

#### 迁移策略

**阶段 1 仅创建 composable，不修改现有组件**

后续阶段（阶段 5）再迁移各组件使用 `useAlert`：

```typescript
// 迁移前（OnlineWallpaper.vue）
const alert = reactive({ visible: false, ... })
const showAlert = (message, type, duration) => { ... }

// 迁移后
import { useAlert } from '@/composables/useAlert'
const { alert, showAlert, hideAlert } = useAlert()
```

---

### ARCH-05: 添加全局错误处理器

#### 实现方案

```typescript
// src/main.ts 修改

import { useAlert } from '@/composables/useAlert'

const app = createApp(App)

// 1. Vue 错误处理器
app.config.errorHandler = (err, instance, info) => {
  console.error('[Vue Error]', err, info)
  
  // 如果是 AppError 实例，提取结构化信息
  if (err instanceof AppError) {
    console.error('[Error Context]', err.context)
  }
  
  // 显示用户友好消息
  // 注意：此时应用可能未完全初始化，需要安全处理
}

// 2. 全局未处理 Promise rejection
window.addEventListener('unhandledrejection', (event) => {
  console.error('[Unhandled Rejection]', event.reason)
  
  // 阻止默认的控制台警告
  event.preventDefault()
  
  // 可选：显示全局错误提示
  // 需要考虑应用状态
})

// 3. 全局 JavaScript 错误
window.addEventListener('error', (event) => {
  console.error('[Global Error]', event.error)
})
```

#### 用户友好消息策略

| 错误类型 | 用户消息 | 技术处理 |
|----------|----------|----------|
| NetworkError | "网络连接失败，请检查网络" | 记录状态码和 URL |
| IpcError | "操作失败，请重试" | 记录通道名称和参数 |
| StoreError | "数据保存失败" | 记录键名和操作类型 |
| 未知错误 | "发生未知错误" | 完整记录错误栈 |

---

### ARCH-06: 消除 Store 中的 `any` 类型

#### 当前问题定位

```typescript
// src/stores/modules/wallpaper/actions.ts:13
export function createWallpaperActions(
  totalPageData: any, // ❌ 应为 ShallowRef<TotalPageData>
  loading: Ref<boolean>,
  error: Ref<boolean>,
  // ...
)
```

#### 解决方案

```typescript
// 修改后
import type { ShallowRef } from 'vue'
import type { TotalPageData } from '@/types'

export function createWallpaperActions(
  totalPageData: ShallowRef<TotalPageData>,
  loading: Ref<boolean>,
  error: Ref<boolean>,
  // ...
)
```

#### 其他 any 类型位置（后续阶段处理）

根据 CONCERNS.md 分析，以下位置存在 `any` 类型：

| 文件 | 行数 | 说明 |
|------|------|------|
| `src/services/wallpaperApi.ts` | 多处 | API 响应类型 |
| `src/utils/helpers.ts` | 多处 | 函数参数类型 |
| `electron/main/ipc/handlers.ts` | 多处 | IPC 处理参数 |
| `electron/preload/index.ts` | 多处 | 回调参数 |

**阶段 1 仅处理 `actions.ts:13`**，其他在后续阶段逐步处理。

---

## 3. Key Decisions

### 3.1 类型迁移策略

| 决策 | 选择 | 理由 |
|------|------|------|
| 现有类型是否迁移 | 否 | 保持向后兼容，减少变更范围 |
| 新类型放置位置 | 子目录 | 建立规范，后续逐步迁移 |
| 导入方式 | 统一从 `@/types` 导入 | 不改变现有导入路径 |

### 3.2 IPC 类型共享方案

| 决策 | 选择 | 理由 |
|------|------|------|
| 类型文件位置 | `src/shared/types/ipc.ts` | Vite 可打包到渲染进程 |
| 主进程访问方式 | 相对路径或符号链接 | 保持类型一致性 |
| 通道名称管理 | 常量对象 | 避免字符串拼写错误 |

### 3.3 错误类设计决策

| 决策 | 选择 | 理由 |
|------|------|------|
| 是否继承 Error | 是 | 保留标准错误行为 |
| 是否添加 context | 是 | 便于调试和日志 |
| 是否添加 code | 是 | 支持错误分类处理 |
| 是否实现 toJSON | 是 | 支持序列化传输 |

### 3.4 useAlert 设计决策

| 决策 | 选择 | 理由 |
|------|------|------|
| 是否全局单例 | 否 | 各组件独立状态 |
| 是否支持队列 | 否 | 当前使用模式为单 Alert |
| 是否支持异步关闭 | 是 | duration 参数 |

---

## 4. Validation Architecture

### 4.1 阶段验收标准

```bash
# 1. TypeScript 编译检查
npm run typecheck
# 预期：无错误

# 2. 应用启动检查
npm run dev
# 预期：应用正常启动，无控制台错误

# 3. 功能验证
# - 在线壁纸浏览
# - 本地壁纸查看
# - 下载功能
# - 设置保存
# 预期：所有功能正常运行
```

### 4.2 类型安全验证

```typescript
// 验证点 1：IPC 类型导入
import { IPC_CHANNELS } from '@/shared/types/ipc'
console.log(IPC_CHANNELS.SELECT_FOLDER) // 应输出 'select-folder'

// 验证点 2：错误类实例化
import { IpcError } from '@/errors'
const err = new IpcError('test', 'select-folder')
console.log(err.code) // 应输出 'IPC_ERROR'
console.log(err.channel) // 应输出 'select-folder'

// 验证点 3：useAlert composable
import { useAlert } from '@/composables/useAlert'
const { alert, showAlert } = useAlert()
showAlert('test', 'success')
console.log(alert.visible) // 应输出 true
```

### 4.3 回归测试清单

| 功能 | 测试方法 | 预期结果 |
|------|----------|----------|
| 应用启动 | 启动应用 | 无控制台错误 |
| Alert 显示 | 触发任何 Alert 操作 | 正常显示和关闭 |
| IPC 通信 | 执行任何 IPC 操作 | 正常响应 |
| 设置保存 | 修改设置并保存 | 持久化成功 |

---

## 5. Dependencies & Risks

### 5.1 依赖关系

```
ARCH-01 (types 目录)
    ↓
ARCH-02 (IPC 类型) ─→ 需要 ARCH-01 的目录结构
    ↓
ARCH-03 (错误类) ─→ 独立，无依赖
    ↓
ARCH-04 (useAlert) ─→ 独立，无依赖
    ↓
ARCH-05 (全局错误处理) ─→ 依赖 ARCH-03、ARCH-04
    ↓
ARCH-06 (Store any 消除) ─→ 依赖 ARCH-02 的类型定义
```

### 5.2 风险分析

| 风险 | 等级 | 缓解措施 |
|------|------|----------|
| 类型导入路径变更导致编译失败 | 🟡 中 | 保持 `@/types` 导出不变 |
| 全局错误处理器影响现有错误处理 | 🟡 中 | 捕获后继续传播，不阻断 |
| useAlert 与现有 Alert 状态冲突 | 🟢 低 | 阶段 1 不迁移组件 |
| IPC 类型与运行时不匹配 | 🔴 高 | 使用常量定义通道名 |

### 5.3 回滚策略

每个需求独立提交，可单独回滚：

```
commit 1: ARCH-01 - 创建 types 目录结构
commit 2: ARCH-02 - 创建 IPC 类型定义
commit 3: ARCH-03 - 创建错误类定义
commit 4: ARCH-04 - 创建 useAlert composable
commit 5: ARCH-05 - 添加全局错误处理器
commit 6: ARCH-06 - 消除 Store any 类型
```

---

## 6. File Impact Analysis

### 6.1 新建文件

| 文件路径 | 说明 | 预估行数 |
|----------|------|----------|
| `src/types/domain/index.ts` | 领域类型导出 | ~5 |
| `src/types/api/index.ts` | API 类型导出 | ~5 |
| `src/types/ipc/index.ts` | IPC 类型导出 | ~5 |
| `src/shared/types/ipc.ts` | IPC 类型定义 | ~150 |
| `src/errors/index.ts` | 错误类统一导出 | ~10 |
| `src/errors/AppError.ts` | 基础错误类 | ~30 |
| `src/errors/IpcError.ts` | IPC 错误类 | ~20 |
| `src/errors/StoreError.ts` | Store 错误类 | ~15 |
| `src/errors/NetworkError.ts` | 网络错误类 | ~20 |
| `src/errors/codes.ts` | 错误码常量 | ~20 |
| `src/composables/useAlert.ts` | Alert composable | ~50 |

**总计新建：约 330 行代码**

### 6.2 修改文件

| 文件路径 | 变更内容 | 影响范围 |
|----------|----------|----------|
| `src/types/index.ts` | 添加子目录导出 | 低 |
| `src/main.ts` | 添加全局错误处理器 | 中 |
| `src/stores/modules/wallpaper/actions.ts` | 修改 any 类型为具体类型 | 低 |

**总计修改：3 个文件**

### 6.3 不变更文件

| 文件路径 | 原因 |
|----------|------|
| `src/components/Alert.vue` | 保持不变，composable 与其配合使用 |
| `src/views/*.vue` | 阶段 1 不迁移组件 |
| `electron/preload/index.ts` | 阶段 4 处理 |
| `electron/main/ipc/handlers.ts` | 阶段 4 处理 |

---

## 7. Implementation Order Recommendation

基于依赖关系，推荐实现顺序：

1. **ARCH-01**: 创建 types 目录结构（无依赖）
2. **ARCH-02**: 创建 IPC 类型定义（依赖 ARCH-01）
3. **ARCH-03**: 创建错误类定义（无依赖）
4. **ARCH-04**: 创建 useAlert composable（无依赖）
5. **ARCH-05**: 添加全局错误处理器（依赖 ARCH-03、04）
6. **ARCH-06**: 消除 Store any 类型（依赖 ARCH-02）

---

## 8. Open Questions

以下问题需要在规划阶段澄清：

1. **IPC 类型共享机制**
   - 主进程如何访问 `src/shared/types/ipc.ts`？
   - 是否需要创建符号链接或复制文件？

2. **全局错误处理的 Alert 显示**
   - 全局错误时应用可能未完全初始化
   - 是否需要独立的错误显示机制？

3. **错误码国际化**
   - 当前阶段是否需要考虑多语言错误消息？
   - 建议阶段 1 仅使用中文

---

*Research completed: 2025-04-25*
*Ready for: /gsd-plan-phase 1*
