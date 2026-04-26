# Phase 7: Main Process Implementation - Context

**Gathered:** 2026-04-26
**Status:** Ready for planning

<domain>
## Phase Boundary

实现断点续传的主进程逻辑，包括 HTTP Range 请求、状态持久化、临时文件处理。本阶段在 Phase 6 定义的类型和 IPC 通道基础上，实现完整的恢复下载功能。

**核心交付物：**
1. HTTP Range 请求支持 — 从指定字节偏移继续下载
2. 状态持久化 — 将下载状态写入 `.download.json` 文件
3. 临时文件保留 — 暂停时保留 `.download` 临时文件而非删除
4. `RESUME_DOWNLOAD_TASK` handler 实现 — 实际恢复下载逻辑
5. `GET_PENDING_DOWNLOADS` handler 实现 — 扫描并返回待恢复任务列表

**阶段边界：**
- 本阶段仅实现主进程逻辑，不涉及渲染进程集成
- 状态持久化限于文件系统层面，不涉及 electron-store
- 服务器 Range 支持检测在 Phase 9 实现
- 文件完整性校验在 Phase 9 实现
- 孤儿临时文件清理在 Phase 9 实现

**需求覆盖：** INFR-02, INFR-03, CORE-02

</domain>

<decisions>
## Implementation Decisions

### Range Request Strategy

- **D-01:** Range 请求采用直接请求模式
  - 恢复下载时直接发送 `Range: bytes=offset-` 请求头
  - 不预先检测服务器是否支持 Range（Phase 9 实现）
  - 若服务器返回 200 而非 206，视为不支持 Range，从头下载
  - 优点：简化实现，减少请求次数
  - 缺点：部分不支持 Range 的服务器会导致重新下载（Phase 9 处理）

- **D-02:** Range 请求失败时的降级策略
  - 若服务器返回错误（如 416 Range Not Satisfiable），删除临时文件从头开始
  - 通知渲染进程状态变更（`state: 'downloading'` 重置）
  - 在进度回调中重置 `offset` 为 0

### State Persistence

- **D-03:** 状态持久化时机
  - **暂停时**：写入完整状态到 `.download.json` 文件
  - **进度更新时**：每 5 秒或每 10MB（取较早）更新一次状态文件
  - **下载完成时**：删除 `.download.json` 文件，重命名 `.download` 为正式文件
  - **下载失败时**：保留状态文件用于后续恢复

- **D-04:** 状态文件格式
  - 使用 `PendingDownload` 类型定义的结构
  - JSON 格式，UTF-8 编码
  - 包含 `taskId`, `url`, `filename`, `saveDir`, `offset`, `totalSize`, `wallpaperId`, `small`, `resolution`, `size`, `createdAt`, `updatedAt`
  - 文件命名：`{filename}.download.json`，与 `.download` 临时文件同目录

- **D-05:** 状态写入策略
  - 使用原子写入（先写临时文件，再重命名）确保数据完整性
  - 避免写入过程中应用崩溃导致状态文件损坏
  - 实现方式：`fs.writeFileSync(tempPath, JSON.stringify(state))` + `fs.renameSync(tempPath, finalPath)`

### Temp File Management

- **D-06:** 暂停时临时文件处理
  - **保留** `.download` 临时文件（Phase 6 已定义 `cleanupDownload` 删除逻辑，需修改）
  - **写入** `.download.json` 状态文件
  - **清除** `activeDownloads` 中的记录（允许后续恢复）

- **D-07:** 取消时临时文件处理
  - **删除** `.download` 临时文件
  - **删除** `.download.json` 状态文件
  - **清除** `activeDownloads` 中的记录

- **D-08:** 恢复下载时临时文件处理
  - 检查 `.download` 临时文件是否存在
  - 检查 `.download.json` 状态文件是否存在
  - 若两者都存在，验证临时文件大小 >= 状态文件中的 offset
  - 若验证失败，删除临时文件从头开始

### Resume Handler Implementation

- **D-09:** `RESUME_DOWNLOAD_TASK` handler 实现
  ```typescript
  // 伪代码
  1. 验证参数 (isResumeDownloadParams)
  2. 检查临时文件是否存在
  3. 检查状态文件是否存在
  4. 验证临时文件大小与 offset 匹配
  5. 发送 Range 请求 (Range: bytes=offset-)
  6. 以 'a' 模式打开临时文件（追加写入）
  7. 流式下载并更新进度
  8. 定期更新状态文件
  9. 完成时重命名文件并清理状态
  ```

- **D-10:** `GET_PENDING_DOWNLOADS` handler 实现
  ```typescript
  // 伪代码
  1. 获取用户下载目录路径
  2. 扫描所有 `.download.json` 文件
  3. 解析 JSON 并验证 (isPendingDownload)
  4. 检查对应的 `.download` 临时文件是否存在
  5. 返回有效的待恢复任务列表
  ```

### Error Handling

- **D-11:** 断点续传相关错误处理
  - 临时文件不存在 → 返回 `RESUME_FILE_NOT_FOUND`
  - 状态文件损坏 → 返回 `RESUME_STATE_CORRUPTED`
  - 服务器不支持 Range → 返回 `RESUME_SERVER_UNSUPPORTED`（若返回 200）
  - offset 无效（> totalSize）→ 返回 `RESUME_INVALID_OFFSET`

- **D-12:** 进度更新频率
  - 保持现有 100ms 进度更新间隔
  - 状态文件写入使用独立节流（5 秒或 10MB）

### Claude's Discretion

- 状态文件写入的具体节流实现细节
- 错误码的具体错误消息文本
- 临时文件大小验证的容差范围（允许小量差异）
- 代码组织和函数拆分方式

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 项目规划
- `.planning/PROJECT.md` — 项目核心价值、约束条件、需求范围
- `.planning/REQUIREMENTS.md` — 详细需求列表（INFR-02, INFR-03, CORE-02）
- `.planning/ROADMAP.md` — 阶段划分和依赖关系
- `.planning/STATE.md` — 当前项目状态

### 前置阶段上下文
- `.planning/phases/06-core-resume-infrastructure/06-CONTEXT.md` — Phase 6 类型定义和 IPC 通道（MUST READ）

### 代码库分析
- `.planning/codebase/ARCHITECTURE.md` — 现有架构、IPC 通信模式、下载流程
- `.planning/codebase/INTEGRATIONS.md` — IPC 通道定义、数据流图
- `.planning/codebase/STACK.md` — 技术栈、依赖版本

### 关键代码文件（需要修改）

#### IPC Handler 文件
- `electron/main/ipc/handlers/download.handler.ts` — 下载处理器，需要实现 RESUME_DOWNLOAD_TASK 和 GET_PENDING_DOWNLOADS

#### 类型定义文件（已完成，仅供参考）
- `src/shared/types/ipc.ts` — IPC 类型定义，包含 ResumeDownloadParams, PendingDownload, 错误码

#### 相关文件（参考）
- `src/stores/modules/download/index.ts` — 下载 Store，理解数据结构
- `src/services/download.service.ts` — 下载服务，理解调用方式

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

#### 现有下载处理器结构
```typescript
// electron/main/ipc/handlers/download.handler.ts
const activeDownloads = new Map<string, ActiveDownload>()

interface ActiveDownload {
  abortController: AbortController
  tempPath: string
  saveDir: string
  filename: string
}

function cleanupDownload(taskId: string): void {
  // 当前实现：删除临时文件
  // Phase 7 修改：区分暂停和取消
}
```

#### 现有下载进度回调结构
```typescript
// 进度数据结构已定义
interface DownloadProgressData {
  taskId: string
  progress: number
  offset: number
  speed: number
  state: 'downloading' | 'paused' | 'waiting' | 'completed' | 'failed'
  filePath?: string
  error?: string
  totalSize?: number
}
```

#### 现有 axios 流式下载模式
```typescript
const response = await axios({
  method: 'GET',
  url,
  responseType: 'stream',
  timeout: 60000,
  signal: abortController.signal,
  // Phase 7 添加: headers: { Range: `bytes=${offset}-` }
})
```

### Established Patterns

- **临时文件命名**：`{filePath}.download`
- **状态文件命名**：`{filePath}.download.json`（Phase 7 新增）
- **IPC 响应格式**：`{ success: boolean, data?: T, error?: IpcErrorInfo }`
- **进度通知**：`BrowserWindow.getAllWindows()[0].webContents.send('download-progress', data)`
- **错误日志**：`logHandler(channel, message, 'error')`

### Integration Points

- **RESUME_DOWNLOAD_TASK handler** 在 `registerDownloadHandlers()` 中注册
- **GET_PENDING_DOWNLOADS handler** 在 `registerDownloadHandlers()` 中注册
- **暂停逻辑修改**：修改 `cleanupDownload` 函数，区分暂停和取消场景
- **进度更新**：复用现有 `download-progress` IPC 通道

</code_context>

<specifics>
## Specific Ideas

- 状态文件与临时文件配套命名，便于关联和清理
- 使用原子写入确保状态文件完整性
- Range 请求直接发送，不预先检测（简化实现）
- 进度更新与状态持久化解耦，避免性能影响

</specifics>

<deferred>
## Deferred Ideas

None — 讨论保持在阶段 7 范围内。

### 后续阶段将实现

- **Phase 8**: 渲染进程集成、UI 状态处理、应用启动时自动恢复
- **Phase 9**: 服务器 Range 支持检测、文件完整性校验、孤儿临时文件清理

</deferred>

---

*Phase: 07-main-process-implementation*
*Context gathered: 2026-04-26*
