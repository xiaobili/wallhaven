# Phase 37: 将 FavoritesPage.vue 和 OnlineWallpaper.vue 中的 handleSetBg/setBg 与 downloadWallpaperFile 提取为可复用组合函数 — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-02
**Phase:** 37-将 FavoritesPage.vue 和 OnlineWallpaper.vue 中的 handleSetBg/setBg 与 downloadWallpaperFile 提取为可复用组合函数
**Areas discussed:** Composable 命名与位置, 一个还是两个 composable, 与 useDownload 的关系, 返回值与错误处理风格

---

## Composable 命名与位置

| Option | Description | Selected |
|--------|-------------|----------|
| useWallpaperDownload | 新文件 src/composables/wallpaper/useWallpaperDownload.ts | |
| useWallpaperFile | 更通用的命名 | |
| 合并到 useWallpaperSetter | 在现有 composable 中扩展 | ✓ |

**User's choice:** 合并到 useWallpaperSetter
**Notes:** 用户选择不新建文件，而是扩展已有的 useWallpaperSetter composable。

---

## 一个还是两个 composable

| Option | Description | Selected |
|--------|-------------|----------|
| 只加 downloadWallpaperFile | 只提取下载方法 | |
| 加 downloadWallpaperFile + setBg | 同时提供下载和设壁纸的组合方法 | ✓ |
| 只加 setBgFromUrl | 仅暴露高阶方法 | |

**User's choice:** 加 downloadWallpaperFile + setBg
**Notes:** 同时暴露底层 `downloadWallpaperFile` 和高阶 `setBgFromUrl`，用户可以在 View 中按需选择。

---

## 与 useDownload 的关系

| Option | Description | Selected |
|--------|-------------|----------|
| 保持独立 | 直接调用 electronClient，不走队列 | ✓ |
| 集成到 useDownload | 走下载队列，统一管理 | |
| 可配置策略 | 调用者选择走队列或直接下载 | |

**User's choice:** 保持独立
**Notes:** 设壁纸是快速一次性操作，不需要排队/暂停/断点续传功能。

---

## 返回值与错误处理风格

| Option | Description | Selected |
|--------|-------------|----------|
| 结构化返回 | { success, filePath, error } | ✓ |
| 对齐 useWallpaperSetter | 返回 Promise<boolean> | |
| 返回 filePath 或 null | 最简洁但有信息丢失 | |

**User's choice:** 结构化返回
**Notes:** 上层自行处理错误提示，保持灵活性和错误信息完整性。

---

## Claude's Discretion

- 内部实现细节（导入方式、错误处理 catch 逻辑）
- TypeScript 接口命名
- setBgFromUrl 中成功/失败提示措辞

## Deferred Ideas

None — discussion stayed within phase scope.
