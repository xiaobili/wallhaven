# Wallhaven 壁纸浏览器

## What This Is

Wallhaven 是一款基于 Electron + Vue 3 + TypeScript 构建的跨平台桌面壁纸浏览与下载应用。用户可以搜索、浏览、下载和收藏来自 Wallhaven 的精美壁纸。

## Core Value

流畅体验：通过虚拟列表技术实现大量壁纸数据的流畅渲染，确保用户在浏览数千张壁纸时依然享受丝滑的滚动体验。

## Current Milestone: v1.1 虚拟列表优化

**Goal:** 将在线壁纸页面和收藏页面从传统分页改为虚拟列表滚动加载，提升大数据量渲染性能

**Target features:**
- 在线壁纸页面实现虚拟列表 + 无限滚动
- 收藏页面实现虚拟列表 + 无限滚动
- 使用 vue-virtual-scroller 库
- 保留所有现有功能（多选、hover交互、搜索筛选）
- 不保持滚动位置状态

## Requirements

### Validated

<!-- 现有已验证的功能 - 不影响这些 -->

- ✓ 在线壁纸搜索与浏览
- ✓ 本地壁纸管理
- ✓ 下载管理（断点续传）
- ✓ 收藏夹功能
- ✓ 应用设置
- ✓ 壁纸多选功能
- ✓ 卡片hover交互
- ✓ 搜索筛选功能

### Active

- [ ] 集成 vue-virtual-scroller 库
- [ ] 在线壁纸页面改造为虚拟列表 + 无限滚动
- [ ] 收藏页面改造为虚拟列表 + 无限滚动
- [ ] 确保现有功能在虚拟列表中正常工作
- [ ] 性能测试和优化

### Out of Scope

- ❌ 滚动位置保持 — 刷新后回到第一页
- ❌ 虚拟列表外的其他性能优化 — 专注于渲染性能
- ❌ 改变现有数据获取逻辑 — 只改变渲染方式

## Context

### 项目架构

项目采用清晰的分层架构：

```
View Layer → Composable Layer → Service Layer → Repository Layer → Client Layer
```

### 当前分页实现

- **在线壁纸页**：传统分页，每次加载一页数据
- **收藏页**：传统分页，每次加载一页数据
- **问题**：大量壁纸时DOM节点过多，滚动卡顿

### 技术栈

- Vue 3 + TypeScript
- Pinia（状态管理）
- vue-virtual-scroller（虚拟列表）
- Wallhaven API（数据源）

## Constraints

- **功能保留**: 所有现有功能必须正常工作
- **用户体验**: 滚动流畅度优先
- **兼容性**: 与现有 Composable 层兼容
- **性能**: 支持数千张壁纸的流畅滚动

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| 使用 vue-virtual-scroller | Vue 生态最成熟的虚拟列表库，社区活跃 | — 待执行 |
| 无限滚动加载 | 用户体验更流畅，符合现代应用习惯 | — 待执行 |
| 不保持滚动位置 | 简化实现，避免状态管理复杂性 | — 待执行 |
| 保留现有功能 | 不影响用户已习惯的功能 | — 待执行 |

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
*Last updated: 2026-05-06 after starting milestone v1.1*
