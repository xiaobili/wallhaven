# Phase 38: downloadWallpaperFile 分层重构与重复下载检测 - Context

**Gathered:** 2026-05-02
**Status:** Ready for planning

<domain>
## Phase Boundary

对 `useWallpaperSetter` 中的 `downloadWallpaperFile` 进行分层重构与重复下载检测增强。

**背景（Phase 37 后的现状）：**
- `downloadWallpaperFile()` 已提取到 `useWallpaperSetter` composable
- 但它跳过 Service 层，直接调用 `electronClient.downloadWallpaper()`
- 没有重复下载检测机制

**范围内：**
- 在 `downloadService` 中新增简单下载方法，接收 service 参数
- 将 `useWallpaperSetter.downloadWallpaperFile` 中的下载执行逻辑委托给 `downloadService`
- 在 `downloadService` 中添加重复下载检测（文件名匹配）
- 检测到已存在文件时透明返回已有路径

**范围外：**
- 不改变 `useDownload` 下载队列逻辑
- 不改变 `electronClient.downloadWallpaper()` IPC 接口
- 不改变 UI 行为或用户交互逻辑
- 不改变 `setBgFromUrl` 的行为（下载+设壁纸流程不变）
- 不改变文件名生成规则
- 不涉及下载历史记录（finishedList）的重复检测

</domain>

<decisions>
## Implementation Decisions

### D-01: 分层策略 — 经 DownloadService
在 `downloadService` 中新增 `simpleDownload()` 方法，接收 url/filename/saveDir 参数，内部调用 `electronClient.downloadWallpaper()`。Composable 层通过 service 执行下载，不再直接调用 electronClient。

### D-02: 检测位置 — Service 层
重复下载检测统一在 `downloadService.simpleDownload()` 中实现。Composable 层和未来其他调用者自动获得检测能力。

### D-03: 匹配策略 — 文件名检测
生成完整目标路径后，通过 `electronClient` 检查文件是否已存在于磁盘。不依赖 `finishedList` 记录。

### D-04: 重复行为 — 透明返回
当文件已存在时，不通知用户，直接返回已有文件路径作为下载结果。`setBgFromUrl` 流程正常继续设置壁纸。

### D-05: 路径解析复用 — downloadService.getDownloadPath()
`simpleDownload()` 方法内部复用现有 `downloadService.getDownloadPath()` 进行下载路径解析（读设置 → 未设置则弹选择器 → 保存设置），消除 composable 层重复的路径处理。

### D-06: 与 useDownload 保持独立
简单下载仍不经过下载队列。`downloadService` 中新增的 `simpleDownload()` 与现有的 `startDownload()`（带队列/进度的托管下载）是两条独立的执行路径。

### Claude's Discretion
- `simpleDownload()` 方法的具体签名和内部错误处理细节
- `electronClient` 检查文件存在的具体实现方式
- 文件名与 `downloadService.getDownloadPath()` 的组合细节

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 被修改文件
- `src/composables/wallpaper/useWallpaperSetter.ts` — 将 `downloadWallpaperFile` 中的下载执行逻辑委托给 `downloadService`
- `src/services/download.service.ts` — 新增 `simpleDownload()` 方法，含路径解析和重复检测
- `src/clients/electron.client.ts` — 可能需新增文件存在检查方法（或复用已有方法）

### 参考模式
- `src/composables/wallpaper/useWallpaperSetter.ts` — `downloadWallpaperFile` 当前实现
- `src/services/download.service.ts` — 现有 `getDownloadPath()` 和 `startDownload()` 模式
- `src/clients/electron.client.ts` — `downloadWallpaper()` 和 `readDirectory()` 模式

### 项目约束
- `.planning/PROJECT.md` — 硬约束：已有功能的外观行为不变
- `.planning/codebase/ARCHITECTURE.md` — 分层架构：View → Composable → Service → Repository → Client

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `downloadService.getDownloadPath()` — 已有完整的下载路径解析逻辑（设置读取 + 文件夹选择器 + 路径保存）
- `electronClient.downloadWallpaper()` — 底层下载 IPC 方法，签名 `{url, filename, saveDir}`
- `DownloadResult` 接口 (`src/composables/wallpaper/useWallpaperSetter.ts:27-31`) — `{success, filePath, error}` 结构体

### Established Patterns
- Service 层统一错误处理：`IpcResponse<T>` 包裹返回，success/error 双通道
- Composable → Service → Client 调用链：composable 不直接调用 client
- 文件名生成规则：`wallhaven-{id}.{ext}`（从 URL 提取扩展名）

### Integration Points
- `useWallpaperSetter.downloadWallpaperFile()` — 替换内部实现，外部签名不变
- `downloadService` — 新增 `simpleDownload()`，与现有 `getDownloadPath()`、`startDownload()` 并列

</code_context>

<specifics>
## Specific Ideas

1. `simpleDownload()` 应复用 `downloadService.getDownloadPath()` 的路径解析逻辑，包括"未设置路径时弹选择器并自动保存"的行为。
2. 文件名生成逻辑（`wallhaven-{id}.{ext}`）应抽取为 `downloadService` 中的可复用方法，或作为 `simpleDownload()` 内部逻辑。
3. 文件存在检测：在 `electronClient` 层通过 IPC 实现文件系统访问（check if file exists），或复用现有的 `readDirectory()` 模式查询。

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 38-downloadwallpaperfile-layer-refactor-dedup*
*Context gathered: 2026-05-02*
