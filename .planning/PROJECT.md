# Wallhaven 壁纸浏览器 — 功能增强项目

## What This Is

Wallhaven 壁纸浏览器是一款基于 Electron 的桌面壁纸浏览与下载应用。用户可以浏览 Wallhaven 在线壁纸库，将喜欢的壁纸下载到本地收藏。

## Core Value

**断点续传，下载无忧** — 大文件下载不再担心中断，随时随地暂停恢复

## Current Milestone: v2.2 Store 分层迁移

**Goal:** 将 views 中直接使用的 store 全部迁移到 composables，强化 View → Composable → Store 分层架构

**Shipped:**
- v2.0 架构重构 (2026-04-26) — 38 requirements, 5 phases
- v2.1 下载断点续传 (2026-04-27) — 9 requirements, 4 phases

**Target features:**
- 分析并识别所有 views 中直接使用 store 的地方
- 为每个 store 创建或扩展对应的 composable
- 迁移所有 store 调用到 composables 层
- 清理 views 中的 store 直接引用

## Requirements

### Validated

**v2.0 架构重构 (shipped 2026-04-26):**
- ✓ IPC 模块化拆分 — 866 行 handlers.ts 拆分为 8 个领域模块
- ✓ Composables 抽象 — useAlert 等重复逻辑提取为可复用组合式函数
- ✓ 服务层抽象 — Electron API 统一服务层
- ✓ Store 重构 — 分离数据访问逻辑，实现 Repository 模式
- ✓ 类型安全强化 — 消除 60+ 处 `any` 类型
- ✓ 错误边界与处理 — Vue ErrorBoundary + 全局错误处理
- ✓ 代码规范化 — 统一命名规范、清理死代码
- ✓ 文件组织优化 — 分层架构清晰

**v2.1 下载断点续传 (shipped 2026-04-27):**
- ✓ 断点续传核心 — 暂停后恢复下载时从断点继续
- ✓ 进度持久化 — 应用重启后自动恢复未完成的下载任务
- ✓ Range 请求支持 — HTTP Range header 实现增量下载
- ✓ 错误处理增强 — 中文错误消息，孤儿文件清理

### Active

(None — will be defined in REQUIREMENTS.md)

### Future

以下需求在后续里程碑考虑：

- [ ] 为 Composables 添加单元测试
- [ ] 为 Services 添加单元测试
- [ ] 为 Repositories 添加单元测试
- [ ] 使用 safeStorage 加密 API Key
- [ ] 添加 IPC 通道白名单验证（已完成基础实现）
- [ ] 实现虚拟滚动
- [ ] 代码分割优化

### Out of Scope

v2.1 里程碑排除范围：

| 功能 | 原因 |
|------|------|
| 下载队列管理 | 当前仅聚焦断点续传，队列管理可后续迭代 |
| 批量下载优化 | 非核心需求，可后续迭代 |
| 下载限速功能 | 非核心需求，可后续迭代 |
| 多线程下载 | 复杂度高，当前使用单线程流式下载 |

v2.0 架构重构排除范围（已归档）：

| 新功能开发 | 本次为纯重构项目 |
| UI/UX 变更 | 保持用户体验一致 |
| 性能优化 | 非本次重构重点，可在后续迭代 |
| 国际化 | 非架构重构范畴 |
| 新增设置项 | 保持功能不变 |

## 技术背景

### 当前技术栈

- **桌面框架**：Electron v41.2.2
- **前端框架**：Vue 3.5.32 (Composition API)
- **构建工具**：electron-vite 5.0.0 / Vite 7.3.2
- **语言**：TypeScript 6.0.0
- **状态管理**：Pinia 3.0.4
- **路由**：Vue Router 5.0.4
- **HTTP 客户端**：Axios 1.15.0

### 架构改进

**分层架构**：Client → Repository → Service → Composable → View

```
┌─────────────────────────────────────────────────────────┐
│                     View Layer                          │
│  (OnlineWallpaper, LocalWallpaper, DownloadWallpaper)  │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                  Composable Layer                       │
│  (useAlert, useWallpaperList, useDownload, useSettings)│
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                   Service Layer                         │
│  (WallpaperService, DownloadService, SettingsService)  │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                 Repository Layer                        │
│  (WallpaperRepository, DownloadRepository,             │
│   SettingsRepository)                                   │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                    Client Layer                         │
│  (ElectronClient, ApiClient)                           │
└─────────────────────────────────────────────────────────┘
```

## 关键决策

| 决策 | 理由 | 结果 |
|------|------|------|
| 架构优先策略 | 建立稳固基础后再改进其他方面 | ✓ 成功 |
| 纯重构 | 不添加新功能，专注代码质量 | ✓ 成功 |
| IPC 向后兼容 | 保持现有通道名称和消息格式 | ✓ 无破坏性变更 |
| 渐进式重构 | 分阶段进行，每阶段可独立验证 | ✓ 成功 |
| 5 阶段渐进式重构 | 确保每阶段可独立验证，降低风险 | ✓ 成功 |
| Store 精简而非重写 | 降低破坏响应式风险 | ✓ 响应式正常 |
| Service 层管理 IPC 监听器 | 统一进度回调管理，支持多订阅者 | ✓ 架构清晰 |
| IPC 按功能域拆分为 8 个文件 | 每个 handler < 150 行，职责清晰 | ✓ 可维护性提升 |
| 添加 IPC 通道白名单验证 | 解决 invoke 通道无验证的安全风险 | ✓ 安全增强 |
| ErrorBoundary 使用 onErrorCaptured | Vue 3 原生错误边界方案 | ✓ 错误隔离 |
| useAlert 统一管理 Alert 状态 | 消除 4 处重复代码 | ✓ 代码复用 |

## 约束条件

### 不可变更（硬约束）

- **用户操作逻辑**：所有交互行为保持原样
- **界面布局**：组件结构和 DOM 结构不变
- **UI 显示效果**：样式、动画、视觉效果不变
- **功能行为**：所有现有功能的输入输出行为不变
- **API 兼容**：IPC 通道名称和消息格式保持向后兼容

### 可变更（重构范围）

- **代码内部架构**：模块划分、层次结构
- **类型定义**：消除 `any`，添加完整类型
- **错误处理机制**：添加错误边界、全局错误处理
- **代码组织**：文件拆分、命名规范、提取公共逻辑

## Context

**Shipped**: v2.0 架构重构 (2026-04-26), v2.1 下载断点续传 (2026-04-27)

**Statistics**:
- v2.0 Timeline: 7 days (2026-04-19 → 2026-04-26)
- v2.1 Timeline: 2 days (2026-04-26 → 2026-04-27)
- Total Files modified: 92
- Lines of code: ~9,000 (TypeScript + Vue)
- Requirements: 47 total (38 v2.0 + 9 v2.1)

**Known Technical Debt**:
- Type duplication between `env.d.ts` and `src/shared/types/ipc.ts` (code review finding)
- Phase 6 uses PLAN.md format instead of SUMMARY.md

---

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---

*创建时间：2025-04-25*
*最后更新：2026-04-27 v2.2 里程碑启动*
