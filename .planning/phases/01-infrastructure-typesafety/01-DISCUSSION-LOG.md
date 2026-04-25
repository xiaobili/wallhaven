# Phase 1: 基础设施与类型安全 - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2025-04-25
**Phase:** 01-infrastructure-typesafety
**Areas discussed:** 类型组织策略, 错误类层次结构, useAlert 返回值设计, 全局错误处理器行为

---

## 类型组织策略

| Option | Description | Selected |
|--------|-------------|----------|
| 按领域分子目录 | 创建 types/domain/, types/api/, types/ipc/ 子目录，分类清晰 | ✓ |
| 扁平化文件组织 | 所有类型文件放在 src/types/ 根目录 | |
| 仅新增 IPC 类型 | 最小化结构，后续按需添加 | |

**User's choice:** 按领域分子目录 (推荐)
**Notes:** 符合研究建议，分类清晰

---

## 类型迁移策略

| Option | Description | Selected |
|--------|-------------|----------|
| 立即拆分现有类型 | 现有类型拆分到 domain/ 下，保持 re-export | |
| 新增类型使用新结构 (推荐) | 阶段 1 仅新增目录和 IPC 类型，现有类型保持不变 | ✓ |
| 激进重构 | 移动现有类型，更新所有导入路径 | |

**User's choice:** 新增类型使用新结构 (推荐)
**Notes:** 降低风险，渐进式迁移

---

## 错误类层次结构

| Option | Description | Selected |
|--------|-------------|----------|
| 完整错误类层次 (推荐) | 创建 AppError 基类 + 领域错误类 (IpcError, StoreError, NetworkError) | ✓ |
| 单一 AppError 类 | 仅一个 AppError 类，包含 code 和 message | |
| 仅定义接口，无类 | 仅定义 IpcErrorResponse 接口，使用原生 Error | |

**User's choice:** 完整错误类层次 (推荐)
**Notes:** 结构化，支持错误分类和处理

---

## IPC 错误响应格式

| Option | Description | Selected |
|--------|-------------|----------|
| 统一响应包装 (推荐) | 所有 IPC 响应使用 { success, data?, error? } 格式 | ✓ |
| 成功直接返回，异常包装 | 成功时直接返回数据，失败时 preload 包装错误 | |

**User's choice:** 统一响应包装 (推荐)
**Notes:** 统一调用方处理逻辑

---

## useAlert 返回值设计

| Option | Description | Selected |
|--------|-------------|----------|
| 响应式状态 + 函数 (推荐) | 返回 { alert, showAlert, hideAlert }，与现有模式一致 | ✓ |
| 纯函数式 API | 返回 show() 和 hide() 函数，内部管理状态 | |
| 全局服务模式 | 使用 provide/inject 实现全局 Alert | |

**User's choice:** 响应式状态 + 函数 (推荐)
**Notes:** 与现有代码模式一致，迁移成本低

---

## Alert 多实例支持

| Option | Description | Selected |
|--------|-------------|----------|
| 支持多实例堆叠 | 使用数组管理多个 Alert，支持同时显示 | |
| 单实例覆盖 (推荐) | 新消息覆盖旧消息，符合当前使用模式 | ✓ |

**User's choice:** 单实例覆盖 (推荐)
**Notes:** 简单实现，符合现有模式

---

## 全局错误处理器行为

| Option | Description | Selected |
|--------|-------------|----------|
| 全局捕获 + Alert 展示 (推荐) | 注册 errorHandler 和 onunhandledrejection，显示 Alert | ✓ |
| 仅控制台记录 | 捕获错误后记录日志，不显示 UI | |
| 分类处理策略 | 根据错误类型决定不同处理方式 | |

**User's choice:** 全局捕获 + Alert 展示 (推荐)
**Notes:** 统一处理，用户可见

---

## 错误信息展示方式

| Option | Description | Selected |
|--------|-------------|----------|
| 用户友好消息 (推荐) | 显示友好消息，技术细节记录控制台 | ✓ |
| 显示原始错误信息 | 显示技术信息，便于调试 | |
| 友好消息 + 可展开详情 | 显示友好消息，可展开查看技术细节 | |

**User's choice:** 用户友好消息 (推荐)
**Notes:** 用户友好，不暴露实现细节

---

## Claude's Discretion

- 类型文件的具体命名和导入方式
- 错误类的具体属性和方法签名
- useAlert 的具体实现细节
- 全局错误处理器的触发时机和条件

## Deferred Ideas

None — 讨论保持在阶段 1 范围内。
