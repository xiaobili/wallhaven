# Phase 4: IPC 模块化重构 - Context

**Gathered:** 2025-04-25
**Status:** Ready for planning

<domain>
## Phase Boundary

拆分 866 行的 `handlers.ts`，实现领域模块化。包括：
- 创建 IPC 基础类型和工具函数（base.ts）
- 按功能域拆分为 8 个 handler 文件
- 实现统一错误处理包装器
- 更新 Preload 脚本类型定义和通道验证

**核心约束**：
- IPC 通道名称和消息格式保持向后兼容
- 所有现有功能行为保持不变
- 存储键名不变

**阶段边界**：
- 本阶段仅重构 IPC 层代码组织，不改变任何功能行为
- 安全加固（通道验证）在本阶段完成
- 组件层使用 IPC 的代码不在本阶段修改范围

</domain>

<decisions>
## Implementation Decisions

### Handler 拆分策略

- **D-01:** 按功能域拆分为 8 个 handler 文件
  - `file.handler.ts` — 文件操作（select-folder, read-directory, delete-file, open-folder）
  - `download.handler.ts` — 下载管理（download-wallpaper, start-download-task）
  - `settings.handler.ts` — 设置存储（save-settings, load-settings）
  - `wallpaper.handler.ts` — 壁纸设置（set-wallpaper）
  - `window.handler.ts` — 窗口控制（window-minimize, window-maximize, window-close, window-is-maximized）
  - `cache.handler.ts` — 缓存管理（clear-app-cache, get-cache-info）
  - `api.handler.ts` — API 代理（wallhaven-api-request）
  - `store.handler.ts` — Electron Store（store-get, store-set, store-delete, store-clear）

- **D-02:** 在 `electron/main/ipc/` 下创建 `handlers/` 子目录
  - 所有 handler 文件放入 `handlers/` 目录
  - `handlers/index.ts` 统一导入并注册所有 handler
  - 原 `handlers.ts` 删除，由新模块替代

- **D-03:** 共享工具函数抽取到 `base.ts`
  - `getImageDimensions()` — 图片尺寸解析
  - `generateThumbnail()` — 缩略图生成
  - `streamPipeline` — 流管道工具
  - 类型定义（Handler 函数签名等）

### 错误处理包装器

- **D-04:** 复用阶段 1 创建的错误类
  - 使用 `IpcError` 包装 IPC 相关错误
  - 使用 `StoreError` 包装存储相关错误
  - 在 handler 中使用 try-catch 捕获并转换为统一格式

- **D-05:** 统一所有 IPC handler 响应格式
  - 格式：`{ success: boolean, data?: T, error?: { code: string, message: string } }`
  - 与阶段 1 定义的 `IpcResponse<T>` 类型一致
  - 现有不一致的返回格式需统一

### Preload 类型同步

- **D-06:** 创建共享类型文件
  - 在 `electron/preload/types.ts` 定义 IPC 通道类型
  - 定义 `IpcChannel` 枚举或常量列表
  - 定义各通道的请求/响应类型
  - 主进程和渲染进程共同引用

- **D-07:** 添加 IPC 通道白名单验证
  - 在 preload 中添加 `invoke` 通道白名单
  - 只允许已注册的通道通过
  - 非法通道调用抛出安全错误

### 注册机制

- **D-08:** 创建统一注册文件
  - `handlers/index.ts` 统一导入所有 handler 模块
  - 提供 `registerAllHandlers()` 函数供 main/index.ts 调用
  - 添加完整性检查：确保所有通道都已注册

### 日志处理

- **D-09:** 创建统一日志工具
  - 在 `base.ts` 中添加 `logHandler` 工具函数
  - 支持错误日志、调试日志
  - 过滤敏感信息（如 API Key）
  - 统一日志格式：`[HandlerName] message`

### Claude's Discretion

- 具体 handler 文件的内部实现细节
- 类型定义的具体结构和命名
- 完整性检查的具体实现方式
- 日志过滤的具体规则

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 项目规划
- `.planning/PROJECT.md` — 项目核心价值、约束条件、需求范围
- `.planning/REQUIREMENTS.md` — 详细需求列表（IPC-01 ~ IPC-10）
- `.planning/ROADMAP.md` — 阶段划分和依赖关系
- `.planning/STATE.md` — 当前项目状态

### 前置阶段
- `.planning/phases/01-infrastructure-typesafety/01-CONTEXT.md` — 阶段 1 上下文（错误类、IPC 类型）
- `.planning/phases/02-data-layer-abstraction/02-CONTEXT.md` — 阶段 2 上下文
- `.planning/phases/03-business-composable-layer/03-CONTEXT.md` — 阶段 3 上下文

### 代码库分析
- `.planning/codebase/ARCHITECTURE.md` — 现有架构、IPC 通道列表
- `.planning/codebase/CONCERNS.md` — 技术债务清单、安全问题

### 关键代码文件

#### 需要拆分的文件
- `electron/main/ipc/handlers.ts` — 866 行，需要拆分

#### 需要更新的文件
- `electron/preload/index.ts` — Preload 脚本，需要添加通道验证
- `electron/main/index.ts` — 主进程入口，需要更新 handler 注册方式

#### 已创建的基础设施（阶段 1）
- `src/errors/` — 错误类层次（AppError, IpcError, StoreError 等）
- `src/shared/types/ipc.ts` — IPC 类型定义（IpcResponse 等）

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

#### 阶段 1 创建的错误类
- `AppError` — 基础错误类，包含 code、message、context 属性
- `IpcError` — IPC 错误类
- `StoreError` — 存储错误类
- `NetworkError` — 网络错误类

#### 阶段 1 创建的 IPC 类型
- `IpcResponse<T>` — 统一响应格式 `{ success, data?, error? }`

### Established Patterns

#### 现有 IPC 通道（共 18 个）
| 通道 | 功能 | 预估行数 |
|------|------|----------|
| select-folder | 文件夹选择 | ~15 |
| read-directory | 目录读取+缩略图 | ~55 |
| delete-file | 文件删除 | ~15 |
| open-folder | 打开文件夹 | ~10 |
| download-wallpaper | 简单下载 | ~45 |
| start-download-task | 带进度下载 | ~160 |
| set-wallpaper | 壁纸设置 | ~30 |
| save-settings | 保存设置 | ~15 |
| load-settings | 加载设置 | ~20 |
| wallhaven-api-request | API 代理 | ~90 |
| window-minimize | 最小化 | ~5 |
| window-maximize | 最大化切换 | ~10 |
| window-close | 关闭窗口 | ~5 |
| window-is-maximized | 检查最大化 | ~5 |
| store-get | Store 获取 | ~10 |
| store-set | Store 设置 | ~10 |
| store-delete | Store 删除 | ~10 |
| store-clear | Store 清空 | ~10 |

#### 共享工具函数
- `getImageDimensions()` — 解析图片尺寸（~80 行）
- `generateThumbnail()` — 生成缩略图（~35 行）
- `streamPipeline` — 流管道封装（~1 行）

### Integration Points

#### 主进程入口
- `electron/main/index.ts` — 当前通过副作用导入 handlers.ts
- 需要改为调用 `registerAllHandlers()`

#### Preload 脚本
- `electron/preload/index.ts` — 需要添加通道白名单验证
- 需要抽取类型定义到共享文件

#### 已知安全问题
- invoke 通道无白名单验证（CONCERNS.md 指出）
- 日志可能泄露 API Key（CONCERNS.md 指出）

</code_context>

<specifics>
## Specific Ideas

### 目录结构

```
electron/main/ipc/
├── handlers/                    # 新建 handlers 目录
│   ├── index.ts                # 统一注册入口
│   ├── base.ts                 # 共享类型和工具函数
│   ├── file.handler.ts         # 文件操作
│   ├── download.handler.ts     # 下载管理
│   ├── settings.handler.ts     # 设置存储
│   ├── wallpaper.handler.ts    # 壁纸设置
│   ├── window.handler.ts       # 窗口控制
│   ├── cache.handler.ts        # 缓存管理
│   ├── api.handler.ts          # API 代理
│   └── store.handler.ts        # Electron Store
└── handlers.ts                  # 删除（由 handlers/ 替代）

electron/preload/
├── index.ts                    # 更新：添加通道验证
└── types.ts                    # 新建：共享类型定义
```

### base.ts 示例

```typescript
// electron/main/ipc/handlers/base.ts
import { IpcResponse } from '@/shared/types/ipc'
import { IpcError } from '@/errors'

// 共享工具函数
export const streamPipeline = promisify(pipeline)

export async function getImageDimensions(filePath: string): Promise<{ width: number; height: number }> {
  // ... 现有实现
}

export async function generateThumbnail(imagePath: string, dirPath: string, fileName: string): Promise<string> {
  // ... 现有实现
}

// 日志工具
export function logHandler(handlerName: string, message: string, level: 'info' | 'error' | 'warn' = 'info') {
  const timestamp = new Date().toISOString()
  console[level](`[${timestamp}][${handlerName}] ${message}`)
}

// 错误包装器
export function wrapHandler<T>(
  handlerName: string,
  handler: (...args: any[]) => Promise<T>
): (...args: any[]) => Promise<IpcResponse<T>> {
  return async (...args) => {
    try {
      const data = await handler(...args)
      return { success: true, data }
    } catch (error: any) {
      logHandler(handlerName, `Error: ${error.message}`, 'error')
      return {
        success: false,
        error: {
          code: error instanceof IpcError ? error.code : 'INTERNAL_ERROR',
          message: error.message
        }
      }
    }
  }
}
```

### handlers/index.ts 示例

```typescript
// electron/main/ipc/handlers/index.ts
import { ipcMain } from 'electron'
import './file.handler'
import './download.handler'
import './settings.handler'
import './wallpaper.handler'
import './window.handler'
import './cache.handler'
import './api.handler'
import './store.handler'

// 所有已注册的通道列表
export const REGISTERED_CHANNELS = [
  'select-folder',
  'read-directory',
  // ... 所有通道
]

// 完整性检查
export function verifyHandlers() {
  const registered = new Set<string>()
  ipcMain.eventNames().forEach(name => {
    if (typeof name === 'string') registered.add(name)
  })

  REGISTERED_CHANNELS.forEach(channel => {
    if (!registered.has(channel)) {
      throw new Error(`Handler not registered: ${channel}`)
    }
  })
}
```

### preload/types.ts 示例

```typescript
// electron/preload/types.ts

// IPC 通道常量
export const IPC_CHANNELS = {
  // 文件操作
  SELECT_FOLDER: 'select-folder',
  READ_DIRECTORY: 'read-directory',
  DELETE_FILE: 'delete-file',
  OPEN_FOLDER: 'open-folder',
  // 下载管理
  DOWNLOAD_WALLPAPER: 'download-wallpaper',
  START_DOWNLOAD_TASK: 'start-download-task',
  // ... 其他通道
} as const

// 通道白名单
export const INVOKE_CHANNELS = Object.values(IPC_CHANNELS)
```

</specifics>

<deferred>
## Deferred Ideas

None — 讨论保持在阶段 4 范围内。

### 留给阶段 5 的工作
- 组件中直接调用 `window.electronAPI` 的代码迁移
- 死代码清理（Test/Demo 组件）

### 留给后续迭代的工作
- API Key 加密存储（safeStorage）
- 更完善的安全加固

</deferred>

---

*Phase: 04-ipc-modular-refactoring*
*Context gathered: 2025-04-25*
