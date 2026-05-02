# Phase 37: 将 FavoritesPage.vue 和 OnlineWallpaper.vue 中的 handleSetBg/setBg 与 downloadWallpaperFile 提取为可复用组合函数 — Context

**Gathered:** 2026-05-02
**Status:** Ready for planning

<domain>
## Phase Boundary

提取 `FavoritesPage.vue` 和 `OnlineWallpaper.vue` 中重复的 `downloadWallpaperFile` 与 `setBg`/`handleSetBg` 逻辑到可复用的组合函数，消除代码重复，与已有的 `useWallpaperSetter` composable 合并。

**现状：**
- `downloadWallpaperFile()` 在两个 View 中完全重复（各 ~45 行）
- `setBg()` / `handleSetBg()` 是"下载文件 + 设壁纸"的同一模式重复
- 现有 `useWallpaperSetter` 只提供 `setWallpaper(imagePath)` 方法

**范围内：**
- 将 `downloadWallpaperFile` 提取到 `useWallpaperSetter` 作为新方法
- 在 `useWallpaperSetter` 中添加 `setBgFromUrl()` 高便捷方法（下载+设壁纸一体）
- 更新 `FavoritesPage.vue` 使用提取后的 composable
- 更新 `OnlineWallpaper.vue` 使用提取后的 composable
- 删除 View 中重复的 `downloadWallpaperFile` 和 `setBg`/`handleSetBg` 函数

**范围外：**
- 不改变 `useDownload` 下载队列逻辑
- 不改变 `electronClient.downloadWallpaper()` IPC 接口
- 不改变 UI 行为或用户交互逻辑
- 不改动其他 View（如 LocalWallpaper.vue）的设壁纸行为

</domain>

<decisions>
## Implementation Decisions

### D-01: Composable 扩展方案 — 合并到 useWallpaperSetter
不新建 composable 文件。在现有 `src/composables/wallpaper/useWallpaperSetter.ts` 中扩展添加新方法。

### D-02: 新增方法 — downloadWallpaperFile + setBgFromUrl
- **`downloadWallpaperFile(imgItem: WallpaperItem): Promise<DownloadResult>`** — 底层下载方法，获取保存目录、生成文件名、调用 `electronClient.downloadWallpaper()`、返回结构化的下载结果
- **`setBgFromUrl(imgItem: WallpaperItem): Promise<void>`** — 高阶便捷方法，内部调用 `downloadWallpaperFile()` 然后调用 `setWallpaper()`，处理完整"下载+设壁纸"流程

### D-03: 与 useDownload 的关系 — 保持独立
设壁纸是一次性快速操作，不经过 `useDownload` 下载队列。新方法直接调用 `electronClient.downloadWallpaper()`，不需要排队、暂停或断点续传功能。

### D-04: 返回值格式 — 结构化返回
```typescript
interface DownloadResult {
  success: boolean
  filePath: string | null
  error: string | null
}
```
上层（View 或 `setBgFromUrl`）自行处理错误提示，保持灵活。

### Claude's Discretion
- 内部实现细节（如导入方式、错误处理的具体 catch 逻辑）
- TypeScript 接口命名（`DownloadResult` 或其他合适名称）
- `setBgFromUrl` 中成功/失败提示的措辞

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 源文件（将被修改）
- `src/composables/wallpaper/useWallpaperSetter.ts` — 扩展此文件，添加 `downloadWallpaperFile` 和 `setBgFromUrl` 方法
- `src/views/FavoritesPage.vue` — 移除 `downloadWallpaperFile` 和 `handleSetBg`，使用 composable
- `src/views/OnlineWallpaper.vue` — 移除 `downloadWallpaperFile` 和 `setBg`，使用 composable
- `src/composables/index.ts` — 更新导出（如需要新增类型导出）

### 参考模式
- `src/composables/wallpaper/useWallpaperSetter.ts` — 现有 `useWallpaperSetter` 实现模式
- `src/composables/download/useDownload.ts` — 现有 download composable 的目录获取和 electronClient 使用模式
- `src/composables/index.ts` — 统一导出入口

### 项目约束
- `.planning/PROJECT.md` — 硬约束：已有功能的外观行为不变
- `.planning/codebase/CONVENTIONS.md` — Composables 命名和接口规范

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `useWallpaperSetter` (`src/composables/wallpaper/useWallpaperSetter.ts`) — 已有 `setWallpaper(imagePath)` 方法和 `useAlert` 集成，可直接复用
- `useSettings` — 提供 `settings.value.downloadPath` 和 `selectFolder()` 方法
- `electronClient.downloadWallpaper()` — 底层下载 IPC 方法，两个 View 都在使用

### Established Patterns
- Composable 命名规范：`use` 前缀，按领域组织在 `src/composables/` 子目录
- 统一导出：`src/composables/index.ts` 导出所有 composable
- 结构化返回：对于需要返回多个值的操作，使用对象类型而非仅 boolean
- Settings 懒加载：未设置下载目录时弹出文件夹选择器

### Integration Points
- **useWallpaperSetter** — 插件式添加新方法，保持 `setWallpaper` 不动
- **FavoritesPage.vue 第 201/221 行** — 移除 `handleSetBg` 和 `downloadWallpaperFile`，改为 composable 调用
- **OnlineWallpaper.vue 第 312/344 行** — 移除 `setBg` 和 `downloadWallpaperFile`，改为 composable 调用
- **composables/index.ts** — 可能需要在接口导出中添加新类型

</code_context>

<specifics>
## Specific Ideas

1. `setBgFromUrl` 是两层组合：先调用内部 `downloadWallpaperFile`，成功后调用 `setWallpaper`。View 侧原来每个文件的 `setBg`/`handleSetBg` 将被替换为一行调用。
2. `downloadWallpaperFile` 需要处理文件夹选择逻辑（settings 中有路径就用，没有就弹出选择器并保存），这逻辑在两个 View 中完全一致，应完整提取。
3. 文件名生成逻辑（从 URL 提取扩展名，生成 `wallhaven-{id}{ext}`）也应封装在 composable 内部。

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 37-将 FavoritesPage.vue 和 OnlineWallpaper.vue 中的 handleSetBg/setBg 与 downloadWallpaperFile 提取为可复用组合函数*
*Context gathered: 2026-05-02*
