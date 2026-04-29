# Wallhaven 壁纸浏览器 — 功能增强项目

## What This Is

Wallhaven 壁纸浏览器是一款基于 Electron 的桌面壁纸浏览与下载应用。用户可以浏览 Wallhaven 在线壁纸库，将喜欢的壁纸下载到本地，并使用收藏夹功能管理喜欢的壁纸。

## Core Value

**收藏管理，分类随心** — 将喜欢的壁纸添加到自定义收藏夹，按主题分类管理

## Current Milestone: None (Planning Next)

**Last Shipped:** v2.5 壁纸收藏功能 (2026-04-29)

**Shipped Milestones:**
- v2.0 架构重构 (2026-04-26) — 38 requirements, 5 phases
- v2.1 下载断点续传 (2026-04-27) — 9 requirements, 4 phases
- v2.2 Store 分层迁移 (2026-04-27) — 10 requirements, 4 phases
- v2.3 ElectronAPI 分层重构 (2026-04-27) — 2 requirements, 1 phase
- v2.4 ImagePreview 导航功能 (2026-04-27) — 1 requirement, 1 phase
- v2.5 壁纸收藏功能 (2026-04-29) — 22 requirements, 7 phases

## Requirements

### Validated

**v2.5 壁纸收藏功能 (shipped 2026-04-29):**
- ✓ 完整收藏夹管理 — 创建、重命名、删除收藏夹
- ✓ 默认收藏夹 — 自动创建 "Favorites" 收藏夹，不可删除
- ✓ 快捷收藏 — 左键快速收藏到默认收藏夹
- ✓ 收藏选择器 — 右键显示收藏夹列表下拉菜单
- ✓ 多收藏夹支持 — 单个壁纸可属于多个收藏夹
- ✓ O(1) 收藏查询 — favoriteIds Set 实现高效查询
- ✓ 收藏浏览 — 按收藏夹筛选，网格展示，预览下载

**v2.4 ImagePreview 导航功能 (shipped 2026-04-27):**
- ✓ 上一张/下一张导航按钮
- ✓ 键盘快捷键支持

**v2.3 ElectronAPI 分层重构 (shipped 2026-04-27):**
- ✓ Views 无直接 electronAPI 调用 — 完整分层架构
- ✓ Service/Repository/Client 层完善

**v2.2 Store 分层迁移 (shipped 2026-04-27):**
- ✓ Views 无直接 store 访问 — 所有 store 调用通过 composables 层
- ✓ ESLint 规则 — 防止 store 直接导入回归
- ✓ 架构验证 — View → Composable → Store 分层完整

**v2.1 下载断点续传 (shipped 2026-04-27):**
- ✓ 断点续传核心 — 暂停后恢复下载时从断点继续
- ✓ 进度持久化 — 应用重启后自动恢复未完成的下载任务
- ✓ Range 请求支持 — HTTP Range header 实现增量下载
- ✓ 错误处理增强 — 中文错误消息，孤儿文件清理

**v2.0 架构重构 (shipped 2026-04-26):**
- ✓ IPC 模块化拆分 — 866 行 handlers.ts 拆分为 8 个领域模块
- ✓ Composables 抽象 — useAlert 等重复逻辑提取为可复用组合式函数
- ✓ 服务层抽象 — Electron API 统一服务层
- ✓ Store 重构 — 分离数据访问逻辑，实现 Repository 模式
- ✓ 类型安全强化 — 消除 60+ 处 `any` 类型
- ✓ 错误边界与处理 — Vue ErrorBoundary + 全局错误处理
- ✓ 代码规范化 — 统一命名规范、清理死代码
- ✓ 文件组织优化 — 分层架构清晰

### Active

(None — will be defined in REQUIREMENTS.md for next milestone)

### Future

以下需求在后续里程碑考虑：

- [ ] 为 Composables 添加单元测试
- [ ] 为 Services 添加单元测试
- [ ] 为 Repositories 添加单元测试
- [ ] 使用 safeStorage 加密 API Key
- [ ] 添加 IPC 通道白名单验证（已完成基础实现）
- [ ] 实现虚拟滚动
- [ ] 代码分割优化
- [ ] 收藏夹搜索功能
- [ ] 收藏夹排序功能
- [ ] 收藏数据导出/导入

### Out of Scope

| 功能 | 原因 |
|------|------|
| Wallhaven 云同步收藏 | 需要用户账号体系，增加复杂度，本地优先 |
| 收藏夹自动分类 | AI 分类功能复杂度高，可后续迭代 |
| 批量操作 | MVP 聚焦基础功能，批量可后续迭代 |
| 收藏夹密码保护 | 非核心需求，可后续迭代 |
| 收藏夹分享 | 需要网络功能，超出本地应用范围 |

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
│  (OnlineWallpaper, LocalWallpaper, DownloadWallpaper,  │
│   FavoritesPage)                                        │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                  Composable Layer                       │
│  (useAlert, useWallpaperList, useDownload, useSettings,│
│   useFavorites, useCollections)                         │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                   Service Layer                         │
│  (WallpaperService, DownloadService, SettingsService,  │
│   FavoritesService, CollectionsService)                 │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                 Repository Layer                        │
│  (WallpaperRepository, DownloadRepository,             │
│   SettingsRepository, FavoritesRepository)              │
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
| O(1) favoriteIds Set | 大收藏集下的高效查询 | ✓ 性能优化 |
| 左键快速收藏/右键选择器 | 高效 UX，覆盖常见用例 | ✓ 用户体验 |

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

**Shipped**: v2.0 架构重构 (2026-04-26), v2.1 下载断点续传 (2026-04-27), v2.2 Store 分层迁移 (2026-04-27), v2.3 ElectronAPI 分层重构 (2026-04-27), v2.4 ImagePreview 导航功能 (2026-04-27), v2.5 壁纸收藏功能 (2026-04-29)

**Statistics**:
- v2.0 Timeline: 7 days (2026-04-19 → 2026-04-26)
- v2.1 Timeline: 2 days (2026-04-26 → 2026-04-27)
- v2.2-v2.4 Timeline: 1 day (2026-04-27)
- v2.5 Timeline: 1 day (2026-04-28)
- Total Files modified: 144+
- Lines of code: ~13,364 (TypeScript + Vue)
- Requirements: 82+ total across all milestones

**Known Technical Debt**:
- Type duplication between `env.d.ts` and `src/shared/types/ipc.ts` (code review finding)
- Phase 6 uses PLAN.md format instead of SUMMARY.md
- Phases 18-22 lack VERIFICATION.md files (comprehensive SUMMARY.md exists)

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
*最后更新：2026-04-29 v2.5 里程碑归档*
