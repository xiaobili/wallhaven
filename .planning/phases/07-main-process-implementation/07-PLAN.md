# Phase 7: Main Process Implementation - Plan

**Created:** 2026-04-26
**Phase Goal:** Implement resume download functionality in main process (Range requests, state persistence, temp file handling)

---

## Wave 1: Foundation - State Persistence Utilities

### Plan 01: State Persistence Utility Functions

```yaml
wave: 1
depends_on: []
files_modified:
  - electron/main/ipc/handlers/download.handler.ts
requirements:
  - INFR-03
  - CORE-02
autonomous: true
```

```xml
<task id="01-state-persistence-utils">
<read_first>
- electron/main/ipc/handlers/download.handler.ts
- src/shared/types/ipc.ts (lines 184-218, 342-373)
- .planning/phases/07-main-process-implementation/07-RESEARCH.md (lines 116-138, 164-232)
</read_first>

<description>
Add state persistence utility functions to download.handler.ts:
1. Extend ActiveDownload interface with totalSize, downloadedSize, lastPersistTime, lastPersistOffset
2. Add getStateFilePath(tempPath: string): string helper
3. Add writeStateFile(statePath: string, state: PendingDownload): void with atomic write
4. Add readStateFile(statePath: string): PendingDownload | null helper
5. Add shouldPersistState(tracker, currentOffset): boolean for throttling (5s OR 10MB)
6. Modify cleanupDownload to accept preserveTempFile parameter (default false)
</description>

<action>
1. Update the import statement at line 11 to include type guards:
   ```typescript
   import { IPC_CHANNELS, type ResumeDownloadParams, type PendingDownload, isResumeDownloadParams, isPendingDownload } from '../../../../src/shared/types/ipc'
   ```

2. Extend ActiveDownload interface at line 26-31:
   - Add: totalSize: number
   - Add: downloadedSize: number
   - Add: lastPersistTime: number
   - Add: lastPersistOffset: number

2. Add helper function after ActiveDownload interface (around line 34):
   ```typescript
   /**
    * Get state file path from temp file path
    */
   function getStateFilePath(tempPath: string): string {
     return tempPath + '.json'
   }
   
   /**
    * Write state file atomically (write to temp, then rename)
    */
   function writeStateFile(statePath: string, state: PendingDownload): void {
     const tempStatePath = statePath + '.tmp'
     fs.writeFileSync(tempStatePath, JSON.stringify(state, null, 2), 'utf-8')
     fs.renameSync(tempStatePath, statePath)
   }
   
   /**
    * Read and parse state file
    */
   function readStateFile(statePath: string): PendingDownload | null {
     try {
       if (!fs.existsSync(statePath)) return null
       const content = fs.readFileSync(statePath, 'utf-8')
       const state = JSON.parse(content)
       return isPendingDownload(state) ? state : null
     } catch {
       return null
     }
   }
   
   /**
    * Check if state should be persisted based on throttling rules
    * Persists every 5 seconds OR every 10MB, whichever comes first
    */
   function shouldPersistState(
     lastPersistTime: number,
     lastPersistOffset: number,
     currentOffset: number
   ): boolean {
     const now = Date.now()
     const timeElapsed = now - lastPersistTime
     const bytesDownloaded = currentOffset - lastPersistOffset
     const MIN_INTERVAL = 5000  // 5 seconds
     const MIN_BYTES = 10 * 1024 * 1024  // 10MB
     
     return timeElapsed >= MIN_INTERVAL || bytesDownloaded >= MIN_BYTES
   }
   ```

3. Modify cleanupDownload function at lines 39-52:
   ```typescript
   /**
    * Clean up download task
    * @param taskId - Task ID
    * @param preserveTempFile - If true (pause), keep temp and state files
    *                           If false (cancel), delete both
    */
   function cleanupDownload(taskId: string, preserveTempFile: boolean = false): void {
     const download = activeDownloads.get(taskId)
     if (!download) return
   
     if (!preserveTempFile) {
       // Cancel: delete temp file
       if (fs.existsSync(download.tempPath)) {
         try {
           fs.unlinkSync(download.tempPath)
         } catch {
           // Ignore cleanup errors
         }
       }
       // Also delete state file
       const statePath = getStateFilePath(download.tempPath)
       if (fs.existsSync(statePath)) {
         try {
           fs.unlinkSync(statePath)
         } catch {
           // Ignore cleanup errors
         }
       }
     }
     // Pause: preserve temp file, state file should already be written
   
     activeDownloads.delete(taskId)
   }
   ```
</action>

<acceptance_criteria>
1. grep -n "isResumeDownloadParams" electron/main/ipc/handlers/download.handler.ts | head -1
2. grep -n "isPendingDownload" electron/main/ipc/handlers/download.handler.ts | head -1
3. grep -n "totalSize: number" electron/main/ipc/handlers/download.handler.ts | head -1
4. grep -n "lastPersistTime: number" electron/main/ipc/handlers/download.handler.ts | head -1
5. grep -n "function getStateFilePath" electron/main/ipc/handlers/download.handler.ts
6. grep -n "function writeStateFile" electron/main/ipc/handlers/download.handler.ts
7. grep -n "function shouldPersistState" electron/main/ipc/handlers/download.handler.ts
8. grep -n "preserveTempFile: boolean" electron/main/ipc/handlers/download.handler.ts
9. TypeScript compiles without errors
</acceptance_criteria>
</task>
```

---

## Wave 2: Handler Implementations

### Plan 02: Modify Pause Handler and Add Progress State Persistence

```yaml
wave: 2
depends_on: [01]
files_modified:
  - electron/main/ipc/handlers/download.handler.ts
requirements:
  - INFR-03
  - CORE-02
autonomous: true
```

```xml
<task id="02-pause-handler-state-persistence">
<read_first>
- electron/main/ipc/handlers/download.handler.ts (full file, focus on lines 303-346 for pause handler)
- src/shared/types/ipc.ts (lines 193-218 for PendingDownload type)
- .planning/phases/07-main-process-implementation/07-RESEARCH.md (lines 208-232 for persistence timing)
</read_first>

<description>
1. Modify START_DOWNLOAD_TASK handler to:
   - Initialize new ActiveDownload fields (totalSize, downloadedSize, lastPersistTime, lastPersistOffset)
   - Add throttled state persistence during download progress (every 5s or 10MB)
   - Delete state file on successful completion
   
2. Modify PAUSE_DOWNLOAD_TASK handler to:
   - Write state file before cleanup
   - Call cleanupDownload with preserveTempFile=true
   - Include wallpaper metadata if available
</description>

<action>
1. In START_DOWNLOAD_TASK handler, modify activeDownloads.set (around line 172-177):
   ```typescript
   // Store active download with persistence tracking
   activeDownloads.set(taskId, {
     abortController,
     tempPath,
     saveDir,
     filename,
     totalSize,
     downloadedSize: 0,
     lastPersistTime: Date.now(),
     lastPersistOffset: 0,
   })
   ```

2. In the response.data.on('data', ...) handler (around lines 196-222), add state persistence:
   ```typescript
   response.data.on('data', (chunk: Buffer) => {
     downloadedSize += chunk.length
   
     // Update ActiveDownload tracking
     const activeDownload = activeDownloads.get(taskId)
     if (activeDownload) {
       activeDownload.downloadedSize = downloadedSize
     }
   
     // Every 100ms update progress to renderer
     const now = Date.now()
     if (now - lastTime >= 100) {
       // ... existing progress code ...
       
       // Check if we should persist state (throttled)
       if (activeDownload && shouldPersistState(
         activeDownload.lastPersistTime,
         activeDownload.lastPersistOffset,
         downloadedSize
       )) {
         const statePath = getStateFilePath(tempPath)
         const state: PendingDownload = {
           taskId,
           url,
           filename,
           saveDir,
           offset: downloadedSize,
           totalSize,
           createdAt: new Date().toISOString(),
           updatedAt: new Date().toISOString(),
         }
         writeStateFile(statePath, state)
         activeDownload.lastPersistTime = Date.now()
         activeDownload.lastPersistOffset = downloadedSize
       }
     }
   })
   ```

3. After successful completion (around line 237), delete state file:
   ```typescript
   // Delete state file on completion
   const statePath = getStateFilePath(tempPath)
   if (fs.existsSync(statePath)) {
     try {
       fs.unlinkSync(statePath)
     } catch {
       // Ignore cleanup errors
     }
   }
   ```

4. Modify PAUSE_DOWNLOAD_TASK handler (lines 303-346):
   ```typescript
   ipcMain.handle(IPC_CHANNELS.PAUSE_DOWNLOAD_TASK, async (_event, taskId: string) => {
     const download = activeDownloads.get(taskId)
     if (!download) {
       return {
         success: false,
         error: 'Download task not found or already completed',
       }
     }
   
     try {
       // Abort download
       download.abortController.abort()
   
       // Get current downloaded size
       let currentSize = download.downloadedSize || 0
       if (fs.existsSync(download.tempPath)) {
         try {
           currentSize = fs.statSync(download.tempPath).size
         } catch {
           // Use tracked value if file read fails
           currentSize = download.downloadedSize || 0
         }
       }
   
       // Write state file before cleanup
       const statePath = getStateFilePath(download.tempPath)
       const state: PendingDownload = {
         taskId,
         url: '',  // URL not stored in ActiveDownload, will be enriched by renderer
         filename: download.filename,
         saveDir: download.saveDir,
         offset: currentSize,
         totalSize: download.totalSize,
         createdAt: new Date().toISOString(),
         updatedAt: new Date().toISOString(),
       }
       writeStateFile(statePath, state)
   
       // Notify renderer of paused state
       const windows = BrowserWindow.getAllWindows()
       if (windows.length > 0) {
         windows[0].webContents.send('download-progress', {
           taskId,
           state: 'paused',
           offset: currentSize,
           totalSize: download.totalSize,
         })
       }
   
       // Cleanup but preserve temp file
       cleanupDownload(taskId, true)
   
       return { success: true }
     } catch (error: any) {
       logHandler('pause-download-task', `Error: ${error.message}`, 'error')
       return { success: false, error: error.message }
     }
   })
   ```

5. Update CANCEL_DOWNLOAD_TASK handler to use cleanupDownload without changes (already calls cleanupDownload(taskId) which defaults to preserveTempFile=false).
</action>

<acceptance_criteria>
1. grep -n "downloadedSize: 0" electron/main/ipc/handlers/download.handler.ts
2. grep -n "shouldPersistState" electron/main/ipc/handlers/download.handler.ts
3. grep -n "writeStateFile(statePath, state)" electron/main/ipc/handlers/download.handler.ts
4. grep -n "cleanupDownload(taskId, true)" electron/main/ipc/handlers/download.handler.ts
5. grep -n "getStateFilePath(tempPath)" electron/main/ipc/handlers/download.handler.ts
6. TypeScript compiles without errors
</acceptance_criteria>
</task>
```

### Plan 03: Implement RESUME_DOWNLOAD_TASK Handler

```yaml
wave: 2
depends_on: [01]
files_modified:
  - electron/main/ipc/handlers/download.handler.ts
requirements:
  - INFR-02
  - CORE-02
autonomous: true
```

```xml
<task id="03-resume-download-handler">
<read_first>
- electron/main/ipc/handlers/download.handler.ts (full file, focus on lines 119-298 for START_DOWNLOAD_TASK pattern)
- src/shared/types/ipc.ts (lines 184-187 for ResumeDownloadParams, 342-354 for isResumeDownloadParams)
- .planning/phases/07-main-process-implementation/07-RESEARCH.md (lines 13-91 for Range request details)
</read_first>

<description>
Replace the placeholder RESUME_DOWNLOAD_TASK handler with full implementation:
1. Validate params with isResumeDownloadParams
2. Check temp file exists
3. Validate temp file size >= offset (D-08)
4. Send Range request with offset
5. Handle 206 (append mode) vs 200 (restart) responses
6. Calculate total size correctly for 206 responses
7. Stream to temp file with append mode
8. Track progress with state persistence
9. Complete: rename temp to final, delete state file
</description>

<action>
Replace the placeholder RESUME_DOWNLOAD_TASK handler (lines 395-407) with:

```typescript
/**
 * 恢复下载任务
 */
ipcMain.handle(
  IPC_CHANNELS.RESUME_DOWNLOAD_TASK,
  async (_event, params: ResumeDownloadParams) => {
    // 1. Validate parameters
    if (!isResumeDownloadParams(params)) {
      return {
        success: false,
        error: {
          code: 'INVALID_PARAMS',
          message: 'Invalid resume parameters',
        },
      }
    }

    const { taskId, url, filename, saveDir, offset } = params
    const tempPath = path.join(saveDir, filename + '.download')
    const statePath = getStateFilePath(tempPath)

    // 2. Check temp file exists
    if (!fs.existsSync(tempPath)) {
      return {
        success: false,
        error: {
          code: 'RESUME_FILE_NOT_FOUND',
          message: 'Temp file not found',
        },
      }
    }

    // 3. Validate temp file size >= offset
    const actualSize = fs.statSync(tempPath).size
    if (actualSize < offset) {
      // D-08: Validation failed, delete and restart
      try {
        fs.unlinkSync(tempPath)
        if (fs.existsSync(statePath)) {
          fs.unlinkSync(statePath)
        }
      } catch {
        // Ignore cleanup errors
      }
      return {
        success: false,
        error: {
          code: 'RESUME_INVALID_OFFSET',
          message: 'Temp file smaller than offset',
        },
      }
    }

    // 4. Create AbortController
    const abortController = new AbortController()

    // 5. Store active download
    activeDownloads.set(taskId, {
      abortController,
      tempPath,
      saveDir,
      filename,
      totalSize: 0,  // Will be updated from response
      downloadedSize: offset,
      lastPersistTime: Date.now(),
      lastPersistOffset: offset,
    })

    try {
      // 6. Send Range request
      const headers: Record<string, string> = {}
      if (offset > 0) {
        headers['Range'] = `bytes=${offset}-`
      }

      const response = await axios({
        method: 'GET',
        url,
        headers,
        responseType: 'stream',
        timeout: 60000,
        signal: abortController.signal,
      })

      // 7. Handle server response status
      let writer: fs.WriteStream
      let effectiveOffset = offset
      let effectiveTotalSize: number
      const download = activeDownloads.get(taskId)!

      if (response.status === 206) {
        // Server supports Range - append mode
        writer = fs.createWriteStream(tempPath, { flags: 'a' })
        const contentLength = parseInt(String(response.headers['content-length'] || '0'), 10)
        effectiveTotalSize = offset + contentLength
        download.totalSize = effectiveTotalSize
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
      } else {
        throw new Error(`Unexpected status code: ${response.status}`)
      }

      // 8. Stream download with progress
      let downloadedSize = effectiveOffset
      let lastTime = Date.now()
      let lastSize = effectiveOffset

      response.data.on('data', (chunk: Buffer) => {
        downloadedSize += chunk.length
        download.downloadedSize = downloadedSize

        // Every 100ms update progress
        const now = Date.now()
        if (now - lastTime >= 100) {
          const speed = (downloadedSize - lastSize) / ((now - lastTime) / 1000)
          const progress = effectiveTotalSize > 0 ? (downloadedSize / effectiveTotalSize) * 100 : 0

          const windows = BrowserWindow.getAllWindows()
          if (windows.length > 0) {
            windows[0].webContents.send('download-progress', {
              taskId,
              progress: Math.min(progress, 99),
              offset: downloadedSize,
              speed,
              state: 'downloading',
              totalSize: effectiveTotalSize,
            })
          }

          // Check throttled state persistence
          if (shouldPersistState(download.lastPersistTime, download.lastPersistOffset, downloadedSize)) {
            const state: PendingDownload = {
              taskId,
              url,
              filename,
              saveDir,
              offset: downloadedSize,
              totalSize: effectiveTotalSize,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }
            writeStateFile(statePath, state)
            download.lastPersistTime = Date.now()
            download.lastPersistOffset = downloadedSize
          }

          lastTime = now
          lastSize = downloadedSize
        }
      })

      // 9. Use pipeline for proper stream handling
      await streamPipeline(response.data, writer)

      // 10. Check for abort
      if (abortController.signal.aborted) {
        return { success: false, error: 'Download paused or cancelled' }
      }

      // 11. Complete: rename temp file, delete state file
      const filePath = path.join(saveDir, filename)
      fs.renameSync(tempPath, filePath)
      if (fs.existsSync(statePath)) {
        try {
          fs.unlinkSync(statePath)
        } catch {
          // Ignore cleanup errors
        }
      }

      const finalSize = fs.statSync(filePath).size
      activeDownloads.delete(taskId)

      // 12. Notify completion
      const windows = BrowserWindow.getAllWindows()
      if (windows.length > 0) {
        windows[0].webContents.send('download-progress', {
          taskId,
          progress: 100,
          offset: finalSize,
          speed: 0,
          state: 'completed',
          filePath,
        })
      }

      return { success: true, filePath, size: finalSize }

    } catch (error: any) {
      // Check if user-initiated cancel
      if (error.name === 'CanceledError' || error.code === 'ERR_CANCELED') {
        logHandler('resume-download-task', `Download cancelled: ${taskId}`, 'info')
        return { success: false, error: 'Download cancelled', cancelled: true }
      }

      logHandler('resume-download-task', `Error: ${error.message}`, 'error')

      // Keep temp file for retry on network errors
      activeDownloads.delete(taskId)

      // Notify renderer of failure
      const windows = BrowserWindow.getAllWindows()
      if (windows.length > 0) {
        windows[0].webContents.send('download-progress', {
          taskId,
          progress: 0,
          offset: 0,
          speed: 0,
          state: 'failed',
          error: error.message || 'Resume failed',
        })
      }

      return {
        success: false,
        error: { code: 'RESUME_FAILED', message: error.message || 'Resume failed' },
      }
    }
  },
)
```
</action>

<acceptance_criteria>
1. grep -n "isResumeDownloadParams(params)" electron/main/ipc/handlers/download.handler.ts
2. grep -n "RESUME_FILE_NOT_FOUND" electron/main/ipc/handlers/download.handler.ts
3. grep -n "Range.*bytes.*offset" electron/main/ipc/handlers/download.handler.ts
4. grep -n "response.status === 206" electron/main/ipc/handlers/download.handler.ts
5. grep -n "flags: 'a'" electron/main/ipc/handlers/download.handler.ts
6. grep -n "effectiveTotalSize = offset + contentLength" electron/main/ipc/handlers/download.handler.ts
7. TypeScript compiles without errors
</acceptance_criteria>
</task>
```

### Plan 04: Implement GET_PENDING_DOWNLOADS Handler

```yaml
wave: 2
depends_on: [01]
files_modified:
  - electron/main/ipc/handlers/download.handler.ts
requirements:
  - CORE-02
autonomous: true
```

```xml
<task id="04-get-pending-downloads-handler">
<read_first>
- electron/main/ipc/handlers/download.handler.ts (focus on lines 413-419 for placeholder)
- src/shared/types/ipc.ts (lines 193-218 for PendingDownload, 359-373 for isPendingDownload)
- .planning/phases/07-main-process-implementation/07-RESEARCH.md (lines 497-560 for handler pseudocode)
</read_first>

<description>
Replace the placeholder GET_PENDING_DOWNLOADS handler with full implementation:
1. Get download directory from electron-store (appSettings.downloadPath)
2. Scan for .download.json files
3. Parse JSON and validate with isPendingDownload
4. Check corresponding .download temp file exists
5. Update offset from actual temp file size
6. Return valid pending downloads list
</description>

<action>
Replace the placeholder GET_PENDING_DOWNLOADS handler (lines 413-419) with:

```typescript
/**
 * 获取待恢复的下载任务列表
 */
ipcMain.handle(IPC_CHANNELS.GET_PENDING_DOWNLOADS, async () => {
  try {
    // 1. Get download directory from settings
    // Note: Import store at top of file if not already imported
    // The store is exported from electron/main/index.ts
    const { store } = await import('../../index')
    const downloadPath = store?.get('appSettings.downloadPath') as string | undefined
    
    if (!downloadPath || !fs.existsSync(downloadPath)) {
      return { success: true, data: [] as PendingDownload[] }
    }

    // 2. Scan for .download.json files
    let files: string[]
    try {
      files = fs.readdirSync(downloadPath)
    } catch {
      return { success: true, data: [] as PendingDownload[] }
    }
    
    const stateFiles = files.filter(f => f.endsWith('.download.json'))
    const pendingDownloads: PendingDownload[] = []

    for (const stateFile of stateFiles) {
      const statePath = path.join(downloadPath, stateFile)
      const tempPath = statePath.replace('.json', '')  // Remove .json to get .download path

      try {
        // 3. Parse JSON and validate
        const state = readStateFile(statePath)
        if (!state) {
          // Invalid state file, delete it
          try {
            fs.unlinkSync(statePath)
          } catch {
            // Ignore cleanup errors
          }
          continue
        }

        // 4. Check corresponding .download file exists
        if (!fs.existsSync(tempPath)) {
          // Temp file missing, delete state file
          try {
            fs.unlinkSync(statePath)
          } catch {
            // Ignore cleanup errors
          }
          continue
        }

        // 5. Update offset from actual temp file size
        const actualSize = fs.statSync(tempPath).size
        state.offset = actualSize
        state.updatedAt = new Date().toISOString()

        pendingDownloads.push(state)

      } catch (parseError) {
        // Corrupted state file, delete it
        try {
          fs.unlinkSync(statePath)
        } catch {
          // Ignore cleanup errors
        }
      }
    }

    return { success: true, data: pendingDownloads }

  } catch (error: any) {
    logHandler('get-pending-downloads', `Error: ${error.message}`, 'error')
    return {
      success: false,
      error: { code: 'SCAN_ERROR', message: error.message },
    }
  }
})
```

Note: The store import path may need adjustment based on how store is exported from electron/main/index.ts. Check the actual export pattern.
</action>

<acceptance_criteria>
1. grep -n "IPC_CHANNELS.GET_PENDING_DOWNLOADS" electron/main/ipc/handlers/download.handler.ts
2. grep -n "downloadPath.*store" electron/main/ipc/handlers/download.handler.ts
3. grep -n ".download.json" electron/main/ipc/handlers/download.handler.ts
4. grep -n "readStateFile(statePath)" electron/main/ipc/handlers/download.handler.ts
5. grep -n "state.offset = actualSize" electron/main/ipc/handlers/download.handler.ts
6. TypeScript compiles without errors
</acceptance_criteria>
</task>
```

---

## Verification Criteria

After all plans complete, verify:

1. **TypeScript Compilation**: `npm run typecheck` passes without errors
2. **State File Structure**: `.download.json` files contain valid `PendingDownload` JSON
3. **Pause Behavior**: Paused download retains `.download` temp file + `.download.json` state file
4. **Cancel Behavior**: Cancelled download removes both `.download` and `.download.json` files
5. **Resume Request**: `Range: bytes={offset}-` header sent on resume
6. **Status Code Handling**: 206 response uses append mode, 200 response restarts from 0
7. **Pending Downloads**: `GET_PENDING_DOWNLOADS` returns list of resumable downloads

---

## Must-Haves (Goal-Backward Verification)

From Phase 7 goal: *Implement resume download functionality in main process*

| Requirement | Verification | Task |
|-------------|--------------|------|
| INFR-02: HTTP Range request support | `grep -n "Range.*bytes" download.handler.ts` shows header being sent | 03 |
| INFR-03: Temp file preserved on pause | `grep -n "cleanupDownload(taskId, true)" download.handler.ts` shows pause uses preserveTempFile=true | 02 |
| CORE-02: Download progress persisted | `grep -n "writeStateFile" download.handler.ts` shows state being written | 01, 02, 03 |

---

## Dependencies Graph

```
Wave 1 (Foundation):
  └── 01-state-persistence-utils

Wave 2 (Handlers) - All depend on Wave 1:
  ├── 02-pause-handler-state-persistence (depends on 01)
  ├── 03-resume-download-handler (depends on 01)
  └── 04-get-pending-downloads-handler (depends on 01)
```

---

*Plan created: 2026-04-26*
*Phase: 07-main-process-implementation*
