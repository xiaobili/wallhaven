# Wallhaven 壁纸浏览器 - 本地壁纸列表分页

## What This Is

Wallhaven 壁纸浏览器是一个基于 Electron + Vue 3 的跨平台桌面应用，用于浏览和下载 Wallhaven.cc 网站的壁纸。

v2.8.1 为**本地已下载壁纸管理页面**添加传统页码分页功能，优化本地壁纸数据的读取性能，解决从文件系统一次性加载所有壁纸导致的数据量大时卡顿的问题。

## Core Value

**流畅体验，数据驱动。** 在保持现有功能完全兼容的前提下，为本地壁纸管理引入分页机制，提升大数据量下的浏览流畅度。

## Requirements

### Validated

<!-- 已验证的核心功能 -->

- ✓ 在线壁纸浏览 — 搜索、筛选、分页
- ✓ 本地壁纸管理 — 文件浏览、设置壁纸
- ✓ 收藏系统 — 收藏夹、收藏项管理
- ✓ 下载管理 — 断点续传、队列控制
- ✓ 设置持久化 — SQLite 存储
- ✓ 跨平台支持 — Windows/macOS/Linux

<!-- v2.8.0 已完成需求 -->

- ✓ PERF-01: 下载进度 IPC 更新频率优化 — v2.8.0
- ✓ PERF-02: 壁纸搜索缓存策略改进 — v2.8.0 (LRU Cache)
- ✓ PERF-03: 收藏状态批量查询优化 — v2.8.0 (前端缓存)
- ✓ PERF-04: 图片尺寸解析可靠性提升 — v2.8.0 (Sharp 库)
- ✓ QUAL-01: 统一错误处理格式 — v2.8.0 (IpcErrorInfo)
- ✓ QUAL-02: 消除类型定义重复 — v2.8.0
- ✓ QUAL-03: 异步操作取消机制 — v2.8.0 (AbortController)
- ✓ QUAL-04: 配置值集中管理 — v2.8.0
- ✓ ARCH-01: 服务层职责边界明确化 — v2.8.0
- ✓ ARCH-02: 状态管理统一化 — v2.8.0
- ✓ ARCH-03: IPC 通道命名规范化 — v2.8.0

### Active

<!-- v2.8.1 里程碑需求 -->

- [ ] PAG-01: 后端支持分页读取目录 — file.handler.ts 接受 page/pageSize 参数，返回分页结果及总数
- [ ] PAG-02: 数据流链路支持分页 — service/repository/client/composable 逐层传递分页参数
- [ ] PAG-03: 前端分页 UI 集成 — LocalWallpaper.vue 集成 PaginationBar，实现页码导航
- [ ] PAG-04: 页面缓存与状态保持 — 切换页面时缓存当前页数据，避免重复读取

### Out of Scope

<!-- v2.8.1 里程碑不涉及的内容 -->

- **安全加固** — SEC-01~03 延后到后续版本
- **测试体系建设** — TEST-01~03 延后到后续版本
- **UI 布局变更** — 仅添加分页控件，不改变现有网格/卡片布局
- **行为变更** — 现有本地壁纸浏览行为保持不变

## Current Milestone: v2.8.1 本地壁纸列表分页

**Goal:** 为本地已下载壁纸管理页面添加传统页码分页功能，优化大数据量下的壁纸读取性能

**Target features:**
- 后端 file.handler.ts 支持分页参数和计数返回
- 前端数据流（service → repository → client → composable）逐层传递分页参数
- LocalWallpaper.vue 集成 PaginationBar 组件，实现页码导航
- 页面缓存机制，避免重复读取已加载页数据

## Context

### 技术环境

- **Electron**: 41.2.2 + Vue 3.5.32
- **架构**: 严格分层（Views → Composables → Services → Repositories → Clients）
- **状态管理**: Pinia 3.0.4（统一管理所有状态）
- **数据持久化**: SQLite (Node.js 内置)
- **构建工具**: electron-vite 5.0.0 + Vite 7.3.2

### 当前状态

- **代码量**: ~220,923 行 TypeScript/Vue
- **当前焦点**: 本地壁纸列表分页
- **技术债务**: 无新增

### 已优化领域（v2.8.0）

1. **性能瓶颈**: IPC 频率、缓存策略、批量查询、图片解析
2. **代码质量**: 错误处理、类型系统、取消机制、配置管理
3. **架构债务**: 职责边界、状态管理、命名规范

## Key Decisions

| 决策 | 理由 | 结果 |
|------|------|------|
| 使用 lru-cache | 基于内存大小的淘汰策略更合理 | ✓ Good |
| Service 无状态化 | 单一数据源原则，状态统一在 Store | ✓ Good |
| 创建 download-task.repository.ts | 修复 Service 层边界问题 | ✓ Good |
| 使用 sharp 库解析图片 | 支持 WebP 等更多格式 | ✓ Good |
| 统一 IPC 错误格式 | 便于错误追踪和处理 | ✓ Good |
| YOLO 模式 | 用户熟悉项目，无需交互式批准 | ✓ Good |
| 中等粒度 | 平衡计划复杂度和阶段数量 | ✓ Good |
| 原子提交 | 清晰的变更历史，易于回滚 | ✓ Good |
| 并行代理 | 独立任务并行执行，提升效率 | ✓ Good |

## Constraints

- **兼容性**: 所有现有功能必须保持完全一致的行为
- **架构约束**: 遵循现有分层架构（Views 禁止直接导入 stores）
- **技术栈**: 不引入新的核心依赖（除 lru-cache 等轻量工具库）
- **提交策略**: 原子提交，每个逻辑变更独立提交
- **测试验证**: 每个优化点必须有手动或自动测试验证

## Evolution

本文档在以下情况下更新：

1. **阶段完成后**: 移动 Active 需求到 Validated 或 Out of Scope
2. **需求变更时**: 添加新需求到 Active
3. **关键决策后**: 添加到 Key Decisions
4. **上下文变化时**: 更新 Context 部分

---

*创建日期: 2026-05-06*
*最后更新: 2026-05-07 — v2.8.1 milestone started*
*里程碑类型: 本地壁纸列表分页*
