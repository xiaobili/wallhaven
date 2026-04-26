# PLAN-02: User Notification for Range Support Issues

---
wave: 2
depends_on:
  - PLAN-01
files_modified:
  - electron/main/ipc/handlers/download.handler.ts
  - src/shared/types/ipc.ts
requirements:
  - ERRH-01
autonomous: true
---

## Goal

Enhance user notification when server doesn't support Range requests. When a resume attempt receives a 200 response instead of 206, notify the user that the download will restart from the beginning.

## Context

From CONTEXT.md decisions:
- D-01: Direct Range request mode (no pre-detection)
- D-02: When server returns 200, delete temp file and restart from 0
- D-09/D-10: Use existing `useAlert` for notifications

Currently, the download restarts silently when server returns 200. Users should be informed.

## Tasks

### Task 1: Add notification flag to progress data

<read_first>
- src/shared/types/ipc.ts
- electron/main/ipc/handlers/download.handler.ts
</read_first>

<action>
Extend `DownloadProgressData` interface in `src/shared/types/ipc.ts` to include a notification field:

```typescript
export interface DownloadProgressData {
  taskId: string
  progress: number
  offset: number
  speed: number
  state: 'downloading' | 'paused' | 'waiting' | 'completed' | 'failed'
  filePath?: string
  error?: string
  totalSize?: number
  /** 服务器不支持断点续传，已重新开始下载 */
  resumeNotSupported?: boolean
}
```

This optional flag indicates that the server didn't support Range and the download restarted.
</action>

<acceptance_criteria>
- `grep -n "resumeNotSupported" src/shared/types/ipc.ts` returns at least 1 match
- Field is documented with Chinese comment
</acceptance_criteria>

---

### Task 2: Send notification when server returns 200

<read_first>
- electron/main/ipc/handlers/download.handler.ts
- src/shared/types/ipc.ts
</read_first>

<action>
Update the resume download handler (around line 623-646) to include `resumeNotSupported: true` when sending the restart notification:

Find this code block:
```typescript
} else if (response.status === 200) {
  // D-02: Server doesn't support Range - restart from 0
  fs.unlinkSync(tempPath)
  writer = fs.createWriteStream(tempPath, { flags: 'w' })
  effectiveOffset = 0
  effectiveTotalSize = parseInt(String(response.headers['content-length'] || '0'), 10)
  download.totalSize = effectiveTotalSize
  download.downloadedSize = 0
  download.lastPersistOffset = 0

  // Notify renderer about restart
  const windows = BrowserWindow.getAllWindows()
  if (windows.length > 0) {
    windows[0].webContents.send('download-progress', {
      taskId,
      state: 'downloading',
      offset: 0,
      progress: 0,
      totalSize: effectiveTotalSize,
    })
  }
}
```

Change it to:
```typescript
} else if (response.status === 200) {
  // D-02: Server doesn't support Range - restart from 0
  fs.unlinkSync(tempPath)
  writer = fs.createWriteStream(tempPath, { flags: 'w' })
  effectiveOffset = 0
  effectiveTotalSize = parseInt(String(response.headers['content-length'] || '0'), 10)
  download.totalSize = effectiveTotalSize
  download.downloadedSize = 0
  download.lastPersistOffset = 0

  // Notify renderer about restart with flag
  const windows = BrowserWindow.getAllWindows()
  if (windows.length > 0) {
    windows[0].webContents.send('download-progress', {
      taskId,
      state: 'downloading',
      offset: 0,
      progress: 0,
      totalSize: effectiveTotalSize,
      resumeNotSupported: true,  // Signal that server doesn't support Range
    })
  }
  
  logHandler('resume-download-task', `Server doesn't support Range, restarting from 0: ${taskId}`, 'info')
}
```
</action>

<acceptance_criteria>
- `grep -n "resumeNotSupported: true" electron/main/ipc/handlers/download.handler.ts` returns at least 1 match
- Log message is added for Range not supported scenario
</acceptance_criteria>

---

### Task 3: Handle notification in useDownload composable

<read_first>
- src/composables/download/useDownload.ts
- src/composables/core/useAlert.ts
</read_first>

<action>
Update the `handleProgress` function in `useDownload.ts` to show a warning when `resumeNotSupported` is true:

Find the `handleProgress` function and update it:

```typescript
const handleProgress = (data: DownloadProgressData): void => {
  const { taskId, progress, offset, speed, state, filePath, error, resumeNotSupported } = data

  // Show notification if server doesn't support Range
  if (resumeNotSupported) {
    const { showWarning } = useAlert()
    showWarning('服务器不支持断点续传，已重新开始下载')
  }

  if (error) {
    const task = store.downloadingList.find((item) => item.id === taskId)
    if (task) {
      task.state = 'failed'
      // 保留 offset，不重置 progress，便于用户恢复下载
    }
    showError(`下载失败: ${error}`)
    return
  }

  // ... rest of the function remains unchanged
}
```

**Important**: Move the `useAlert()` destructuring to the top of the `handleProgress` function or use a cached reference. Since `handleProgress` is called frequently, we should avoid calling `useAlert()` on every progress update. Consider:

Option A: Cache the alert methods at the top of `useDownload`:
```typescript
export function useDownload(): UseDownloadReturn {
  const store = useDownloadStore()
  const { showError, showWarning } = useAlert()  // Cache at top level
```

Then use `showWarning` directly in `handleProgress`.
</action>

<acceptance_criteria>
- `grep -n "resumeNotSupported" src/composables/download/useDownload.ts` returns at least 1 match
- Warning message "服务器不支持断点续传" appears in the code
- `showWarning` is called when `resumeNotSupported` is true
</acceptance_criteria>

---

## Verification

After all tasks complete:

1. Mock a server that doesn't support Range (returns 200 for Range requests)
2. Start a download, pause it, then resume
3. Verify that the warning notification appears: "服务器不支持断点续传，已重新开始下载"
4. Verify download continues from 0% progress

## must_haves

- [ ] `resumeNotSupported` field added to DownloadProgressData
- [ ] Handler sets `resumeNotSupported: true` when receiving 200 response
- [ ] useDownload shows warning when flag is received
- [ ] Chinese warning message displayed to user
