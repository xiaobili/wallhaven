# Phase 3: 业务层与组合层 - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2025-04-25
**Phase:** 03-business-composable-layer
**Areas discussed:** Service 层职责划分, Composable 接口设计, Store 精简策略

---

## Service 层职责划分

### Service 应该承担多少职责？

| Option | Description | Selected |
|--------|-------------|----------|
| 重 Service 模式 | Service 包含业务逻辑+缓存+API Key注入，Composable 仅协调 Service 和 Store（服务层较重） | ✓ |
| 平衡模式 | Service 包含业务逻辑，缓存保留在 ApiClient，API Key 由 Composable 获取后传入 Service（职责平衡） | |
| 轻 Service 模式 | Service 仅封装 Repository 调用和简单业务逻辑，缓存和 API Key 在其他层处理（服务层较轻） | |

**User's choice:** 重 Service 模式
**Notes:** Service 是业务逻辑的主要承载者

---

### API Key 应该如何处理？

| Option | Description | Selected |
|--------|-------------|----------|
| Service 内部获取 | WallpaperService 内部直接调用 settingsRepository 获取 API Key，调用方无需传入 | ✓ |
| Composable 传入 | Composable 获取 API Key 后传入 Service 方法参数，Service 保持无状态 | |
| 依赖注入 | WallpaperService 构造时注入获取 API Key 的函数，兼顾灵活性和封装 | |

**User's choice:** Service 内部获取（推荐）
**Notes:** 保持调用简洁，调用方无需关心 API Key

---

### API 响应缓存应该放在哪里？

| Option | Description | Selected |
|--------|-------------|----------|
| 保留在 ApiClient | 缓存逻辑保留在现有 wallpaperApi.ts，Service 调用 apiClient（已完成缓存） | ✓ |
| 移到 Service 层 | Service 实现缓存逻辑，WallpaperService 管理 API 响应缓存 | |
| 独立 CacheService | 创建独立的 CacheService 供多个 Service 使用 | |

**User's choice:** 保留在 ApiClient（推荐）
**Notes:** 不重复实现缓存，现有实现已经足够

---

## Composable 接口设计

### Composable 应该返回什么类型？

| Option | Description | Selected |
|--------|-------------|----------|
| 类型化返回 | 每个 Composable 返回特定类型的状态对象和方法，如 { wallpapers, loading, fetch, loadMore } | ✓ |
| 返回 Store 实例 | 返回 Store 实例，让组件直接使用 Store 的状态和方法 | |
| Hooks 风格 | 返回 Vue hooks 风格数组，如 [state, actions]，类似 useState | |

**User's choice:** 类型化返回（推荐）
**Notes:** 与现有 useAlert 模式一致

---

### 错误应该如何处理和展示？

| Option | Description | Selected |
|--------|-------------|----------|
| Composable 处理 | Composable 捕获 Service 错误，自动调用 useAlert 显示错误提示，返回 boolean 表示成功/失败 | ✓ |
| 返回 Result 类型 | Composable 返回 Result<T> 类型，让组件决定如何展示错误 | |
| 抛出异常 | Service 抛出异常，Composable 不捕获，让全局错误处理器处理 | |

**User's choice:** Composable 处理（推荐）
**Notes:** 简化组件错误处理，自动显示友好提示

---

### Composable 与 Store 的关系？

| Option | Description | Selected |
|--------|-------------|----------|
| Composable 封装 Store | Composable 内部使用 Store，组件通过 Composable 与 Store 交互，不直接导入 Store | |
| Composable + Store 并存 | Composable 和组件都可以直接使用 Store，Composable 主要封装复杂操作流程 | ✓ |
| 最小化 Store | 移除大部分 Store，状态由 Composable 的 reactive 管理，仅保留必须持久化的状态 | |

**User's choice:** Composable + Store 并存（推荐）
**Notes:** 提供灵活性，组件可按需选择

---

## Store 精简策略

### Store 应该保留多少状态？

| Option | Description | Selected |
|--------|-------------|----------|
| 保守精简 | 保留所有现有状态，仅移除方法中的业务逻辑，改为调用 Service | |
| 合并 Store | 合并状态到单一 Store，移除重复的状态定义 | |
| 激进精简 | 大幅精简，移除大部分 Store 逻辑，由 Composable 管理 | ✓ |

**User's choice:** 激进精简
**Notes:** Store 仅保留必须持久化的状态

---

### Store 中的业务逻辑如何处理？

| Option | Description | Selected |
|--------|-------------|----------|
| 完全移除到 Service | 所有业务逻辑方法移到 Service，Store 仅保留纯状态和简单 getter | ✓ |
| 部分移除 | 复杂业务逻辑移到 Service，简单状态更新逻辑保留在 Store | |
| 保持结构 | 保持现有结构，仅将 Store 改为调用 Service 而非直接调用 API/IPC | |

**User's choice:** 完全移除到 Service
**Notes:** 彻底分离关注点

---

### 响应式状态如何保持？

| Option | Description | Selected |
|--------|-------------|----------|
| Store 保留响应式 | Store 继续使用 reactive/ref，Composable 从 Store 获取响应式状态 | ✓ |
| Composable 管理响应式 | Store 改为普通对象，Composable 使用 reactive 包装 | |
| Service 返回普通对象 | Service 返回普通对象，Store 和 Composable 根据需要包装响应式 | |

**User's choice:** Store 保留响应式（推荐）
**Notes:** 保持现有响应式系统不变

---

## 下载进度处理

### 下载进度回调如何处理？

| Option | Description | Selected |
|--------|-------------|----------|
| 保留现有架构 | 保留现有架构：main.ts 监听 IPC 进度，直接更新 downloadStore | |
| Composable 处理进度 | 下载进度回调传给 Composable，Composable 更新 Store | |
| Service 订阅模式 | DownloadService 提供进度订阅方法，Composable 订阅并更新 | ✓ |

**User's choice:** Service 订阅模式（推荐）
**Notes:** 封装 Electron 回调，提供清晰的订阅接口

---

## Claude's Discretion

以下方面留给 Claude 在规划阶段自行决定：
- Service 方法的具体命名和参数签名
- Composable 返回类型的具体定义
- Store 精简后的最终结构
- 进度订阅的具体实现方式

---

## Deferred Ideas

None — 讨论保持在阶段 3 范围内。

---

*Discussion completed: 2025-04-25*
