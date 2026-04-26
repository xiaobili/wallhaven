# Phase 6 Discussion Log

**Phase:** 06-core-resume-infrastructure
**Date:** 2026-04-26
**Mode:** Default (interactive)

---

## Discussion Summary

### Gray Areas Identified

1. **类型结构设计** — ResumeDownloadParams、PendingDownload 类型定义、IPC 通道设计
2. **状态持久化格式** — 文件格式、存储位置
3. **类型守卫与验证** — 守卫范围、验证深度
4. **错误处理** — 错误码设计、错误信息结构

### Areas Discussed

All 4 gray areas were discussed in depth.

---

## Discussion Details

### 1. 类型结构设计

**Q: ResumeDownloadParams 应该如何设计？**

| Option | Description | Selected |
|--------|-------------|----------|
| 扩展模式 | 继承 StartDownloadTaskRequest 并添加 offset 字段 | ✓ |
| 最小参数模式 | 只包含 taskId 和 offset，其他从状态文件读取 | |
| 独立类型模式 | 完全独立的参数集 | |

**Decision:** 采用扩展模式，保持参数一致性。

---

**Q: PendingDownload 类型应该包含哪些信息？**

| Option | Description | Selected |
|--------|-------------|----------|
| 完整状态快照 | 包含 taskId, url, filename, saveDir, offset, totalSize, wallpaperId 等 | ✓ |
| 最小存储模式 | 只存储 taskId 和文件路径 | |
| 引用模式 | 分开存储核心状态 + 元数据引用 | |

**Decision:** 采用完整状态快照，方便恢复时直接使用。

---

**Q: IPC 通道设计策略？**

| Option | Description | Selected |
|--------|-------------|----------|
| 新增两个通道 | RESUME_DOWNLOAD_TASK + GET_PENDING_DOWNLOADS | ✓ |
| 复用现有通道 | 复用 START_DOWNLOAD_TASK，通过 offset 区分 | |
| 分阶段添加 | RESUME_DOWNLOAD_TASK 现在，GET_PENDING_DOWNLOADS 稍后 | |

**Decision:** 新增两个独立通道，保持职责清晰。

---

### 2. 状态持久化格式

**Q: 状态持久化应该使用什么格式？**

| Option | Description | Selected |
|--------|-------------|----------|
| 单文件 JSON | 每个下载任务一个 JSON 文件 | ✓ |
| 统一索引文件 | 所有待恢复下载存储在一个文件中 | |
| 复用 electron-store | 扩展现有 electron-store 数据结构 | |

**Decision:** 单文件 JSON，易于读写和清理。

---

**Q: 状态文件应该存储在哪里？**

| Option | Description | Selected |
|--------|-------------|----------|
| 下载目录 | 与 .download 文件同目录 | ✓ |
| 用户数据目录 | app.getPath('userData') | |

**Decision:** 下载目录，方便关联和清理。

---

### 3. 类型守卫与验证

**Q: 需要为哪些类型添加类型守卫？**

| Option | Description | Selected |
|--------|-------------|----------|
| ResumeDownloadParams | 验证 taskId 存在、offset 有效、文件路径合法 | ✓ |
| PendingDownload | 验证所有必需字段存在且类型正确 | ✓ |
| 字段级验证 | 验证 taskId 非空、offset >= 0、totalSize > 0 | ✓ |

**Decision:** 全部添加类型守卫。

---

**Q: 验证深度如何？**

| Option | Description | Selected |
|--------|-------------|----------|
| 基础验证 | 类型检查 + 结构完整性验证 | ✓ |
| 完整验证 | 包含文件存在性、大小校验 | |
| 仅类型检查 | 只检查 TypeScript 类型 | |

**Decision:** 基础验证，复杂业务验证留给 Phase 7。

---

### 4. 错误处理

**Q: 错误码和错误信息结构如何设计？**

| Option | Description | Selected |
|--------|-------------|----------|
| 扩展现有结构 | 复用 IpcErrorInfo，添加断点续传错误码 | ✓ |
| 创建专用类型 | 为断点续传创建 ResumeError 类型 | |

**Decision:** 扩展现有 IpcErrorInfo 结构。

---

## Final Decisions Summary

| ID | Decision |
|----|----------|
| D-01 | ResumeDownloadParams 继承 StartDownloadTaskRequest + offset |
| D-02 | PendingDownload 包含完整状态快照 |
| D-03 | 新增 RESUME_DOWNLOAD_TASK 和 GET_PENDING_DOWNLOADS 通道 |
| D-04 | 单文件 JSON 格式持久化 |
| D-05 | 状态文件存储在下载目录 |
| D-06 | 为所有相关类型添加类型守卫 |
| D-07 | 基础验证深度 |
| D-08 | 复用并扩展 IpcErrorInfo |

---

## Deferred Ideas

None — discussion stayed within phase scope.

---

*Log generated: 2026-04-26*
