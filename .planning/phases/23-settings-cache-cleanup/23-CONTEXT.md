# Phase 23: Settings Cache Cleanup - Context

**Gathered:** 2026-04-29
**Status:** Ready for planning

<domain>
## Phase Boundary

修改设置页面的「清空缓存」功能，使其只删除可重新生成的缓存文件（缩略图、临时文件），而保留用户数据（设置、收藏、下载历史等）。

**核心交付物：**
1. 移除 `storeClear()` 调用 — 清空缓存不再删除 electron-store 数据
2. 更新确认对话框提示 — 移除「设置将被重置」的说明
3. 通知其他页面刷新缩略图 — 清空缓存后触发缩略图重新生成

**阶段边界：**
- 仅修改 SettingPage.vue 的 `clearCache` 函数行为
- 移除对 `settingsService.clearStore()` 的调用
- 更新用户提示消息
- 添加缩略图刷新通知机制
- 不修改 `clearAppCache` IPC handler（已正确实现）
- 不修改 `storeClear` 功能本身（其他场景可能需要）

**当前状态：**
- ✅ `clearAppCache` IPC handler 正确实现 — 只删除缩略图和临时文件
- ✅ `storeClear` 功能完整 — 可清空所有 electron-store 数据
- ❌ SettingPage 调用了 `storeClear` — 导致用户数据被意外删除
- ❌ 确认对话框提示包含「设置将被重置」— 与新行为不符

</domain>

<decisions>
## Implementation Decisions

### 核心行为变更

- **D-01:** 清空缓存只删除可重新生成的文件
  - 只调用 `clearAppCache()`，删除缩略图缓存和临时文件
  - 移除 `clearStore()` 调用，保留用户设置、收藏数据、下载历史
  - 理由：用户期望「缓存清理」只清理可重新生成的数据，而非用户数据

- **D-02:** 保留内存缓存清除逻辑
  - 保留 `settingsService.clearCache()` 调用（清除内存中的设置缓存）
  - 这只是清除内存缓存，不影响持久化数据
  - 理由：确保下次获取设置时从 Repository 重新加载

### 用户提示更新

- **D-03:** 更新确认对话框内容
  - 移除「应用存储数据（设置将被重置）」相关说明
  - 新提示内容：
    ```
    确定要清空应用缓存吗？

    这将删除：
    • 缩略图缓存（下次访问时会重新生成）
    • 下载临时文件

    注意：不会删除已下载的壁纸文件和您的设置。
    ```
  - 理由：提示内容应准确反映实际行为

- **D-04:** 更新成功提示消息
  - 成功后只显示删除的缩略图和临时文件数量
  - 不再提及「设置已重置」
  - 理由：与实际行为一致

### 缩略图刷新机制

- **D-05:** 清空缓存后通知其他页面
  - 使用事件机制通知其他需要缩略图的页面
  - 可使用 Vue 的事件总线或 Pinia store 状态变更
  - 理由：缩略图被删除后，其他页面需要重新获取缩略图路径

- **D-06:** 刷新机制实现方式
  - 方案：在 `useLocalFiles` composable 中添加 `refreshThumbnails()` 方法
  - 调用 `readDirectory` 重新读取目录，获取最新的缩略图路径
  - 或使用事件总线 `emitter.emit('thumbnails-cleared')` 通知订阅者
  - 理由：最小化改动，复用现有机制

### Claude's Discretion

- 确认对话框的具体措辞
- 事件通知的具体实现方式（事件总线 vs Pinia 状态）
- 是否需要显示「正在刷新缩略图」的加载状态

</decisions>

<specifics>
## Specific Ideas

- 成功提示使用现有 Toast 风格，自动消失
- 缩略图刷新可以是静默的（不显示加载状态），用户下次访问时会自动生成
- 如果使用事件总线，确保事件名称清晰如 `thumbnails-cache-cleared`

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 项目规划
- `.planning/PROJECT.md` — 项目核心价值、约束条件（用户数据保护原则）
- `.planning/ROADMAP.md` — Phase 23 定义

### 代码库分析
- `.planning/codebase/ARCHITECTURE.md` — 现有架构、数据流、状态管理

### 关键代码文件（需修改/参考）

#### 设置页面（核心修改）
- `src/views/SettingPage.vue` — 清空缓存函数 `clearCache()`，确认对话框

#### 缓存相关 IPC
- `electron/main/ipc/handlers/cache.handler.ts` — `clear-app-cache` handler（无需修改，已正确实现）
- `electron/main/ipc/handlers/store.handler.ts` — `store-clear` handler（无需修改）

#### 缩略图使用页面
- `src/views/LocalWallpaper.vue` — 本地壁纸页面，使用缩略图
- `src/components/LocalWallpaperMain.vue` — 本地壁纸列表组件

#### 事件机制（可选使用）
- `src/Main.vue` — 应用主入口，可添加事件监听

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

#### SettingPage.vue clearCache 函数（需修改）
```typescript
const clearCache = async (): Promise<void> => {
  const confirmed = window.confirm(
    '确定要清空应用缓存吗？\n\n' +
    '这将删除：\n' +
    '• 缩略图缓存（下次访问时会重新生成）\n' +
    '• 下载临时文件\n' +
    '• 应用存储数据（设置将被重置）\n\n' +  // <- 需移除这行
    '注意：不会删除已下载的壁纸文件。'
  )

  if (!confirmed) return

  isClearing.value = true

  try {
    // 1. 清空缩略图和临时文件缓存
    const cacheResult = await settingsService.clearAppCache(...)

    // 2. 清空 Store 数据  <- 需移除这段代码
    const storeResult = await settingsService.clearStore()

    // 3. 重新从存储加载设置
    await load()
    startEdit()

    // ...
  }
}
```

#### cache.handler.ts clear-app-cache（正确实现）
```typescript
ipcMain.handle('clear-app-cache', async (_event, downloadPath?: string) => {
  // 1. 清理缩略图缓存目录
  const thumbnailDir = path.join(downloadPath, '.thumbnails')
  // 删除目录内容...

  // 2. 清理下载临时文件
  // 删除 .download 文件...

  // 3. 清理 Electron 渲染进程缓存
  await win.webContents.session.clearCache()
  await win.webContents.session.clearStorageData()
})
```
- 此 handler 已正确实现，只清理缓存文件

#### LocalWallpaper.vue 缩略图加载
```typescript
const refreshList = async (): Promise<void> => {
  const result = await readDirectory(downloadPath.value)
  localWallpapers.value = result.data.map(file => ({
    // ...
    thumbnailPath: file.thumbnailPath || '',
    // ...
  }))
}
```
- 可通过重新调用 `refreshList()` 刷新缩略图

### Established Patterns

- **确认对话框**：使用 `window.confirm()` 标准浏览器 API
- **Toast 提示**：使用 `useAlert` composable 的 `showSuccess`/`showError` 方法
- **事件通信**：项目中有事件总线模式（`emitter`），可复用

### Integration Points

- `src/views/SettingPage.vue` — 移除 `clearStore()` 调用，更新确认对话框
- `src/views/LocalWallpaper.vue` — 监听缩略图清除事件，刷新列表（可选）
- `src/Main.vue` — 可添加全局事件监听（如使用事件总线）

</code_context>

<deferred>
## Deferred Ideas

None — 本阶段为缓存清理行为修正，范围明确。

### 后续阶段

根据 REQUIREMENTS.md Future Requirements，后续里程碑可考虑：
- 为 Composables/Services/Repositories 添加单元测试
- 使用 safeStorage 加密 API Key
- 实现虚拟滚动、代码分割优化等

</deferred>

---

*Phase: 23-settings-cache-cleanup*
*Context gathered: 2026-04-29*
