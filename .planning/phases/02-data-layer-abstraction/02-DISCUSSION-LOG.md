# Phase 2: 数据层抽象 - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2025-04-25
**Phase:** 02-data-layer-abstraction
**Areas discussed:** Clients 实现策略, Repository 接口设计, 现有代码迁移, 与阶段 3 边界

---

## Clients 实现策略

| Option | Description | Selected |
|--------|-------------|----------|
| 大接口模式 | 每个 Client 封装一类操作，单例模式，文件可能较长 | ✓ |
| 子客户端模式 | 每个 Client 拆分为多个子客户端，文件小但实例多 | |
| 薄封装模式 | 直接返回原始响应，改动最小 | |

**User's choice:** 大接口模式（推荐）
**Notes:** ElectronClient 封装所有 25+ 个 window.electronAPI 方法

---

## ElectronClient 错误处理

| Option | Description | Selected |
|--------|-------------|----------|
| 统一返回 Result | 捕获所有 IPC 错误，返回 Result<T> 类型，调用方无需 try-catch | ✓ |
| 透传错误 | 直接透传错误，调用方自行 try-catch | |
| 转换为自定义错误 | 将 IPC 错误转换为 IpcError 并抛出 | |

**User's choice:** 统一返回 Result（推荐）
**Notes:** 与阶段 1 IPC 响应格式一致

---

## Clients 实例模式

| Option | Description | Selected |
|--------|-------------|----------|
| 单例模式 | 导出单一实例，所有模块共享 | ✓ |
| 类实例化模式 | 导出类，使用时实例化，方便测试 mock | |

**User's choice:** 单例模式（推荐）
**Notes:** 符合 Electron API 单例特性

---

## Repository 返回类型

| Option | Description | Selected |
|--------|-------------|----------|
| Result<T> 包装 | 返回 Promise<Result<T>>，错误通过 Result.error 返回 | ✓ |
| T \| null 模式 | 返回 Promise<T \| null>，错误记录日志但返回 null | |
| 抛出异常模式 | 失败时抛出 RepositoryError，调用方 try-catch | |

**User's choice:** Result<T> 包装（推荐）
**Notes:** 与 Clients 层返回类型一致

---

## Repository 方法命名

| Option | Description | Selected |
|--------|-------------|----------|
| get/set 风格 | 使用 get/set/delete，与现有 storage.ts 一致 | ✓ |
| CRUD 风格 | 使用 find/save/remove，更语义化 | |

**User's choice:** get/set 风格（推荐）
**Notes:** 迁移成本低

---

## Repository 缓存策略

| Option | Description | Selected |
|--------|-------------|----------|
| 无缓存 | Repository 只做数据访问，缓存由上层负责 | ✓ |
| 内置缓存 | Repository 内部缓存数据，减少 IPC 调用 | |

**User's choice:** 无缓存（推荐）
**Notes:** 保持职责单一

---

## 现有代码迁移策略

| Option | Description | Selected |
|--------|-------------|----------|
| 仅新建，不迁移 | 阶段 2 只创建新层，现有代码不变 | ✓ |
| 立即迁移 | 创建 Repository 并立即迁移现有调用 | |

**User's choice:** 仅新建，不迁移（推荐）
**Notes:** Store 迁移使用新 Repository 层留在阶段 3

---

## storage.ts 处理方式

| Option | Description | Selected |
|--------|-------------|----------|
| 保留并复用 | 保留 storage.ts，Repository 基于它构建 | |
| 删除并重构 | 删除 storage.ts，Repository 直接调用 ElectronClient | ✓ |

**User's choice:** 删除并重构
**Notes:** 不保留中间封装层，简化依赖链

---

## wallpaperApi.ts 处理方式

| Option | Description | Selected |
|--------|-------------|----------|
| 新建 ApiClient，保留现有 | 创建新的 ApiClient，保留 wallpaperApi.ts 作为业务层 | |
| 重构现有 API 层 | 重构 wallpaperApi.ts，移除业务逻辑，作为纯 HTTP 客户端 | ✓ |

**User's choice:** 重构现有 API 层
**Notes:** 移除 API Key 获取逻辑和缓存

---

## Repository 与 Service 边界

| Option | Description | Selected |
|--------|-------------|----------|
| Repository 纯数据访问 | Repository 只做 CRUD，业务逻辑留给 Service | ✓ |
| Repository 可含简单逻辑 | Repository 可以包含简单验证和转换逻辑 | |

**User's choice:** Repository 纯数据访问（推荐）
**Notes:** 验证、默认值填充由 Service 处理

---

## 下载逻辑拆分

| Option | Description | Selected |
|--------|-------------|----------|
| Repository 只存储，Service 执行 | DownloadRepository 只存储下载记录，下载执行由 DownloadService | ✓ |
| Repository 包含执行和存储 | DownloadRepository 同时包含下载执行和存储逻辑 | |

**User's choice:** Repository 只存储，Service 执行（推荐）
**Notes:** 职责分离清晰

---

## API Key 处理位置

| Option | Description | Selected |
|--------|-------------|----------|
| Service 层注入 | WallpaperService 从设置获取 API Key 并注入 | ✓ |
| Repository 构造注入 | WallpaperRepository 构造时接收 API Key | |

**User's choice:** Service 层注入（推荐）
**Notes:** Repository 不处理 API Key

---

## Claude's Discretion

以下方面由 Claude 自行决定：
- Clients 和 Repositories 的具体文件结构
- `Result<T>` 类型的具体定义
- `ApiClient` 与现有 `axios` 实例的整合方式
- 各 Repository 的具体方法签名

## Deferred Ideas

None — 讨论保持在阶段 2 范围内。

---

*Discussion log created: 2025-04-25*
