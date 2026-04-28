# Phase 22: Default Collection & Quick Favorite - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-28
**Phase:** 22-default-collection-quick-favorite
**Areas discussed:** 设置默认收藏夹的 UI 位置, 左键点击行为细节, 右键菜单和下拉菜单, 默认收藏夹的删除逻辑

---

## 设置默认收藏夹的 UI 位置

### UI 入口位置

| Option | Description | Selected |
|--------|-------------|----------|
| 方案 A | 在 CollectionItem 中添加「设为默认」按钮，悬停显示，与重命名/删除按钮并列 | |
| 方案 B | 在收藏夹项的右键上下文菜单中添加「设为默认收藏夹」选项 | |
| 方案 C | 方案 A + 方案 B 结合 | ✓ |

**User's choice:** 方案 C: 两者结合
**Notes:** 提供多种操作方式，满足不同用户习惯

### 默认收藏夹视觉标识

| Option | Description | Selected |
|--------|-------------|----------|
| 方案 A | 仅保持现有星形图标 | |
| 方案 B | 星形图标 + 名称旁标签 | |
| 方案 C | 星形图标 + 角标徽章 | ✓ |

**User's choice:** 方案 C: 星形图标 + 角标徽章
**Notes:** 双重标识更明确地告知用户哪个是默认收藏夹

---

## 左键点击行为细节

### 左键点击行为

| Option | Description | Selected |
|--------|-------------|----------|
| 方案 A | 左键点击直接添加到默认收藏夹，显示简短成功提示 | ✓ |
| 方案 B | 左键点击显示简短的确认气泡，用户点击确认后添加 | |
| 方案 C | 左键点击显示收藏夹选择下拉菜单（与当前行为一致） | |

**User's choice:** 方案 A: 直接添加，显示提示
**Notes:** 快速便捷，符合「快速收藏」语义

### 已在默认收藏夹中的左键行为

| Option | Description | Selected |
|--------|-------------|----------|
| 方案 A | 左键点击从默认收藏夹中移除 | ✓ |
| 方案 B | 如果已在默认收藏夹中，左键点击显示下拉菜单 | |
| 方案 C | 左键点击无反应 | |

**User's choice:** 方案 A: 从默认收藏夹移除
**Notes:** 与添加行为对称；简单直观的切换操作

---

## 右键菜单和下拉菜单

### 右键点击行为

| Option | Description | Selected |
|--------|-------------|----------|
| 方案 A | 右键显示完整的收藏夹选择下拉菜单 | ✓ |
| 方案 B | 右键显示简化的上下文菜单 | |
| 方案 C | 右键无特殊行为 | |

**User's choice:** 方案 A: 显示收藏夹下拉菜单
**Notes:** 保持用户对下拉菜单的熟悉感；提供完整的收藏夹操作选项

### 快速添加选项处理

| Option | Description | Selected |
|--------|-------------|----------|
| 方案 A | 移除「快速添加到默认收藏夹」选项 | ✓ |
| 方案 B | 保留「快速添加到默认收藏夹」选项 | |
| 方案 C | 将「快速添加」改为状态显示 | |

**User's choice:** 方案 A: 移除「快速添加」选项
**Notes:** 左键已可直接快速添加，无需在下拉菜单中重复；简化菜单

---

## 默认收藏夹的删除逻辑

### 删除限制

| Option | Description | Selected |
|--------|-------------|----------|
| 方案 A | 禁止删除默认收藏夹 | ✓ |
| 方案 B | 允许删除，删除后自动选择第一个收藏夹作为新默认 | |
| 方案 C | 允许删除，删除后不设置新默认 | |

**User's choice:** 方案 A: 禁止删除默认收藏夹
**Notes:** 确保始终有默认收藏夹可用于快速收藏

### 默认收藏夹唯一性

| Option | Description | Selected |
|--------|-------------|----------|
| 方案 A | 只允许一个默认收藏夹 | ✓ |
| 方案 B | 允许设置多个默认收藏夹 | |

**User's choice:** 方案 A: 只允许一个默认收藏夹
**Notes:** 简单清晰；避免「左键添加到多个收藏夹」的复杂行为

---

## Claude's Discretion

- 「设为默认」按钮的具体样式和位置
- 「默认」角标徽章的精确样式（颜色、大小、位置）
- 添加/移除成功提示的具体文案和显示时长
- 右键菜单的定位逻辑
- 是否在 ImagePreview 中也应用相同的左键/右键行为

## Deferred Ideas

None — 讨论保持在阶段范围内

---

*Phase: 22-default-collection-quick-favorite*
*Discussion completed: 2026-04-28*
