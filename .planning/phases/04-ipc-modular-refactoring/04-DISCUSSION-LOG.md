# Phase 4: IPC 模块化重构 - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2025-04-25
**Phase:** 04-ipc-modular-refactoring
**Areas discussed:** Handler 拆分粒度, 目录结构, 工具函数, 错误处理包装器, 响应格式, Preload 类型同步, 通道验证, 注册机制, 日志处理

---

## Handler 拆分策略

| Option | Description | Selected |
|--------|-------------|----------|
| 按功能域拆分 | 拆分为 8 个文件（file/download/settings/wallpaper/window/cache/api/store），每个文件 < 150 行 | ✓ |
| 最小拆分 | 保留原 handlers.ts，仅抽取出大函数到工具文件 | |
| 细粒度拆分 | 完全拆分为每个 IPC 通道一个文件，再通过 index.ts 统一注册 | |

**User's choice:** 按功能域拆分（推荐）
**Notes:** 符合 ROADMAP 需求 IPC-01 ~ IPC-08 的划分方式

---

## 目录结构

| Option | Description | Selected |
|--------|-------------|----------|
| handlers/ 子目录 | 在 electron/main/ipc/ 下创建 handlers/ 子目录，放入所有 handler 文件 | ✓ |
| 平铺在 ipc/ 下 | 在 electron/main/ipc/ 下直接放置所有 handler 文件（与 handlers.ts 同级） | |

**User's choice:** handlers/ 子目录（推荐）
**Notes:** 更清晰的组织结构，便于维护

---

## 工具函数处理

| Option | Description | Selected |
|--------|-------------|----------|
| 抽取到 base.ts | 创建 base.ts 存放共享类型、工具函数（如 streamPipeline）和错误包装器 | ✓ |
| 各自定义 | 每个 handler 文件内部定义自己需要的工具函数 | |

**User's choice:** 抽取到 base.ts（推荐）
**Notes:** 包括 getImageDimensions、generateThumbnail、streamPipeline 等

---

## 错误处理包装器

| Option | Description | Selected |
|--------|-------------|----------|
| 复用阶段 1 错误类 | 复用阶段 1 创建的 src/errors/ 错误类，在 IPC 层使用 try-catch + IpcError | ✓ |
| 创建 IPC 专用版本 | 创建 IPC 专用的错误包装器，不依赖阶段 1 的错误类 | |

**User's choice:** 复用阶段 1 错误类（推荐）
**Notes:** 阶段 1 已创建 AppError、IpcError、StoreError 等错误类

---

## 响应格式

| Option | Description | Selected |
|--------|-------------|----------|
| 统一格式 | 所有 handler 返回 { success, data?, error? } 格式，与阶段 1 IPC 类型一致 | ✓ |
| 保持现有格式 | 保持现有 handler 的返回格式，不强制统一 | |

**User's choice:** 统一格式（推荐）
**Notes:** 现有代码格式不完全一致，需要统一

---

## Preload 类型同步

| Option | Description | Selected |
|--------|-------------|----------|
| 创建共享类型文件 | 在 electron/preload/types.ts 中定义共享类型，被主进程和渲染进程共同引用 | ✓ |
| 保持现有定义 | 保持现有 preload/index.ts 中的接口定义，不做改动 | |

**User's choice:** 创建共享类型文件（推荐）
**Notes:** 定义 IPC 通道枚举、请求/响应类型

---

## IPC 通道验证

| Option | Description | Selected |
|--------|-------------|----------|
| 添加通道白名单 | 在 preload 中添加 invoke 通道白名单验证，只允许已注册的通道 | ✓ |
| 延后到后续迭代 | 保持现状，本次重构专注于模块化，安全加固延后 | |

**User's choice:** 添加通道白名单（推荐）
**Notes:** CONCERNS.md 指出：invoke 通道无白名单验证，存在安全风险

---

## 注册机制

| Option | Description | Selected |
|--------|-------------|----------|
| 统一注册文件 | 创建 handlers/index.ts 统一导入并注册所有 handler，确保不遗漏 | ✓ |
| 分散注册 | 每个 handler 文件自行注册（import 时副作用执行） | |

**User's choice:** 统一注册文件（推荐）
**Notes:** ROADMAP 指出：IPC 拆分后遗漏注册是高优先级风险

---

## 日志处理

| Option | Description | Selected |
|--------|-------------|----------|
| 统一日志工具 | 创建统一的 logHandler 工具函数，支持错误日志、调试日志等 | ✓ |
| 保持现状 | 保持现有 console.log/console.error 分散在各处 | |

**User's choice:** 统一日志工具（推荐）
**Notes:** 过滤敏感信息（如 API Key），统一日志格式

---

## Claude's Discretion

- 具体 handler 文件的内部实现细节
- 类型定义的具体结构和命名
- 完整性检查的具体实现方式
- 日志过滤的具体规则

## Deferred Ideas

None — 讨论保持在阶段 4 范围内。

---

*Discussion log created: 2025-04-25*
