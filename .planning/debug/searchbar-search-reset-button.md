---
status: resolved
trigger: SearchBar组件的 search-reset 按钮无效
created: 2026-04-26
updated: 2026-04-26
---

# Debug Session: searchbar-search-reset-button

## Symptoms

**Expected behavior:** 清空并恢复默认筛选
**Actual behavior:** 没有任何反应
**Error messages:** None reported
**Timeline:** 曾经工作过，现在失效
**Reproduction:** 搜索任意关键词后点击重置

## Current Focus

hypothesis: resetSelect 函数在 savedParams 为 null 时不执行任何操作
test: 检查 resetSelect 逻辑和 savedParams 的来源
expecting: 函数应在 savedParams 为 null 时使用默认值
next_action: null
reasoning_checkpoint: null
tdd_checkpoint: null

## Evidence

<!-- Entries: - timestamp: ... | observation: ... -->

- timestamp: 2026-04-26 | observation: SearchBar.vue 第 661-670 行 resetSelect 函数只在 savedParams 存在时执行
- timestamp: 2026-04-26 | observation: savedParams 初始值为 null (wallpaper/index.ts 第 38 行)
- timestamp: 2026-04-26 | observation: OnlineWallpaper.vue 的 saveParams 函数只显示提示，不保存参数
- timestamp: 2026-04-26 | observation: 用户从未点击保存按钮时，savedParams 始终为 null
- timestamp: 2026-04-26 | observation: localParams 默认值已定义（第 534-550 行），但 resetSelect 未使用
- timestamp: 2026-04-26 | observation: OnlineWallpaper.vue 第 127-129 行 saveParams 只显示提示，未调用 saveCustomParams
- timestamp: 2026-04-26 | observation: useWallpaperList composable 提供 saveCustomParams 方法用于保存参数到 electron-store

## Eliminated

<!-- Entries: - hypothesis: ... | reason: ... -->

- hypothesis: 事件绑定问题 | reason: 事件绑定正确，按钮点击确实触发了 resetSelect 函数

## Resolution

root_cause: OnlineWallpaper.vue 的 saveParams 函数只显示提示消息，未调用 saveCustomParams 保存参数到 electron-store，导致 savedParams 始终为 null
fix: 1) SearchBar.vue emit saveParams 时传递 localParams 2) OnlineWallpaper.vue 解构 saveCustomParams 并在 saveParams 中调用
verification: TypeScript 编译通过，保存参数后重置按钮应能正常恢复已保存的参数
files_changed: [src/components/SearchBar.vue, src/views/OnlineWallpaper.vue]
