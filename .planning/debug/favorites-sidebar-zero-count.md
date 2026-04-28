---
status: resolved
trigger: 收藏页面侧边栏所有收藏夹显示0张图片
created: 2026-04-28
updated: 2026-04-28
---

# Debug Session: Favorites Sidebar Zero Count Issue

## Symptoms

- **Expected behavior**: 收藏夹旁边应该显示实际包含的壁纸数量
- **Actual behavior**: 全部显示 0 张图片
- **Error messages**: 无
- **Timeline**: 不确定
- **Reproduction**: 打开收藏页面，查看侧边栏收藏夹列表
- **Data state**: 数据库中有收藏数据

## Root Cause

**问题根源：状态隔离导致数据无法共享**

`useFavorites()` 和 `useCollections()` composables 内部使用 `ref()` 创建本地状态，每次调用都会创建独立的响应式引用。

**具体问题**：
1. `FavoritesPage.vue` 调用 `useFavorites()` 获得状态 A，并调用 `loadFavorites()` 加载数据到 A
2. `CollectionSidebar.vue` 调用 `useFavorites()` 获得独立的状态 B（初始为空数组）
3. `CollectionSidebar.vue` 从未调用 `loadFavorites()` 来填充状态 B
4. 即使两个组件都调用 `loadFavorites()`，它们填充的也是各自独立的状态副本

**根本原因**：缺少 Pinia Store 层来提供共享状态

## Fix

采用与其他 composables（`useDownload`, `useSettings`）一致的模式：

1. **创建 `useFavoritesStore`** (`src/stores/modules/favorites/index.ts`)
   - 使用 Pinia defineStore 创建共享状态
   - 管理 `favorites` 和 `collections` 列表
   - 提供 `getCollectionCount()`, `uniqueWallpaperCount` 等计算属性

2. **重构 `useFavorites` composable** (`src/composables/favorites/useFavorites.ts`)
   - 使用 `useFavoritesStore()` 获取共享状态
   - 返回 store 中的计算属性

3. **重构 `useCollections` composable** (`src/composables/favorites/useCollections.ts`)
   - 使用同一个 store 获取 `collections` 状态
   - 确保所有组件访问同一份数据

4. **修复 `CollectionSidebar.vue`**
   - 在 `onMounted` 中同时加载 collections 和 favorites

## Verification

1. TypeScript 编译通过：`npx tsc --noEmit`
2. 应用启动后，侧边栏收藏夹显示正确数量

## Files Changed

- `src/stores/modules/favorites/index.ts` — 新建 Pinia Store
- `src/composables/favorites/useFavorites.ts` — 重构使用共享 Store
- `src/composables/favorites/useCollections.ts` — 重构使用共享 Store
- `src/components/favorites/CollectionSidebar.vue` — 添加 favorites 加载调用
