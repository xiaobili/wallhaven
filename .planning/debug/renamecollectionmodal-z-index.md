---
status: resolved
trigger: 收藏页面 RenameCollectionModal被壁纸列表遮挡住了
created: 2026-04-28
updated: 2026-04-28
---

# Debug Session: RenameCollectionModal Z-Index Issue

## Symptoms

- **Expected behavior**: Modal 应该覆盖在壁纸列表之上，背景变暗，聚焦在模态框上
- **Actual behavior**: Modal 部分被遮挡，被壁纸列表覆盖
- **Error messages**: 无
- **Timeline**: 一直存在，这个功能从未正常工作过
- **Reproduction**: 选中收藏夹 -> 点击重命名按钮

## Current Focus

- hypothesis: null
- test: null
- expecting: null
- next_action: null
- reasoning_checkpoint: null
- tdd_checkpoint: null

## Evidence

### Root Cause Analysis

1. `RenameCollectionModal` 嵌套在 `CollectionSidebar.vue` 组件内
2. `CollectionSidebar` 使用 `position: fixed`，这创建了一个新的 stacking context（堆叠上下文）
3. Modal 的 `z-index: 9999` 只在 sidebar 的堆叠上下文内生效
4. 壁纸列表（`favorites-grid`）在 DOM 中位于 sidebar 之后渲染，可能覆盖 modal

### Stacking Context Trap

```
body
├── .left-menu (z-index: 998, position: fixed)
├── .container
│   └── FavoritesPage
│       ├── ImagePreview (z-index: 999, 在顶层渲染)
│       ├── Alert (z-index: 9999, 在顶层渲染)
│       └── .favorites-page
│           ├── CollectionSidebar (position: fixed) ← 创建堆叠上下文
│           │   ├── CollectionList
│           │   ├── CreateCollectionModal (z-index: 1000) ← 被困在 sidebar 上下文中
│           │   └── RenameCollectionModal (z-index: 9999) ← 被困在 sidebar 上下文中
│           └── .favorites-content
│               └── .favorites-grid ← 可能在视觉上覆盖 modal
```

## Eliminated

- N/A

## Resolution

- **root_cause**: Modal 组件被嵌套在具有 `position: fixed` 的父元素内，导致 z-index 被限制在该堆叠上下文中
- **fix**: 使用 Vue 的 `<Teleport to="body">` 将 modal 渲染到 body 级别，脱离 sidebar 的堆叠上下文
- **verification**: 启动应用，导航到收藏页面，点击重命名按钮，modal 现在应该正确覆盖所有内容
- **files_changed**:
  - `src/components/favorites/RenameCollectionModal.vue` - 添加 `<Teleport>` 包裹
  - `src/components/favorites/CreateCollectionModal.vue` - 同样添加 `<Teleport>` 包裹（预防性修复）
