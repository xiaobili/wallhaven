# Phase 8: Renderer Integration - Context

**Gathered:** 2026-04-26
**Status:** Ready for planning

<domain>
## Phase Boundary

将主进程断点续传功能（Phase 6-7）集成到渲染进程。本阶段在已有的 IPC 通道和类型定义基础上，实现服务层方法、Composable 更新、应用启动恢复逻辑。

**核心交付物：**
1. `resumeDownload()` 方法 — DownloadService 恢复下载服务方法
2. `getPendingDownloads()` 方法 — DownloadService 获取待恢复任务列表方法
3. `useDownload` composable 更新 — 恢复下载功能集成
4. 应用启动自动恢复 — 检测并恢复未完成的下载任务
5. UI 状态处理 — 恢复下载的进度显示和错误处理

**阶段边界：**
- 本阶段仅实现渲染进程逻辑，主进程逻辑已在 Phase 7 完成
- 复用现有 IPC 通道，不新增通道定义
- 复用现有进度显示组件，不新增 UI 组件
- 服务器 Range 支持检测在 Phase 9 实现
- 文件完整性校验在 Phase 9 实现
- 孤儿临时文件清理在 Phase 9 实现

**需求覆盖：** CORE-01, CORE-03

</domain>

<decisions>
## Implementation Decisions

### Service Layer Integration

- **D-01:** `resumeDownload()` 方法设计
  - 参数：`taskId: string`, `pendingDownload: PendingDownload`
  - 返回：`Promise<IpcResponse<string>>`
  - 实现逻辑：
    1. 构造 `ResumeDownloadParams`（从 `PendingDownload` 转换）
    2. 调用 `electronClient.resumeDownloadTask(params)`
    3. 返回结果
  - 错误处理：透传 IPC 错误，服务层不添加额外处理

- **D-02:** `getPendingDownloads()` 方法设计
  - 参数：无
  - 返回：`Promise<IpcResponse<PendingDownload[]>>`
  - 实现逻辑：直接调用 `electronClient.getPendingDownloads()`
  - 错误处理：透传 IPC 错误

### Auto-Restore Strategy

- **D-03:** 应用启动恢复策略
  - **自动恢复**，无需用户确认
  - 在 `initializeApp()` 中调用 `getPendingDownloads()`
  - 将待恢复任务添加到 `downloadingList`（state: 'paused'）
  - 用户可在下载中心查看并手动恢复
  - 原因：简化用户体验，避免过多弹窗打断

- **D-04:** 恢复任务的去重逻辑
  - 检查 `downloadingList` 中是否已存在相同 `taskId`
  - 若存在，跳过添加（避免重复）
  - 若存在相同 `wallpaperId` 但不同 `taskId`，仍添加（可能是不同下载任务）

- **D-05:** 恢复任务的数据还原
  - 从 `PendingDownload` 构造 `DownloadItem`：
    ```typescript
    const downloadItem: DownloadItem = {
      id: pending.taskId,
      url: pending.url,
      filename: pending.filename,
      small: pending.small || '',
      resolution: pending.resolution || '',
      size: pending.size || 0,
      offset: pending.offset,
      progress: Math.round((pending.offset / pending.totalSize) * 100),
      speed: 0,
      state: 'paused',
      wallpaperId: pending.wallpaperId,
    }
    ```

### Composable Updates

- **D-06:** `useDownload` composable 更新
  - 新增 `resumeDownload(id: string)` 方法
  - 修改现有 `resumeDownload` 实现：
    1. 查找任务获取 `offset` 信息
    2. 调用 `downloadService.resumeDownload()`
    3. 成功后更新任务状态为 'downloading'
  - 保持现有 `startDownload`、`pauseDownload`、`cancelDownload` 方法签名不变

- **D-07:** 进度处理更新
  - 现有 `handleProgress` 已处理 'paused' 状态
  - 恢复下载时，进度回调正常触发，无需特殊处理
  - `offset` 字段已存在于 `DownloadProgressData`，直接使用

### UI State Handling

- **D-08:** 恢复下载的 UI 反馈
  - 复用现有进度条显示逻辑
  - 恢复开始时，进度从 `offset/totalSize` 开始显示
  - 成功恢复：无额外提示，正常显示下载进度
  - 恢复失败：调用 `showError()` 显示错误消息

- **D-09:** 恢复失败的处理
  - 若服务器不支持 Range（返回 200），任务重新开始（由主进程处理）
  - 若临时文件丢失，显示错误并从下载列表移除
  - 若状态文件损坏，显示错误并从下载列表移除
  - 错误消息使用 IPC 返回的 `error.message`

### Claude's Discretion

- `PendingDownload` 到 `DownloadItem` 转换的详细字段映射
- 错误消息的具体措辞
- 日志输出的详细程度
- 方法内部的具体实现细节

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 项目规划
- `.planning/PROJECT.md` — 项目核心价值、约束条件、需求范围
- `.planning/REQUIREMENTS.md` — 详细需求列表（CORE-01, CORE-03）
- `.planning/ROADMAP.md` — 阶段划分和依赖关系
- `.planning/STATE.md` — 当前项目状态

### 前置阶段上下文
- `.planning/phases/06-core-resume-infrastructure/06-CONTEXT.md` — Phase 6 类型定义和 IPC 通道（MUST READ）
- `.planning/phases/07-main-process-implementation/07-CONTEXT.md` — Phase 7 主进程实现（MUST READ）

### 代码库分析
- `.planning/codebase/ARCHITECTURE.md` — 现有架构、IPC 通信模式、下载流程

### 关键代码文件（需要修改）

#### 服务层文件
- `src/services/download.service.ts` — 下载服务，需要添加 resumeDownload 和 getPendingDownloads 方法

#### Composable 文件
- `src/composables/download/useDownload.ts` — 下载 Composable，需要更新 resumeDownload 方法

#### 应用初始化
- `src/main.ts` — 应用入口，需要在 initializeApp 中添加恢复逻辑

#### 相关文件（参考）
- `src/stores/modules/download/index.ts` — 下载 Store，理解数据结构
- `src/clients/electron.client.ts` — Electron 客户端，已有 resumeDownloadTask 和 getPendingDownloads 方法
- `src/shared/types/ipc.ts` — IPC 类型定义，包含 ResumeDownloadParams, PendingDownload

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

#### ElectronClient 已有方法
```typescript
// src/clients/electron.client.ts
async resumeDownloadTask(params: ResumeDownloadParams): Promise<IpcResponse<string>>
async getPendingDownloads(): Promise<IpcResponse<PendingDownload[]>>
```
- 这些方法已在 Phase 6 实现，可直接在 DownloadService 中调用

#### 现有 DownloadService 结构
```typescript
// src/services/download.service.ts
class DownloadServiceImpl {
  async startDownload(taskId, url, filename): Promise<IpcResponse<string>>
  async pauseDownload(taskId): Promise<IpcResponse<void>>
  async cancelDownload(taskId): Promise<IpcResponse<void>>
  // 需要添加：resumeDownload, getPendingDownloads
}
```

#### 现有 useDownload Composable
```typescript
// src/composables/download/useDownload.ts
const resumeDownload = (id: string): void => {
  const task = store.downloadingList.find((item) => item.id === id)
  if (task && task.state === 'paused') {
    // 当前实现：重置进度，重新开始
    task.state = 'waiting'
    task.progress = 0
    task.offset = 0
    task.speed = 0
    startDownload(id) // 不支持断点续传
  }
}
// 需要修改：调用真正的断点续传
```

#### 应用初始化流程
```typescript
// src/main.ts
async function initializeApp() {
  await useSettings().load()
  await useDownload().loadHistory()
  // 需要添加：恢复待处理下载任务
}
```

### Established Patterns

- **服务层模式**：DownloadService 封装 IPC 调用，返回 `IpcResponse<T>`
- **Composable 模式**：useDownload 协调 Service 和 Store，管理进度订阅
- **进度显示**：`handleProgress` 回调处理所有状态（downloading, paused, completed, failed）
- **错误处理**：`showError()` 显示错误消息
- **Store 更新**：直接修改 Store 状态，无需额外持久化

### Integration Points

- **DownloadService** 需要新增两个方法，调用 `electronClient` 已有方法
- **useDownload** 的 `resumeDownload` 需要调用新的服务方法
- **initializeApp** 需要调用 `getPendingDownloads` 并填充 Store
- **handleProgress** 无需修改，已支持 offset 字段

</code_context>

<specifics>
## Specific Ideas

- 自动恢复策略：无需用户确认，静默将待恢复任务添加到下载列表
- 进度显示：直接使用现有进度条，从 offset 百分比开始
- 错误处理：复用现有 showError 机制

</specifics>

<deferred>
## Deferred Ideas

None — 讨论保持在阶段 8 范围内。

### 后续阶段将实现

- **Phase 9**: 服务器 Range 支持检测、文件完整性校验、孤儿临时文件清理
- **UI 增强**: 如需添加恢复确认对话框，可在后续迭代中实现

</deferred>

---

*Phase: 08-renderer-integration*
*Context gathered: 2026-04-26*
