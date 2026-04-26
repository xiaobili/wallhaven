# Phase 5: 表现层重构与清理 - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-26
**Phase:** 05-presentation-layer-refactoring
**Areas discussed:** Alert 迁移, 死代码清理, 路由优化, ErrorBoundary, 重复代码, JSDoc 注释

---

## Alert 迁移

| Option | Description | Selected |
|--------|-------------|----------|
| 统一迁移到 useAlert | 所有组件统一使用 useAlert composable，删除内联的 reactive alert 状态。代码更简洁、一致 | ✓ |
| 保持现状 | 保持组件中的内联 alert 状态，不引入额外依赖 | |
| 选择性迁移 | 部分组件迁移，如只迁移逻辑复杂的组件，简单组件保持现状 | |

**User's choice:** 统一迁移到 useAlert
**Notes:** 用户选择推荐的方案，统一所有视图组件使用 useAlert composable

---

## 死代码清理

| Option | Description | Selected |
|--------|-------------|----------|
| 删除所有测试组件 | 直接删除，这些是开发测试组件，不再需要 | ✓ |
| 移动到开发目录 | 移出 src/ 目录，放到单独的 dev/ 或 examples/ 目录，不打包到生产构建 | |
| 保留并标记废弃 | 保留但添加 // @deprecated 注释，后续再清理 | |

**User's choice:** 删除所有测试组件
**Notes:** 删除 AlertTest.vue, APITest.vue, Diagnostic.vue, ElectronTest.vue, AlertDemo.vue

---

## 路由优化

| Option | Description | Selected |
|--------|-------------|----------|
| 删除测试路由 | 删除测试路由，只保留 4 个生产页面路由 | ✓ |
| 保留测试路由 | 保留测试路由用于调试，在生产构建时手动排除 | |
| 添加 dev 前缀 | 将测试路由放到 /dev/ 前缀下，方便区分 | |

**User's choice:** 删除测试路由
**Notes:** 删除 /api-test, /diagnostic, /alert-test 路由；路由懒加载已实现，无需额外配置

---

## ErrorBoundary 实现

| Option | Description | Selected |
|--------|-------------|----------|
| 创建 ErrorBoundary | 在 App.vue 使用 Vue 3 的 errorCaptured 钩子 + Suspense，捕获组件错误并显示后备 UI | ✓ |
| 不创建，用现有错误处理 | 利用已有的全局错误处理器（Phase 1 创建），不额外添加组件级错误边界 | |
| 选择性包装 | 只在关键组件（如壁纸列表）包裹错误边界，其他组件不处理 | |

**User's choice:** 创建 ErrorBoundary
**Notes:** 使用 Vue 3 的 errorCaptured 钩子实现

### ErrorBoundary 位置

| Option | Description | Selected |
|--------|-------------|----------|
| 在 App.vue 包装 | 在 App.vue 的 router-view 外层包裹 ErrorBoundary，捕获所有页面组件错误 | ✓ |
| 包装每个路由 | 在每个页面组件外层单独包装，提供更精细的错误处理 | |
| 只包装关键组件 | 只在壁纸列表、下载列表等可能出错的关键组件外包装 | |

**User's choice:** 在 App.vue 包装
**Notes:** 在 router-view 外层包装，捕获所有页面组件错误

---

## 重复代码

| Option | Description | Selected |
|--------|-------------|----------|
| 提取为 composables | 提取为独立的 composable，保持逻辑复用 | |
| 提取为工具函数 | 提取到 utils/helpers.ts，作为纯函数使用 | ✓ |
| 保持现状 | 当前重复程度可接受，不做额外处理 | |

**User's choice:** 提取为工具函数
**Notes:** generateFilename、downloadWallpaperFile 等函数提取到 utils/helpers.ts

---

## JSDoc 注释

| Option | Description | Selected |
|--------|-------------|----------|
| 全面添加注释 | 为所有公开函数、类型添加 JSDoc，便于后续维护 | ✓ |
| 选择性添加 | 只为关键函数和复杂逻辑添加注释 | |
| 不添加 | 当前注释已足够，不做额外处理 | |

**User's choice:** 全面添加注释
**Notes:** 为 Composables、工具函数、类型定义添加 JSDoc

---

## Claude's Discretion

- ErrorBoundary 组件的具体 UI 设计（保持与现有错误提示风格一致）
- JSDoc 注释的具体措辞和格式
- 重复代码提取后的函数签名细节

## Deferred Ideas

None — 讨论保持在阶段 5 范围内。

后续迭代可考虑的工作：
- 虚拟滚动优化大列表性能
- 更完善的键盘导航支持
- ARIA 无障碍属性增强
