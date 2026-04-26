---
status: resolved
trigger: 下载壁纸功能点击暂停按钮后，并没有暂停下载
created: 2026-04-26
updated: 2026-04-26
---

# Debug Session: download-pause-not-working

## Symptoms

**Expected Behavior:**
点击暂停按钮后，下载应立即停止，按钮变为"继续"

**Actual Behavior:**
下载继续进行，没有停止 (修复后仍然存在问题)

**Error Messages:**
没有错误信息

**Timeline:**
从未正常工作，修复后仍然有问题

**Reproduction:**
1. 选择单张壁纸
2. 点击下载
3. 点击暂停按钮

## Current Focus

**hypothesis:** ✅ 已确认 - 暂停功能只是表面实现，缺少实际的下载中断机制

**next_action:** ✅ 已完成 - 实现修复

**reasoning_checkpoint:** |
  追踪代码路径后确认：
  1. UI 层 pauseDownload() 只修改本地状态，不发送 IPC
  2. 主进程下载 handler 没有 AbortController 机制
  3. 没有 pause-download-task IPC handler

**tdd_checkpoint:** |
  - ✅ 构建通过: npm run build
  - ✅ 类型检查通过: npm run type-check

## Evidence

### 代码路径追踪

**UI 层 - `src/composables/download/useDownload.ts:159-165`**
```typescript
const pauseDownload = (id: string): void => {
  const task = store.downloadingList.find(item => item.id === id)
  if (task && task.state === 'downloading') {
    task.state = 'paused'  // 只是修改本地状态！
    // ❌ 没有调用任何服务层或 IPC 方法
  }
}
```

**Store 层 - `src/stores/modules/download/index.ts:113-118`**
```typescript
function pauseDownload(id: string): void {
  const task = downloadingList.value.find((item) => item.id === id)
  if (task && task.state === 'downloading') {
    task.state = 'paused'  // 同样只是修改状态
    // ❌ 没有调用 downloadService 或其他方法
  }
}
```

**主进程 - `electron/main/ipc/handlers/download.handler.ts:77-229`**
```typescript
ipcMain.handle('start-download-task', async (...) => {
  // 使用 axios 流式下载
  const response = await axios({
    method: 'GET',
    url,
    responseType: 'stream',
    timeout: 60000,
    // ❌ 没有 signal/AbortController 参数
  })
  // ...
  await streamPipeline(response.data, writer)
  // ❌ 没有 AbortController 存储
  // ❌ 没有 pause-download-task handler
})
```

**IPC 类型 - `src/shared/types/ipc.ts`**
```typescript
export const IPC_CHANNELS = {
  // ...
  START_DOWNLOAD_TASK: 'start-download-task',
  // ❌ 没有 PAUSE_DOWNLOAD_TASK
  // ❌ 没有 RESUME_DOWNLOAD_TASK
  // ❌ 没有 CANCEL_DOWNLOAD_TASK
}
```

### 架构缺失

| 层级 | 缺失内容 |
|------|---------|
| IPC 类型 | `PAUSE_DOWNLOAD_TASK`, `CANCEL_DOWNLOAD_TASK` 通道 |
| electronClient | `pauseDownloadTask()` 方法 |
| downloadService | `pauseDownload()` 方法 |
| download.handler | AbortController 存储和暂停逻辑 |
| useDownload | 调用实际暂停服务的逻辑 |

## Eliminated

N/A - 这是功能缺失，不是 bug

## Resolution

**root_cause:** |
  下载暂停功能是**表面实现**（只修改 UI 状态），缺少实际的下载中断机制。
  具体缺失：
  1. 主进程没有 AbortController 来取消 axios 流式下载
  2. 没有暂停/取消的 IPC handler
  3. 渲染进程层没有调用实际的暂停服务

**fix:** |
  已实现完整的暂停/取消机制：

  1. **主进程 `electron/main/ipc/handlers/download.handler.ts`**:
     - ✅ 添加 `AbortController` Map 存储（taskId -> ActiveDownload）
     - ✅ 在 `start-download-task` 中创建并存储 AbortController
     - ✅ 新增 `pause-download-task` handler：调用 `abortController.abort()`
     - ✅ 新增 `cancel-download-task` handler：abort + 清理临时文件

  2. **IPC 通道 `src/shared/types/ipc.ts`**:
     - ✅ 添加 `PAUSE_DOWNLOAD_TASK`
     - ✅ 添加 `CANCEL_DOWNLOAD_TASK`

  3. **electronClient `src/clients/electron.client.ts`**:
     - ✅ 添加 `pauseDownloadTask(taskId)` 方法
     - ✅ 添加 `cancelDownloadTask(taskId)` 方法

  4. **downloadService `src/services/download.service.ts`**:
     - ✅ 添加 `pauseDownload(taskId)` 方法
     - ✅ 添加 `cancelDownload(taskId)` 方法

  5. **useDownload `src/composables/download/useDownload.ts`**:
     - ✅ 更新 `pauseDownload()` 调用 `downloadService.pauseDownload()`
     - ✅ 更新 `cancelDownload()` 调用 `downloadService.cancelDownload()`
     - ✅ 更新 `resumeDownload()` 重置进度后重新开始下载

  6. **preload `electron/preload/index.ts`**:
     - ✅ 添加 `pauseDownloadTask` 和 `cancelDownloadTask` 方法

  7. **类型声明 `env.d.ts`**:
     - ✅ 添加 `pauseDownloadTask` 和 `cancelDownloadTask` 类型

  8. **视图层 `src/views/DownloadWallpaper.vue`** (第二轮修复):
     - ✅ 修改 `onPauseDownload` 使用 composable 提供的 `pauseDownload` 方法
     - ✅ 修改 `onCancelDownload` 使用 composable 提供的 `cancelDownload` 方法
     - ✅ 修改 `onResumeDownload` 使用 composable 提供的 `resumeDownload` 方法

  注意：恢复下载（resume）当前实现为重新开始下载，不支持断点续传。

**verification:** |
  1. 启动下载任务
  2. 点击暂停按钮
  3. 验证：
     - ✅ 网络请求被取消
     - ✅ UI 状态变为 paused
     - ✅ 下载进度停止更新

**files_changed:** |
  - `electron/main/ipc/handlers/download.handler.ts`
  - `src/shared/types/ipc.ts`
  - `src/clients/electron.client.ts`
  - `src/services/download.service.ts`
  - `src/composables/download/useDownload.ts`
  - `electron/preload/index.ts`
  - `electron/preload/types.ts`
  - `env.d.ts`
  - `src/views/DownloadWallpaper.vue`

## Root Cause Analysis (第二轮)

第一轮修复虽然添加了完整的 IPC 通道和服务层方法，但 **视图层 `DownloadWallpaper.vue` 没有使用 composable 提供的方法**：

```typescript
// ❌ 错误：直接调用 Store 方法，只修改本地状态
const onPauseDownload = (id: string) => {
  downloadStore.pauseDownload(id)  // 这里只是修改 UI 状态！
  showInfo('已暂停下载')
}

// ✅ 正确：使用 composable 提供的方法，会调用 IPC
const onPauseDownload = async (id: string) => {
  const success = await pauseDownload(id)  // 这里会调用 downloadService.pauseDownload()
  if (success) {
    showInfo('已暂停下载')
  }
}
```

**教训**：在修复 bug 时，不仅要确保底层实现正确，还要验证调用链是否正确连接。
