# PLAN-01: Orphan Temp File Cleanup

---
wave: 1
depends_on: []
files_modified:
  - electron/main/ipc/handlers/cache.handler.ts
  - src/services/download.service.ts
  - src/clients/electron.client.ts
  - src/composables/download/useDownload.ts
  - src/main.ts
requirements:
  - ERRH-03
autonomous: true
---

## Goal

Implement orphan temp file cleanup on app startup to remove stale `.download` and `.download.json` files older than 7 days. This prevents accumulation of abandoned partial downloads.

## Context

From CONTEXT.md decisions:
- D-06: Cleanup at app startup, before `restorePendingDownloads()`
- D-07: Cleanup files older than 7 days with no valid state file
- D-08: Scan download directory for `.download` files, check corresponding `.download.json`

## Tasks

### Task 1: Add IPC channel for orphan cleanup

<read_first>
- src/shared/types/ipc.ts
- electron/preload/index.ts
</read_first>

<action>
Add new IPC channel `CLEANUP_ORPHAN_FILES` to the shared types:

1. In `src/shared/types/ipc.ts`, add to `IPC_CHANNELS`:
```typescript
CLEANUP_ORPHAN_FILES: 'cleanup-orphan-files',
```

2. Add the response type:
```typescript
export interface CleanupOrphanFilesResponse {
  success: boolean
  filesDeleted: number
  stateFilesDeleted: number
  errors?: string[]
}
```

3. Add the handler registration function type to preload script interface
</action>

<acceptance_criteria>
- `grep -n "CLEANUP_ORPHAN_FILES" src/shared/types/ipc.ts` returns at least 1 match
- `grep -n "CleanupOrphanFilesResponse" src/shared/types/ipc.ts` returns at least 1 match
</acceptance_criteria>

---

### Task 2: Implement orphan cleanup handler in main process

<read_first>
- electron/main/ipc/handlers/cache.handler.ts
- electron/main/ipc/handlers/download.handler.ts (for readStateFile pattern)
- src/shared/types/ipc.ts
</read_first>

<action>
Add `cleanup-orphan-files` handler to `cache.handler.ts`:

1. Import `IPC_CHANNELS` from shared types
2. Add new handler function `cleanupOrphanFiles`:
```typescript
/**
 * 清理孤儿临时文件
 * 删除超过 7 天的 .download 和 .download.json 文件
 */
ipcMain.handle(IPC_CHANNELS.CLEANUP_ORPHAN_FILES, async (_event, downloadPath: string) => {
  // Constants
  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000
  const now = Date.now()
  
  const results = {
    filesDeleted: 0,
    stateFilesDeleted: 0,
    errors: [] as string[],
  }
  
  // Validation: download path exists
  if (!downloadPath || !fs.existsSync(downloadPath)) {
    return { success: true, ...results }
  }
  
  // Scan for .download files
  const files = fs.readdirSync(downloadPath)
  const downloadFiles = files.filter(f => f.endsWith('.download'))
  
  for (const downloadFile of downloadFiles) {
    const tempPath = path.join(downloadPath, downloadFile)
    const statePath = tempPath + '.json'
    
    try {
      const stat = fs.statSync(tempPath)
      const fileAge = now - stat.mtimeMs
      
      // Check if state file exists
      const stateExists = fs.existsSync(statePath)
      let shouldDelete = false
      
      if (stateExists) {
        // Parse state file to check updatedAt
        const content = fs.readFileSync(statePath, 'utf-8')
        const state = JSON.parse(content)
        const updatedAt = new Date(state.updatedAt).getTime()
        const stateAge = now - updatedAt
        
        if (stateAge > SEVEN_DAYS_MS) {
          shouldDelete = true
        }
      } else {
        // No state file, check temp file age
        if (fileAge > SEVEN_DAYS_MS) {
          shouldDelete = true
        }
      }
      
      if (shouldDelete) {
        // Delete temp file
        fs.unlinkSync(tempPath)
        results.filesDeleted++
        logHandler('cleanup-orphan-files', `Deleted orphan temp file: ${downloadFile}`)
        
        // Delete state file if exists
        if (stateExists) {
          fs.unlinkSync(statePath)
          results.stateFilesDeleted++
        }
      }
    } catch (error: any) {
      results.errors.push(`Error processing ${downloadFile}: ${error.message}`)
    }
  }
  
  return { success: true, ...results }
})
```

3. Export the handler registration (if needed) or ensure it's called within `registerCacheHandlers`
</action>

<acceptance_criteria>
- `grep -n "CLEANUP_ORPHAN_FILES" electron/main/ipc/handlers/cache.handler.ts` returns at least 1 match
- `grep -n "SEVEN_DAYS_MS" electron/main/ipc/handlers/cache.handler.ts` returns at least 1 match
- Handler checks file age against 7-day threshold
</acceptance_criteria>

---

### Task 3: Add preload bridge for cleanup method

<read_first>
- electron/preload/index.ts
- src/shared/types/ipc.ts
</read_first>

<action>
Add the `cleanupOrphanFiles` method to the preload exposed API:

1. In the `electronAPI` object exposed via `contextBridge.exposeInMainWorld`, add:
```typescript
cleanupOrphanFiles: (downloadPath: string) => 
  ipcRenderer.invoke(IPC_CHANNELS.CLEANUP_ORPHAN_FILES, downloadPath),
```

2. Ensure the type definition in the exposed API interface matches
</action>

<acceptance_criteria>
- `grep -n "cleanupOrphanFiles" electron/preload/index.ts` returns at least 1 match
</acceptance_criteria>

---

### Task 4: Add electronClient method

<read_first>
- src/clients/electron.client.ts
- src/shared/types/ipc.ts
</read_first>

<action>
Add `cleanupOrphanFiles` method to `ElectronClientImpl` class:

```typescript
/**
 * 清理孤儿临时文件
 */
async cleanupOrphanFiles(downloadPath: string): Promise<IpcResponse<{ filesDeleted: number; stateFilesDeleted: number }>> {
  if (!this.isAvailable()) {
    return this.createUnavailableResponse<{ filesDeleted: number; stateFilesDeleted: number }>()
  }

  try {
    const result = await window.electronAPI.cleanupOrphanFiles(downloadPath)
    if (result.success) {
      return {
        success: true,
        data: {
          filesDeleted: result.filesDeleted,
          stateFilesDeleted: result.stateFilesDeleted,
        },
      }
    }
    return {
      success: false,
      error: { code: 'CLEANUP_ERROR', message: result.errors?.join('; ') || 'Cleanup failed' },
    }
  } catch (error) {
    return {
      success: false,
      error: { code: 'CLEANUP_ERROR', message: String(error) },
    }
  }
}
```
</action>

<acceptance_criteria>
- `grep -n "cleanupOrphanFiles" src/clients/electron.client.ts` returns at least 1 match
</acceptance_criteria>

---

### Task 5: Add DownloadService method

<read_first>
- src/services/download.service.ts
- src/clients/electron.client.ts
</read_first>

<action>
Add `cleanupOrphanFiles` method to `DownloadServiceImpl` class:

```typescript
/**
 * 清理孤儿临时文件
 * 删除超过 7 天的临时文件和状态文件
 */
async cleanupOrphanFiles(): Promise<IpcResponse<{ filesDeleted: number; stateFilesDeleted: number }>> {
  // 获取下载目录
  const pathResult = await this.getDownloadPath()
  
  if (!pathResult.success || !pathResult.data) {
    // No download path configured, nothing to clean
    return { success: true, data: { filesDeleted: 0, stateFilesDeleted: 0 } }
  }
  
  return electronClient.cleanupOrphanFiles(pathResult.data)
}
```
</action>

<acceptance_criteria>
- `grep -n "cleanupOrphanFiles" src/services/download.service.ts` returns at least 1 match
</acceptance_criteria>

---

### Task 6: Integrate cleanup into app initialization

<read_first>
- src/main.ts
- src/composables/download/useDownload.ts
</read_first>

<action>
Update `initializeApp()` in `src/main.ts` to call cleanup before restoring pending downloads:

```typescript
async function initializeApp() {
  const { useSettings, useDownload } = await import('./composables')

  await useSettings().load()
  await useDownload().loadHistory()
  
  // Cleanup orphan temp files before restoring pending downloads
  await useDownload().cleanupOrphanFiles()
  
  // Then restore pending downloads
  await useDownload().restorePendingDownloads()
  
  console.log('[Main] 应用初始化完成，已从 electron-store 加载数据，并恢复待处理下载任务')
}
```

Add `cleanupOrphanFiles` method to `useDownload` composable return interface and implementation:
```typescript
/**
 * 清理孤儿临时文件
 */
const cleanupOrphanFiles = async (): Promise<void> => {
  const result = await downloadService.cleanupOrphanFiles()
  if (result.success && result.data) {
    const { filesDeleted, stateFilesDeleted } = result.data
    if (filesDeleted > 0 || stateFilesDeleted > 0) {
      console.log(`[useDownload] 已清理孤儿文件: ${filesDeleted} 个临时文件, ${stateFilesDeleted} 个状态文件`)
    }
  }
}
```

Update `UseDownloadReturn` interface to include `cleanupOrphanFiles: () => Promise<void>`
</action>

<acceptance_criteria>
- `grep -n "cleanupOrphanFiles" src/main.ts` returns at least 1 match
- `grep -n "cleanupOrphanFiles" src/composables/download/useDownload.ts` returns at least 2 matches (interface + implementation)
- Cleanup is called BEFORE `restorePendingDownloads` in initializeApp
</acceptance_criteria>

---

## Verification

After all tasks complete:

1. Build and run the application
2. Create some test `.download` files in the download directory with old timestamps:
   ```bash
   touch -t 202001010000 test.download
   touch -t 202001010000 test.download.json
   echo '{"taskId":"test","url":"","filename":"","saveDir":"","offset":0,"totalSize":0,"createdAt":"2020-01-01T00:00:00Z","updatedAt":"2020-01-01T00:00:00Z"}' > test.download.json
   ```
3. Restart the app - files should be cleaned up
4. Check console for cleanup log messages

## must_haves

- [ ] New IPC channel `CLEANUP_ORPHAN_FILES` defined in shared types
- [ ] Handler in main process deletes files older than 7 days
- [ ] ElectronClient method wraps IPC call
- [ ] DownloadService method exposes cleanup functionality
- [ ] useDownload composable has cleanupOrphanFiles method
- [ ] App initialization calls cleanup before restorePendingDownloads
