# 下载去重机制

> 本文档阐述 Wallhaven 壁纸浏览器如何防止重复下载已经下载过的文件。

## 概述

下载去重采用**多层防御架构**，从 UI 层到文件系统层逐层拦截，确保任何路径都不会产生重复下载。

```
用户触发下载
     │
     ▼
┌─────────────────────────────────────┐
│  Layer 1: UI 层去重                  │  OnlineWallpaper.vue / FavoritesPage.vue
│  通过 isDownloading(wallpaperId) 检查  │
└─────────────────┬───────────────────┘
                  │ 通过
                  ▼
┌─────────────────────────────────────┐
│  Layer 2: Store 层去重               │  Pinia download store
│  downloadingList 中按 wallpaperId 查重 │
└─────────────────┬───────────────────┘
                  │ 通过
                  ▼
┌─────────────────────────────────────┐
│  Layer 3: 主进程队列去重              │  DownloadQueue.enqueue()
│  按 taskId 查重，防止竞争条件          │
└─────────────────┬───────────────────┘
                  │ 出队执行
                  ▼
┌─────────────────────────────────────┐
│  Layer 4: 文件系统去重                │  executeDownload()
│  fs.existsSync() 检查最终文件是否存在   │
└─────────────────────────────────────┘
                  │
              完成 / 跳过
```

---

## 各层详解

### Layer 1: UI 层去重（视图层）

**文件:** `src/views/OnlineWallpaper.vue:395`、`src/views/FavoritesPage.vue:170`

用户在点击下载时，视图层首先检查该壁纸是否已在下载列表中：

```typescript
// OnlineWallpaper.vue
const addToDownloadQueue = async (imgItem: WallpaperItem): Promise<void> => {
  if (isDownloading(imgItem.id)) {
    throw new Error('该壁纸已在下载队列中')
  }
  // ... 继续添加任务
}

// FavoritesPage.vue
const handleDownload = async (wallpaperData: WallpaperItem): Promise<void> => {
  if (isDownloading(wallpaperData.id)) {
    showWarning('该壁纸已在下载队列中')
    return
  }
  // ... 继续下载
}
```

- **去重键:** `wallpaperId`（壁纸的唯一 ID）
- **拦截时机:** 用户点击下载按钮时，任务创建之前
- **失败处理:** OnlineWallpaper 抛异常，FavoritesPage 弹警告

### Layer 2: Store 层去重（状态管理层）

**文件:** `src/stores/modules/download/index.ts:138-140`

`isDownloading()` 方法扫描 `downloadingList`，检查是否有相同 `wallpaperId` 的任务存在：

```typescript
function isDownloading(wallpaperId: string): boolean {
  return downloadingList.value.some((item) => item.wallpaperId === wallpaperId)
}
```

- **扫描范围:** 全部 `downloadingList`（包含 downloading / paused / waiting / failed / retrying 等所有状态）
- **去重键:** `wallpaperId`
- **设计意图:** 同一个壁纸在任意状态下都不允许重复入队

### Layer 3: 主进程队列去重（队列管理层）

**文件:** `electron/main/ipc/handlers/download-queue.ts:59-61, 68-72`

`DownloadQueue` 在入队时按 `taskId` 去重，防止渲染进程并发调用导致的竞争条件：

```typescript
has(taskId: string): boolean {
  return this._queue.some((item) => item.taskId === taskId)
}

enqueue(item: QueuedDownload): void {
  if (this.has(item.taskId)) {
    logHandler('download-queue', `Task already queued: ${item.taskId}`, 'warn')
    return  // 静默忽略，不报错
  }
  this._queue.push(item)
  // ...
}
```

- **去重键:** `taskId`（格式: `dl_时间戳_随机串`）
- **拦截时机:** 任务加入 FIFO 队列时
- **设计意图:** 防御 Layer 1/2 检查通过后到实际入队之间的并发窗口

### Layer 4: 文件系统级去重（执行层 — 最终安全网）

**文件:** `electron/main/ipc/handlers/download.handler.ts:332-346`

在执行下载之前，检查最终文件是否已存在于磁盘上：

```typescript
const filePath = path.join(saveDir, filename)

if (fs.existsSync(filePath)) {
  // 直接发送 completed 事件，100% 进度
  windows[0].webContents.send('download-progress', {
    taskId,
    progress: 100,
    offset: fs.statSync(filePath).size,
    speed: 0,
    state: 'completed',
    filePath,
  })
  return { filePath, size: fs.statSync(filePath).size }
}
```

- **去重键:** 文件路径（`saveDir + filename`）
- **拦截时机:** 开始 HTTP 下载之前
- **设计意图:** 最终安全网 — 即使前面所有层都失效，也能保证不重复下载
- **关键特性:** 文件已存在时直接标记完成，对用户完全透明

### Bonus: 简单下载路径的去重

**文件:** `src/services/download.service.ts:137-154`

不经过下载队列的"简单下载"（用于"设为壁纸"功能）有独立的去重路径：

```typescript
async simpleDownload(url: string, filename: string): Promise<IpcResponse<string>> {
  const saveDir = (await this.getDownloadPath()).data!
  const fullPath = `${saveDir}/${filename}`
  const existsResult = await electronClient.fileExists(fullPath)
  if (existsResult.success && existsResult.data) {
    return { success: true, data: fullPath }  // 文件已存在，直接返回路径
  }
  return electronClient.downloadWallpaper({ url, filename, saveDir })
}
```

### Bonus: 启动恢复去重

**文件:** `src/composables/download/useDownload.ts:446-452`

应用启动时恢复未完成的下载任务，会按 `taskId` 去重：

```typescript
for (const pending of pendingDownloads) {
  const existingTask = store.downloadingList.find((item) => item.id === pending.taskId)
  if (existingTask) {
    console.log('[useDownload] 任务已存在，跳过:', pending.taskId)
    continue
  }
  // ... 创建下载任务
}
```

---

## 各层对比

| 层级 | 文件 | 去重键 | 拦截时机 | 防御目标 |
|------|------|--------|----------|----------|
| Layer 1: UI | OnlineWallpaper.vue / FavoritesPage.vue | `wallpaperId` | 用户点击下载时 | 防止同一壁纸被添加多次 |
| Layer 2: Store | download store `isDownloading()` | `wallpaperId` | 任务创建前 | 状态层统一的重复检测 |
| Layer 3: Queue | download-queue.ts `enqueue()` | `taskId` | 任务入队时 | 并发竞争条件 |
| Layer 4: Filesystem | download.handler.ts `executeDownload()` | 文件路径 | HTTP 下载前 | 最终安全网 |
| 启动恢复 | useDownload.ts `restorePendingDownloads()` | `taskId` | 应用启动时 | 防止重复恢复 |
| 简单下载 | download.service.ts `simpleDownload()` | 文件路径 | IPC 调用前 | 非队列下载去重 |

---

## 设计考量

### 为什么需要多层？

单层去重无法覆盖所有场景：

- **UI 层** 无法防御程序化调用（右键菜单、快捷键等绕过 UI 的路径）
- **Store 层** 无法防御主进程的并发入队
- **Queue 层** 无法检测磁盘上已存在的文件（上次下载完成后文件仍在）
- **文件系统层** 是唯一能检测"之前已下载完成"的层

### 为什么使用不同的去重键？

- **`wallpaperId`:** 业务语义的重复检测，用户视角的"同一个壁纸"
- **`taskId`:** 运行时标识，防御同一个运行时任务被重复添加
- **文件路径:** 物理存在的检测，文件名级别的精确匹配

### 旧版行为差异

旧版 `download-wallpaper` IPC 处理程序（`download.handler.ts:748-756`）对重复文件采取**自动重命名**策略（追加 `_1`、`_2` 等序号），而非跳过。此行为仅影响不经过下载队列的旧版路径。
