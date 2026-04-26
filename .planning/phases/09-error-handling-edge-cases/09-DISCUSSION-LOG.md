# Phase 9: Error Handling & Edge Cases - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-26
**Phase:** 09-error-handling-edge-cases
**Mode:** --auto (autonomous)
**Areas discussed:** Range Support Detection, File Integrity Validation, Orphan Temp File Cleanup, User Notification

---

## Range Support Detection (ERRH-01)

| Option | Description | Selected |
|--------|-------------|----------|
| HEAD request pre-detection | 发送 HEAD 请求检测 `Accept-Ranges: bytes` header，提前知道是否支持断点续传 | |
| Direct request (current) | 直接发送带 Range header 的请求，根据响应状态码判断是否支持 | ✓ |

**Auto-selected:** Direct request (current behavior from STATE.md D-01)
**Rationale:** 保持现有的直接请求模式，避免额外的网络请求延迟。在服务器返回 200 而非 206 时，已实现自动重新开始的逻辑。

---

## File Integrity Validation (ERRH-02)

| Option | Description | Selected |
|--------|-------------|----------|
| Size-only validation | 仅验证临时文件大小 >= offset | ✓ |
| Checksum validation | 计算 MD5/SHA 校验和验证文件完整性 | |
| Timestamp validation | 检查临时文件和状态文件的时间戳一致性 | |

**Auto-selected:** Size-only validation (already implemented)
**Rationale:** 现有实现 `download.handler.ts:559-578` 已验证 `actualSize >= offset`。校验和方案复杂度高，收益有限。

---

## Orphan Temp File Cleanup (ERRH-03)

| Option | Description | Selected |
|--------|-------------|----------|
| 7-day threshold | 清理超过 7 天的孤儿临时文件 | ✓ |
| 3-day threshold | 清理超过 3 天的孤儿临时文件 | |
| Manual only | 仅在用户手动触发时清理 | |

**Auto-selected:** 7-day threshold (from ROADMAP.md requirement)
**Rationale:** 7 天阈值足够长，不会误删仍在进行的下载任务；足够短，避免临时文件无限累积。

**Cleanup timing:**
| Option | Description | Selected |
|--------|-------------|----------|
| App startup | 应用启动时自动执行清理 | ✓ |
| Periodic check | 运行时定期检查并清理 | |
| Manual only | 仅在用户触发时执行 | |

**Auto-selected:** App startup
**Rationale:** 在应用启动时清理，确保在任何下载操作之前清理过期文件。

---

## User Notification

| Option | Description | Selected |
|--------|-------------|----------|
| useAlert showWarning | 复用现有 Alert 组件显示警告消息 | ✓ |
| Toast notification | 使用 Toast 风格的非阻塞通知 | |
| Silent handling | 静默处理，不显示通知 | |

**Auto-selected:** useAlert showWarning
**Rationale:** 复用现有机制，保持一致性，不引入新的 UI 组件。

---

## Claude's Discretion

以下领域在规划时可自行决策：

- 清理日志的详细程度
- 错误消息的具体措辞（中文）
- 是否在设置页面显示"清理孤儿文件"按钮（手动触发）
- 清理操作的性能优化（大目录扫描）

---

## Deferred Ideas

None — 所有讨论保持在阶段 9 范围内。

**Future considerations:**
- 设置页面添加"手动清理"按钮
- 清理统计信息显示（已清理多少孤儿文件）
- 更复杂的文件变更检测（ETag/Last-Modified）

---

*Phase: 09-error-handling-edge-cases*
*Discussion completed: 2026-04-26*
