---
status: fixed
trigger: 下载界面，点击暂停下载后，恢复下载按钮没有显示
created: 2026-04-26
updated: 2026-04-26
---

# Debug Session: resume-button-not-showing

## Symptoms

**Expected Behavior:**
点击暂停按钮后，按钮应变为"恢复"按钮

**Actual Behavior:**
暂停按钮完全消失，没有任何按钮替代它

**Error Messages:**
控制台没有错误信息

**Timeline:**
最近修复暂停功能后开始出现此问题

**Reproduction:**
1. 开始下载壁纸
2. 点击暂停按钮
3. 暂停按钮消失，无恢复按钮显示
100% 复现

## Root Cause Analysis

### 问题定位

文件: `src/composables/download/useDownload.ts` (startDownload 函数)

**根本原因:** `startDownload` 函数在 IPC 返回失败时，无差别地将状态设置为 `waiting`

### 代码流程分析

1. 用户在 `OnlineWallpaper.vue` 点击下载
2. `startDownload()` 调用，发送 IPC 到主进程开始下载
3. `startDownload` 是 async 函数，等待 IPC 返回
4. 用户切换到 `DownloadWallpaper.vue`，点击暂停
5. 主进程中止下载，发送 `paused` 事件，然后返回 `{ success: false }`
6. `paused` 事件被处理，`task.state = 'paused'`
7. **问题:** `startDownload` 的 IPC 调用返回失败
8. `startDownload` 执行失败处理代码，将 `task.state = 'waiting'` 覆盖了 `paused` 状态

### 关键代码 (修复前)

```javascript
const startDownload = async (id: string): Promise<boolean> => {
  // ...
  const result = await downloadService.startDownload(id, task.url, task.filename)

  if (!result.success) {
    task.state = 'waiting'  // <-- 无差别覆盖状态!
    showError(result.error?.message || '启动下载失败')
    return false
  }
  // ...
}
```

### 为什么会有多个 useDownload 实例?

- `OnlineWallpaper.vue` 和 `DownloadWallpaper.vue` 都调用了 `useDownload()`
- 每个组件实例都有自己的 `useDownload` composable 实例
- 但它们共享同一个 Pinia store (`downloadStore`)
- `OnlineWallpaper.vue` 中的 `startDownload` async 调用仍在等待 IPC 返回时，用户在 `DownloadWallpaper.vue` 中点击了暂停

## Fix Applied

修改 `src/composables/download/useDownload.ts` 的 `startDownload` 函数，在处理失败时检查任务是否已被暂停:

```diff
  const result = await downloadService.startDownload(id, task.url, task.filename)

  if (!result.success) {
+   // 检查任务是否已被用户暂停 - 如果是，不要覆盖 paused 状态
+   if (task.state === 'paused') {
+     console.log('[useDownload] startDownload failed but task is paused - keeping paused state')
+     return false
+   }
    task.state = 'waiting'
    showError(result.error?.message || '启动下载失败')
    return false
  }
```

## Verification Steps

1. 启动应用
2. 开始下载壁纸
3. 点击暂停按钮
4. 验证暂停按钮变为恢复按钮（播放图标）
5. 点击恢复按钮继续下载

## Files Modified

- `src/composables/download/useDownload.ts` - 修复 startDownload 失败处理逻辑
