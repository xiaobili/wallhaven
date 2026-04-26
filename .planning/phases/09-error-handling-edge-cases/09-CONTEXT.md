# Phase 9: Error Handling & Edge Cases - Context

**Gathered:** 2026-04-26
**Status:** Ready for planning

<domain>
## Phase Boundary

为下载断点续传功能添加错误处理和边缘情况处理。本阶段在 Phase 6-8 已实现的断点续传核心功能基础上，增强系统鲁棒性和用户体验。

**核心交付物：**
1. 服务器 Range 支持检测 — 通过 HEAD 请求检测服务器是否支持 Range
2. 文件完整性验证 — 恢复下载前验证临时文件大小与状态文件记录一致
3. 孤儿临时文件清理 — 应用启动时清理超过 7 天的孤儿临时文件
4. 用户通知机制 — 当服务器不支持 Range 时明确告知用户
5. 状态文件损坏处理 — 处理损坏的状态文件，回退到全新下载

**需求覆盖：** ERRH-01, ERRH-02, ERRH-03

**阶段边界：**
- 本阶段不修改核心下载逻辑，仅添加检测、验证和清理
- 不改变现有用户操作流程
- 不添加新的 UI 组件，使用现有 Alert 机制

</domain>

<decisions>
## Implementation Decisions

### Range Support Detection (ERRH-01)

- **D-01:** Range 检测策略
  - **当前行为（D-01 来自 STATE.md）：** 直接发送带 Range header 的请求，不预先检测
  - **本阶段增强：** 在恢复失败时（服务器返回 200 而非 206）向用户显示通知
  - **通知时机：** 恢复下载后首次收到 200 响应时
  - **通知内容：** "服务器不支持断点续传，已重新开始下载"

- **D-02:** HEAD 请求检测（可选增强）
  - 在用户点击恢复按钮时，可选择性发送 HEAD 请求检测 `Accept-Ranges: bytes` header
  - 如果检测到不支持，提前提示用户，避免失败的 Range 请求
  - **决策：** 不使用 HEAD 预检测（保持 D-01 的直接请求模式），仅在实际请求失败时处理

### File Integrity Validation (ERRH-02)

- **D-03:** 临时文件验证（已实现）
  - 当前实现：`download.handler.ts:559-578` 已验证 `actualSize >= offset`
  - 若验证失败：删除临时文件和状态文件，返回 `RESUME_INVALID_OFFSET` 错误

- **D-04:** 状态文件损坏处理
  - 若状态文件 JSON 解析失败：删除状态文件，返回 `RESUME_STATE_CORRUPTED` 错误
  - 渲染进程收到错误后：显示错误消息，从下载列表移除任务

- **D-05:** 错误码映射
  - `RESUME_FILE_NOT_FOUND` — 临时文件丢失
  - `RESUME_INVALID_OFFSET` — 临时文件大小小于记录的 offset
  - `RESUME_STATE_CORRUPTED` — 状态文件损坏或格式错误

### Orphan Temp File Cleanup (ERRH-03)

- **D-06:** 清理时机
  - 应用启动时，在 `initializeApp()` 中执行清理
  - 在 `restorePendingDownloads()` 之前执行，避免清理有效的待恢复文件

- **D-07:** 清理条件
  - 临时文件（`.download`）创建时间超过 7 天
  - 且没有对应的状态文件（`.download.json`）
  - 或状态文件中 `updatedAt` 超过 7 天

- **D-08:** 清理逻辑
  - 扫描下载目录中的 `.download` 文件
  - 检查对应的 `.download.json` 状态文件
  - 若状态文件存在且 `updatedAt` 在 7 天内，保留
  - 若状态文件不存在或 `updatedAt` 超过 7 天，删除临时文件和状态文件
  - 记录清理日志到 console

### User Notification

- **D-09:** 通知机制
  - 复用现有 `useAlert` composable 的 `showWarning()` 方法
  - 通知场景：
    1. 服务器不支持 Range（自动重新开始）
    2. 临时文件丢失（任务已移除）
    3. 状态文件损坏（任务已移除）

- **D-10:** 错误处理流程
  - 主进程返回错误码和消息
  - DownloadService 透传错误
  - useDownload composable 调用 `showWarning()` 或 `showError()` 显示消息
  - 根据错误类型决定是否从下载列表移除任务

### Claude's Discretion

- 清理日志的详细程度
- 错误消息的具体措辞（中文）
- 是否在设置页面显示"清理孤儿文件"按钮（手动触发）
- 清理操作的性能优化（大目录扫描）

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 项目规划
- `.planning/PROJECT.md` — 项目核心价值、约束条件
- `.planning/REQUIREMENTS.md` — 详细需求列表（ERRH-01, ERRH-02, ERRH-03）
- `.planning/ROADMAP.md` — Phase 9 定义和成功标准
- `.planning/STATE.md` — 累积决策（D-01 至 D-12）

### 前置阶段上下文
- `.planning/phases/06-core-resume-infrastructure/06-CONTEXT.md` — Phase 6 类型定义
- `.planning/phases/07-main-process-implementation/07-CONTEXT.md` — Phase 7 主进程实现
- `.planning/phases/08-renderer-integration/08-CONTEXT.md` — Phase 8 渲染进程集成

### 代码库分析
- `.planning/codebase/ARCHITECTURE.md` — 现有架构、下载流程
- `.planning/codebase/CONCERNS.md` — 已知问题和建议

### 关键代码文件（需要修改）

#### 主进程文件
- `electron/main/ipc/handlers/download.handler.ts` — 下载处理器，需要添加状态文件损坏处理
- `electron/main/ipc/handlers/cache.handler.ts` — 缓存处理器，参考清理逻辑

#### 服务层文件
- `src/services/download.service.ts` — 下载服务，可能需要错误处理增强

#### Composable 文件
- `src/composables/download/useDownload.ts` — 下载 Composable，需要添加错误处理和清理调用
- `src/composables/core/useAlert.ts` — Alert composable，用于显示通知

#### 应用初始化
- `src/main.ts` — 应用入口，需要添加孤儿文件清理调用

#### 类型定义
- `src/shared/types/ipc.ts` — IPC 类型定义，可能需要添加错误码

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

#### 现有错误处理
```typescript
// electron/main/ipc/handlers/download.handler.ts:559-578
// 已实现的文件大小验证
const actualSize = fs.statSync(tempPath).size
if (actualSize < offset) {
  // 清理并返回错误
  return {
    success: false,
    error: {
      code: 'RESUME_INVALID_OFFSET',
      message: 'Temp file smaller than offset',
    },
  }
}
```

#### 现有清理逻辑
```typescript
// electron/main/ipc/handlers/cache.handler.ts:46-58
// 现有临时文件清理逻辑（清理所有 .download 文件）
const allFiles = fs.readdirSync(downloadPath)
allFiles.forEach(file => {
  if (file.endsWith('.download')) {
    const filePath = path.join(downloadPath, file)
    fs.unlinkSync(filePath)
    results.tempFilesDeleted++
  }
})
```

#### 现有 Alert 机制
```typescript
// src/composables/core/useAlert.ts
// 已有 showWarning() 和 showError() 方法
const showWarning = (message: string): void => { ... }
const showError = (message: string): void => { ... }
```

#### 现有应用初始化
```typescript
// src/main.ts
async function initializeApp() {
  await useSettings().load()
  await useDownload().loadHistory()
  // 需要添加：孤儿文件清理
  // 需要添加：恢复待处理下载任务
}
```

### Established Patterns

- **错误返回模式**：`{ success: false, error: { code: string, message: string } }`
- **文件操作模式**：使用 `fs.statSync`, `fs.existsSync`, `fs.unlinkSync` 同步操作
- **日志模式**：使用 `logHandler(channel, message, level?)` 记录日志
- **状态持久化**：状态文件使用 `PendingDownload` 结构，JSON 格式
- **原子写入**：先写 `.tmp` 文件，再重命名

### Integration Points

- **download.handler.ts** — 需要在 `readStateFile()` 中添加更好的错误处理
- **useDownload composable** — 需要在恢复失败时调用 `showWarning()`
- **main.ts** — 需要在 `initializeApp()` 中添加孤儿文件清理
- **DownloadService** — 可能需要添加 `cleanupOrphanFiles()` 方法

</code_context>

<specifics>
## Specific Ideas

- 清理阈值：7 天（超过 7 天的孤儿文件视为过期）
- 通知使用现有 Alert 组件，不添加新的 UI
- 清理操作在应用启动时自动执行，无需用户干预
- 错误消息使用中文，保持与应用其他部分一致

</specifics>

<deferred>
## Deferred Ideas

None — 讨论保持在阶段 9 范围内。

### 后续里程碑可能考虑

- 设置页面添加"手动清理"按钮
- 清理统计信息显示（已清理多少孤儿文件）
- 更复杂的文件变更检测（ETag/Last-Modified）

</deferred>

---

*Phase: 09-error-handling-edge-cases*
*Context gathered: 2026-04-26*
