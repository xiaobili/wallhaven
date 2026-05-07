# Phase 4: 代码质量（取消机制与配置）- Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-06
**Phase:** 04-code-quality-cancel-config
**Areas discussed:** 取消范围, 配置存储方式, 清理策略

---

## 取消范围

### 哪些异步操作需要 AbortController 支持？

| Option | Description | Selected |
|--------|-------------|----------|
| 仅壁纸搜索 | 只对 wallpaperService.search 添加取消支持，用户切换单页时取消上一个请求（影响最小） | |
| 搜索 + 下载 | 对壁纸搜索和下载任务都添加取消支持，下载取消需要与现有暂停/恢复逻辑配合 | ✓ |
| 全面支持 | 对多个异步操作添加取消支持，包括收藏操作、设置保存等 | |

**User's choice:** 搜索 + 下载
**Notes:** 用户认为壁纸搜索和下载是最频繁的异步操作

### 下载任务的取消行为如何处理？

| Option | Description | Selected |
|--------|-------------|----------|
| 仅取消新请求 | AbortController 只取消新下载请求的发起，已开始的下载通过现有的暂停/恢复机制管理 | ✓ |
| 可中断进行中下载 | AbortController 可以中断正在进行的下载，需要修改 download.handler 的 HTTP 请求逻辑 | |

**User's choice:** 仅取消新请求
**Notes:** 保持与现有暂停/恢复机制的兼容性

---

## 配置存储方式

### 配置值应该如何存储？

| Option | Description | Selected |
|--------|-------------|----------|
| TypeScript 常量 | 创建 src/config/constants.ts，配置值为 TypeScript 常量，编译时确定，简洁高效 | ✓ |
| JSON 配置文件 | 配置值为 JSON 文件，运行时读取，可在不重新构建的情况下调整 | |
| 数据库存储 | 配置值存入 SQLite 数据库，用户可在设置界面修改 | |

**User's choice:** TypeScript 常量
**Notes:** 当前阶段不需要运行时配置修改

### 配置值应该如何组织？

| Option | Description | Selected |
|--------|-------------|----------|
| 按功能域分组 | 按功能域分组：下载配置、缓存配置、数据库配置等，便于维护 | ✓ |
| 单文件统一 | 单一文件包含所有配置，简单直接 | |
| 就近分散 | 每个模块有自己的配置文件，配置与模块共置 | |

**User's choice:** 按功能域分组
**Notes:** 便于后续维护和扩展

---

## 清理策略

### 取消后的清理应该在何时触发？

| Option | Description | Selected |
|--------|-------------|----------|
| onUnmounted 钩子 | 在 composable 的 onUnmounted 中调用取消方法，遵循 Vue 生命周期 | ✓ |
| onScopeDispose | 在组件内部使用 onScopeDispose，适用于组合函数内的副作用清理 | |
| 显式 cleanup 方法 | 提供一个显式的 cleanup() 方法，让调用方决定何时清理 | |

**User's choice:** onUnmounted 钩子
**Notes:** 遵循 Vue 最佳实践

### 请求被取消后，Store 中的状态如何处理？

| Option | Description | Selected |
|--------|-------------|----------|
| 保持现有状态 | 请求被取消时，保持当前 Store 状态不变，避免 UI 闪烁 | ✓ |
| 重置状态 | 请求被取消时，重置 loading/error 状态为初始值 | |
| 标记取消状态 | 请求被取消时，标记为 'cancelled' 状态，UI 可显示取消指示 | |

**User's choice:** 保持现有状态
**Notes:** 静默取消，不向用户显示错误消息

---

## Claude's Discretion

- 具体的配置值分组结构由实现者决定
- AbortController 的 API 设计细节（方法名、参数）由实现者决定

## Deferred Ideas

None — 讨论保持在阶段范围内
