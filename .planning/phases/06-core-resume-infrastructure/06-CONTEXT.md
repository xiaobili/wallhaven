# Phase 6: Core Resume Infrastructure - Context

**Gathered:** 2026-04-26
**Status:** Ready for planning

<domain>
## Phase Boundary

为断点续传功能建立 IPC 通道、类型定义和验证基础。这是 v2.1 里程碑的第一个阶段，为后续阶段（主进程实现、渲染进程集成）奠定基础设施。

**核心交付物：**
1. `ResumeDownloadParams` 类型定义 — 恢复下载的请求参数
2. `PendingDownload` 类型定义 — 待恢复的下载任务信息
3. `RESUME_DOWNLOAD_TASK` IPC 通道定义
4. `GET_PENDING_DOWNLOADS` IPC 通道定义
5. 类型守卫函数（isResumeDownloadParams, isPendingDownload）

**阶段边界：**
- 本阶段仅定义类型和通道，不实现实际逻辑
- IPC handler 使用占位实现（placeholder）
- 状态持久化逻辑在 Phase 7 实现
- 渲染进程集成在 Phase 8 实现

**需求覆盖：** INFR-01

</domain>

<decisions>
## Implementation Decisions

### 类型结构设计

- **D-01:** `ResumeDownloadParams` 采用扩展模式
  - 继承 `StartDownloadTaskRequest` 并添加 `offset` 字段
  - 保持参数结构与现有下载任务一致
  - 类型定义位置：`src/shared/types/ipc.ts`

  ```typescript
  interface ResumeDownloadParams extends StartDownloadTaskRequest {
    offset: number  // 已下载的字节数
  }
  ```

- **D-02:** `PendingDownload` 采用完整状态快照模式
  - 包含恢复下载所需的所有信息：taskId, url, filename, saveDir, offset, totalSize, wallpaperId, small, resolution, size
  - 方便恢复时直接使用，无需从其他来源重建信息
  - 类型定义位置：`src/shared/types/ipc.ts`

  ```typescript
  interface PendingDownload {
    taskId: string
    url: string
    filename: string
    saveDir: string
    offset: number       // 已下载字节数
    totalSize: number    // 文件总大小
    wallpaperId?: string // Wallhaven 壁纸 ID
    small?: string       // 缩略图 URL
    resolution?: string  // 分辨率信息
    size?: number        // 文件大小
    createdAt: string    // 创建时间 ISO 字符串
    updatedAt: string    // 更新时间 ISO 字符串
  }
  ```

- **D-03:** IPC 通道采用新增策略
  - 新增 `RESUME_DOWNLOAD_TASK` 通道 — 恢复下载
  - 新增 `GET_PENDING_DOWNLOADS` 通道 — 获取待恢复下载列表
  - 保持现有通道（START_DOWNLOAD_TASK 等）不变
  - 通道名称添加到 `IPC_CHANNELS` 常量

### 状态持久化格式

- **D-04:** 采用单文件 JSON 格式
  - 每个下载任务一个独立的 JSON 文件
  - 文件命名：`{filename}.download.json`（与 `.download` 临时文件配套）
  - 易于读写、清理和管理

- **D-05:** 状态文件存储在下载目录
  - 与 `.download` 临时文件同目录
  - 方便关联和清理
  - 例如：`{saveDir}/{filename}.download` + `{saveDir}/{filename}.download.json`

### 类型守卫与验证

- **D-06:** 为所有断点续传相关类型添加类型守卫
  - `isResumeDownloadParams(value)` — 验证 ResumeDownloadParams
  - `isPendingDownload(value)` — 验证 PendingDownload
  - 字段级验证函数（可选，按需添加）

- **D-07:** 验证深度采用基础验证
  - 基础类型检查 + 结构完整性验证
  - 复杂业务验证（文件存在性、大小校验等）留给 Phase 7
  - 验证内容：taskId 非空、offset >= 0、totalSize > 0、必需字段存在

### 错误处理

- **D-08:** 复用现有 `IpcErrorInfo` 结构
  - 扩展现有 `{ code, message }` 格式
  - 添加断点续传相关错误码：
    - `RESUME_INVALID_OFFSET` — 无效的偏移量
    - `RESUME_FILE_NOT_FOUND` — 临时文件不存在
    - `RESUME_STATE_CORRUPTED` — 状态文件损坏
    - `RESUME_SERVER_UNSUPPORTED` — 服务器不支持 Range 请求
  - 错误码定义位置：`src/shared/types/ipc.ts`

### Claude's Discretion

- 类型守卫的具体实现细节（使用 typeof 还是更严格的检查）
- 错误码的命名风格（保持与现有错误码一致）
- JSDoc 注释的具体措辞

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 项目规划
- `.planning/PROJECT.md` — 项目核心价值、约束条件、需求范围
- `.planning/REQUIREMENTS.md` — 详细需求列表（INFR-01 ~ ERRH-03）
- `.planning/ROADMAP.md` — 阶段划分和依赖关系
- `.planning/STATE.md` — 当前项目状态

### 前置阶段上下文
- `.planning/phases/04-ipc-modular-refactoring/04-CONTEXT.md` — IPC 模块化重构上下文
- `.planning/phases/05-presentation-layer-refactoring/05-CONTEXT.md` — 表现层重构上下文

### 代码库分析
- `.planning/codebase/ARCHITECTURE.md` — 现有架构、IPC 通信模式
- `.planning/codebase/INTEGRATIONS.md` — IPC 通道定义、数据流

### 关键代码文件

#### 类型定义文件（需要修改）
- `src/shared/types/ipc.ts` — IPC 类型定义，需要添加新类型和通道常量
- `src/types/index.ts` — 导出共享类型

#### IPC Handler 文件（需要添加占位实现）
- `electron/main/ipc/handlers/download.handler.ts` — 下载处理器，添加新通道注册

#### 现有下载相关文件（参考）
- `src/stores/modules/download/index.ts` — 下载 Store
- `src/services/download.service.ts` — 下载服务
- `src/composables/download/useDownload.ts` — 下载 Composable

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

#### 现有 IPC 类型定义模式
```typescript
// src/shared/types/ipc.ts
export const IPC_CHANNELS = {
  START_DOWNLOAD_TASK: 'start-download-task',
  // ...
} as const

export interface StartDownloadTaskRequest {
  taskId: string
  url: string
  filename: string
  saveDir: string
}

export interface DownloadProgressData {
  taskId: string
  progress: number
  offset: number        // 已有 offset 字段
  totalSize?: number    // 已有 totalSize 字段
  // ...
}
```

#### 现有类型守卫模式
```typescript
// src/shared/types/ipc.ts
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

#### 现有 IPC Handler 注册模式
```typescript
// electron/main/ipc/handlers/download.handler.ts
export function registerDownloadHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.START_DOWNLOAD_TASK, async (_event, params) => {
    // 实现
  })
}
```

### Established Patterns

- **IPC 命名约定**：使用 SCREAMING_SNAKE_CASE 作为常量名，kebab-case 作为通道名称
- **类型命名约定**：使用 PascalCase，Request/Response 后缀
- **类型守卫命名**：`is{TypeName}` 格式
- **错误码命名**：UPPER_SNAKE_CASE，描述性前缀

### Integration Points

- 新 IPC 通道需要在 `download.handler.ts` 的 `registerDownloadHandlers()` 中注册
- 新类型需要在 `src/shared/types/ipc.ts` 中导出
- Phase 7 将实现 handler 逻辑，Phase 8 将集成到渲染进程

</code_context>

<specifics>
## Specific Ideas

- 状态文件与临时文件配套命名（`.download` + `.download.json`），便于关联和清理
- 错误码应保持与现有风格一致（如有）
- 类型守卫应足够宽松以允许向后兼容的字段扩展

</specifics>

<deferred>
## Deferred Ideas

None — 讨论保持在阶段 6 范围内。

### 后续阶段将实现

- **Phase 7**: 状态持久化逻辑、Range 请求实现、临时文件保留
- **Phase 8**: 渲染进程集成、UI 状态处理
- **Phase 9**: 错误处理边界情况、服务器 Range 支持检测

</deferred>

---

*Phase: 06-core-resume-infrastructure*
*Context gathered: 2026-04-26*
