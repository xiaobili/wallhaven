---
status: resolved
trigger: 收藏页面删除某个收藏夹后，页面数据没有刷新，包括在线壁纸页面的收藏数据也没有刷新
created: 2026-04-28
updated: 2026-04-28
---

# Debug Session: favorites-folder-delete-not-refreshing

## Symptoms

**Expected behavior:**
- 删除收藏夹后，收藏夹列表自动刷新，移除被删除项
- 当前页面切换到其他收藏夹或空状态

**Actual behavior:**
- 收藏夹从列表消失，但壁纸数据未刷新
- 在线壁纸页面的收藏状态图标未更新

**Error messages:**
- 无错误信息

**Timeline:**
- 重启后数据才刷新

**Reproduction:**
1. 进入收藏页面
2. 点击删除按钮/确认对话框删除某个收藏夹
3. 收藏夹从列表消失
4. 但壁纸数据未刷新
5. 在线壁纸页面的收藏状态图标也未更新

## Current Focus

hypothesis: null
test: null
expecting: null
next_action: fix implemented

## Evidence

### 代码流程追踪

1. `CollectionSidebar.vue` line 134 调用 `deleteCollection(collection.id)`
2. `useCollections.ts` line 63-74: `deleteCollection` 执行:
   - Line 64: `await collectionsService.delete(id)`
   - Line 66: `await load()` 重新加载收藏夹
   - Line 68: `await store.loadFavorites()` 重新加载收藏项

### 问题定位

**Service 层缓存不一致问题:**

- `collectionsService.delete()` 调用 `this.clearCache()` 只清除自己的 `cachedCollections`
- `favoritesService` 有独立的 `cachedFavorites` 缓存
- 删除收藏夹时，`favoritesRepository.deleteCollection()` 正确删除了存储中的收藏夹和相关收藏项
- 但 `favoritesService.cachedFavorites` 从未被清除
- 当 `store.loadFavorites()` → `favoritesService.getAll()` 时，返回的是过期的缓存数据

### 数据流

```
CollectionSidebar.vue
    ↓ handleDelete()
useCollections.delete()
    ↓
collectionsService.delete()
    ↓ clears collectionsService.cachedCollections
favoritesRepository.deleteCollection()
    ↓ 正确删除存储数据 (collections + favorites)
    ↓
useCollections.delete() continues
    ↓
store.loadFavorites()
    ↓
favoritesService.getAll()
    ↓ 返回 cachedFavorites (未清除！过期数据！)
    ↓
UI 显示过期数据
```

## Eliminated

- ~~Pinia Store 状态未更新~~ - Store 正确调用 loadFavorites()，问题在 Service 层
- ~~IPC 通知问题~~ - 数据正确保存到存储，问题是内存缓存
- ~~组件响应式问题~~ - 组件正确使用 computed，问题在数据源

## Resolution

root_cause: |
  `collectionsService.delete()` 清除了自己的缓存，但没有清除 `favoritesService` 的缓存。
  当 `favoritesRepository.deleteCollection()` 删除收藏夹时，同时删除了相关的收藏项，
  但 `favoritesService.cachedFavorites` 仍然持有旧数据。
  后续调用 `favoritesService.getAll()` 时，返回了过期的缓存数据。

fix: |
  在 `collectionsService.delete()` 方法中，同时清除 `favoritesService` 的缓存。

  修改 `src/services/collections.service.ts`:
  - 导入 `favoritesService`
  - 在 `delete()` 方法成功后调用 `favoritesService.clearCache()`

verification: |
  1. 进入收藏页面，选择一个非默认收藏夹（内有壁纸）
  2. 删除该收藏夹
  3. 验证：收藏夹列表移除该项
  4. 验证：壁纸网格显示正确（应不显示已删除收藏夹的壁纸）
  5. 切换到在线壁纸页面
  6. 验证：收藏状态图标正确更新（之前在该收藏夹的壁纸应显示未收藏）

files_changed:
  - src/services/collections.service.ts
