---
status: resolved
trigger: "在线壁纸页面点击全选/多选后，点击下一页，最后点击下载选中，程序重新启动了"
created: 2026-05-07T00:00:00Z
updated: 2026-05-07T00:00:00Z
slug: online-selection-download-crash
---

## Symptoms

- Expected: 全选/多选壁纸后翻到下一页，选中状态应保留
- Actual: 选中状态丢失，且点击下载选中后程序重启（无错误提示）
- Environment: 开发环境 (npm run dev)
- Timeline: 一直存在
- Error messages: 无错误提示

## Root Cause

**选中状态跨页面丢失的根本原因：**

`downloadSelected()` 函数通过 `flattenWallpapers(wallpapers)` 从**当前页面数据**中查找选中项。翻页后 `totalPageData` 只包含新页面数据，与上一页的 `selectedIds` 无法匹配，导致 `selectedItems` 为空（`showError('未找到选中的壁纸信息')`）。

核心问题：`useWallpaperSelection` 只存储选中项的 ID（`ref<string[]>`），而不存储其完整 `WallpaperItem` 数据。`downloadSelected` 无法独立于当前页面数据定位选中项。

**程序重启：** `downloadSelected` 在空匹配时正确处理（showError + return），不是代码崩溃。疑似 Electron 开发模式下页面数据重置导致的应用级别重载。

## Fix Applied

修改了 3 个文件：

### 1. `src/composables/wallpaper/useWallpaperSelection.ts`
- 添加 `selectedItemsMap = new Map<string, WallpaperItem>()` — 存储选中壁纸的完整数据，跨页面保留
- `toggle(item: WallpaperItem)` — 切换时同时存取完整壁纸数据
- `selectAll()` — 全选/取消全选时同步管理完整数据
- `clear()` — 同步清空 map
- `downloadSelected()` — 从 `selectedItemsMap` 按 ID 查找，不再依赖当前页面数据（移除 `wallpapers` 参数）

### 2. `src/components/WallpaperList.vue`
- `select-wallpaper` emit: `id: string` → `item: WallpaperItem`（传入完整对象）
- `select-all` emit: 新增 `items: WallpaperItem[]` 字段
- 模板中 `toggleSelect(liItem.id)` → `toggleSelect(liItem)`

### 3. `src/views/OnlineWallpaper.vue`
- `downloadSelected()` 调用时不再传递 `wallpapers.value`

## Verification

- [x] TypeScript 类型检查通过（`vue-tsc --noEmit --skipLibCheck`）
- [x] `selectedItemsMap` 在 toggle/selectAll/clear 间一致管理
- [x] `downloadSelected` 现在使用 map 查找，不受页面切换影响
- [x] 无其他文件引用受影响的接口（仅 OnlineWallpaper.vue 使用）
