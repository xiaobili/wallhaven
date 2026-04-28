---
status: resolved
trigger: 收藏页面已经设置默认收藏夹了，但在线页面点击收藏提示 请先设置默认收藏夹
created: 2026-04-28
updated: 2026-04-28
---

# Debug Session: default-favorites-folder-not-detected

## Symptoms

**Expected Behavior:**
在线页面点击收藏后，壁纸应该直接添加到默认收藏夹

**Actual Behavior:**
弹出提示「请先设置默认收藏夹」

**Error Messages:**
弹窗提示「请先设置默认收藏夹」

**Timeline:**
刚刚发现，是新问题

**Reproduction Steps:**
1. 在收藏页面设置默认收藏夹
2. 切换到在线页面
3. 点击收藏按钮
4. 弹出「请先设置默认收藏夹」提示

## Current Focus

**hypothesis:** null
**test:** null
**expecting:** null
**next_action:** fix committed
**reasoning_checkpoint:** null
**tdd_checkpoint:** null

## Evidence

- timestamp: 2026-04-28 - Session created, symptoms gathered
- timestamp: 2026-04-28 - 分析代码流程：
  - `OnlineWallpaper.vue` 调用 `useCollections().getDefault()` 获取默认收藏夹
  - `getDefault()` 查找 `collections.value.find(c => c.isDefault)`
  - `collections` 在 composable 中初始化为 `ref<Collection[]>([])` 空数组
  - 需要调用 `load()` 方法从 service/repository 加载数据
  - **问题根因**: `OnlineWallpaper.vue` 的 `onMounted` 只调用 `loadFavorites()` 但未调用 `loadCollections()`
  - 对比 `FavoritesPage.vue` 正确调用了 `Promise.all([loadCollections(), loadFavorites()])`

## Eliminated

<!-- Eliminated hypotheses go here -->

## Resolution

**root_cause:** `OnlineWallpaper.vue` 的 `onMounted` 钩子中遗漏调用 `loadCollections()`，导致 `collections` 数组为空，`getDefault()` 返回 `undefined`

**fix:** 在 `OnlineWallpaper.vue` 的 `onMounted` 中添加 `loadCollections()` 调用

**verification:**
1. 在收藏页面设置默认收藏夹
2. 切换到在线页面
3. 点击收藏按钮
4. 壁纸成功添加到默认收藏夹（不再弹出错误提示）

**files_changed:**
- src/views/OnlineWallpaper.vue
