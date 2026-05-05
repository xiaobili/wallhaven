# Phase 1: 虚拟列表基础集成 - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-06
**Phase:** 01-虚拟列表基础集成
**Areas discussed:** 虚拟列表组件设计, 无限滚动触发机制, 数据加载策略, Store 状态管理

---

## 虚拟列表组件设计

| Option | Description | Selected |
|--------|-------------|----------|
| 创建新组件 (推荐) | 创建独立的 WallpaperVirtualList.vue 组件。优点:不破坏现有代码、可并行测试、渐进迁移。缺点:增加文件数量、需要维护两套列表代码。 | ✓ |
| 改造现有组件 | 直接在 WallpaperList.vue 中集成 vue-virtual-scroller。优点:代码集中、不需新建文件。缺点:风险高、难以回滚、影响现有功能。 | |
| 混合组件 | 创建可配置的通用组件,通过 prop 切换传统列表/虚拟列表模式。优点:灵活、易测试。缺点:复杂度高、两种模式的兼容性挑战。 | |

**User's choice:** 创建新组件 (推荐)
**Notes:** 用户选择了推荐的方案,降低风险并支持渐进式迁移

---

## 无限滚动触发机制

| Option | Description | Selected |
|--------|-------------|----------|
| 内置滚动检测 (推荐) | vue-virtual-scroller 内置滚动事件和监听器,与组件深度集成,性能优化更好。优点:开箱即用、无额外依赖。缺点:调试困难、灵活性较低。 | ✓ |
| @vueuse/core | 使用 @vueuse/core 的 useInfiniteScroll composable。优点:灵活配置、可复用、易测试。缺点:需安装额外依赖、需手动集成。 | |
| IntersectionObserver | 使用原生 IntersectionObserver API 检测底部哨兵元素。优点:完全控制、无依赖。缺点:实现复杂、需手动管理性能。 | |

**User's choice:** 内置滚动检测 (推荐)
**Notes:** 用户选择使用库的内置机制,简化实现

---

## 数据加载策略

| Option | Description | Selected |
|--------|-------------|----------|
| 扩展现有 composable (推荐) | 扩展现有 useWallpaperList.ts 的 loadMore 方法,增加虚拟列表支持。优点:代码集中、易维护、复用现有逻辑。缺点:职责混淆、测试复杂。 | ✓ |
| 创建新 composable | 创建新的 useInfiniteScroll composable 专门管理无限滚动逻辑。优点:职责清晰、可复用、易测试。缺点:需新建文件、增加代码量、与现有 composable 协调。 | |

**User's choice:** 扩展现有 composable (推荐)
**Notes:** 用户选择扩展现有代码,保持代码集中和易维护

---

## Store 状态管理

| Option | Description | Selected |
|--------|-------------|----------|
| 扩展现有 Store (推荐) | 扩展现有 wallpaper store,增加虚拟列表相关的状态字段(allWallpapers, hasMore 等)。优点:状态集中、易管理、无需新建 store。缺点:store 职责增加、状态结构变复杂。 | ✓ |
| 创建新 Store | 创建新的 virtualListStore 专门管理虚拟列表状态,与 wallpaper store 分离。优点:职责清晰、不影响现有逻辑。缺点:状态分散、需协调两个 store、增加复杂度。 | |

**User's choice:** 扩展现有 Store (推荐)
**Notes:** 用户选择扩展现有 store,保持状态集中管理

---

## Claude's Discretion

无 — 所有决策均由用户明确选择,未使用 "you decide" 选项

## Deferred Ideas

无 — 讨论保持在阶段范围内,未提出超出范围的想法

---

*Discussion completed: 2026-05-06*
