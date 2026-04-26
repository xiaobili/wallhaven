# Phase 7: Main Process Implementation - Research

**Gathered:** 2026-04-26
**Purpose:** Implementation details for planning Phase 7 (Main Process Implementation)

---

## 1. HTTP Range Request Implementation

### 1.1 Axios Configuration for Range Requests

**Basic Range Request Pattern:**
```typescript
// From .planning/research/STACK.md:254-268
const response = await axios({
  method: 'GET',
  url: task.url,
  headers: { Range: `bytes=${startPosition}-` },
  responseType: 'stream'
})
```

**Integration with existing code (download.handler.ts:180-186):**
```typescript
// Current implementation
const response = await axios({
  method: 'GET',
  url,
  responseType: 'stream',
  timeout: 60000,
  signal: abortController.signal,
})

// Modified for Range support
const headers: Record<string, string> = {}
if (offset > 0) {
  headers['Range'] = `bytes=${offset}-`
}

const response = await axios({
  method: 'GET',
  url,
  headers,  // Added
  responseType: 'stream',
  timeout: 60000,
  signal: abortController.signal,
})
```

### 1.2 HTTP Status Code Handling

| Status Code | Meaning | Action |
|-------------|---------|--------|
| **206 Partial Content** | Server supports Range, returning partial content | Continue with append mode |
| **200 OK** | Server ignored Range header, returning full content | Delete temp file, restart from 0 |
| **416 Range Not Satisfiable** | Invalid range (offset > file size) | Delete temp file, restart from 0 |
| **Other 4xx/5xx** | Server error | Return error, keep temp file for retry |

**Detection pattern:**
```typescript
// Server supports Range: status 206
if (response.status === 206) {
  // Continue with resume - append to existing file
  const writer = fs.createWriteStream(tempPath, { flags: 'a' })
}

// Server ignored Range: status 200
if (response.status === 200) {
  // Server doesn't support Range or file changed
  // Option A: Delete temp file and restart (D-02 decision)
  // Option B: Notify renderer for user decision (deferred)
  fs.unlinkSync(tempPath)
  const writer = fs.createWriteStream(tempPath, { flags: 'w' })
  // Reset offset to 0 in progress notifications
}
```

### 1.3 Content-Length Handling for Resume

**Critical distinction:**
- On 206 response: `Content-Length` = remaining bytes (NOT total file size)
- Need to calculate actual total: `offset + contentLength`

```typescript
const totalSize = parseInt(String(response.headers['content-length'] || '0'), 10)
const actualTotalSize = offset > 0 && response.status === 206
  ? offset + totalSize  // Range response: Content-Length is remaining
  : totalSize           // Full response: Content-Length is total
```

---

## 2. Node.js File System Operations

### 2.1 Append Mode Write Stream

**Two options for resume writing:**

**Option A: Append mode (`flags: 'a'`)**
```typescript
const writer = fs.createWriteStream(tempPath, { flags: 'a' })
```
- Appends to end of existing file
- Simpler, recommended by D-09

**Option B: Random access mode (`flags: 'r+'`, with `start`)**
```typescript
const writer = fs.createWriteStream(tempPath, {
  start: startPosition,
  flags: 'r+'
})
```
- More precise control over write position
- From .planning/research/STACK.md:262-265

**Recommendation:** Use Option A (`flags: 'a'`) per D-09 decision.

### 2.2 Atomic File Write Pattern

**D-05 Decision:** Use atomic write for state files.

```typescript
function writeStateFile(statePath: string, state: PendingDownload): void {
  const tempStatePath = statePath + '.tmp'

  // Step 1: Write to temporary file
  fs.writeFileSync(tempStatePath, JSON.stringify(state, null, 2), 'utf-8')

  // Step 2: Atomic rename (atomic on same filesystem)
  fs.renameSync(tempStatePath, statePath)
}
```

**Why atomic write:**
- Prevents corrupted state file if app crashes during write
- `renameSync` is atomic on POSIX systems (macOS, Linux)
- On Windows, rename is also atomic for same-volume operations

### 2.3 File Size Validation

**D-08 Decision:** Validate temp file size >= offset before resume.

```typescript
function validateTempFile(tempPath: string, expectedOffset: number): boolean {
  if (!fs.existsSync(tempPath)) {
    return false
  }

  const actualSize = fs.statSync(tempPath).size

  // Allow small tolerance (e.g., 1KB) for partial writes
  // Exact match is ideal, but >= expected is acceptable
  return actualSize >= expectedOffset
}
```

**Tolerance consideration:**
- Network chunks may not align perfectly with offset
- Allow tolerance of ~4KB (typical chunk size)
- If actualSize < expectedOffset, delete and restart

---

## 3. State File Implementation

### 3.1 State File Structure

**D-04 Decision:** Use `PendingDownload` type, JSON format.

From `src/shared/types/ipc.ts:193-218`:
```typescript
interface PendingDownload {
  taskId: string
  url: string
  filename: string
  saveDir: string
  offset: number
  totalSize: number
  wallpaperId?: string
  small?: string
  resolution?: string
  size?: number
  createdAt: string    // ISO timestamp
  updatedAt: string    // ISO timestamp
}
```

### 3.2 State File Naming Convention

**D-04 Decision:** `{filename}.download.json` in same directory as temp file.

```typescript
// Temp file: /path/to/wallhaven-abc123.jpg.download
// State file: /path/to/wallhaven-abc123.jpg.download.json

function getStateFilePath(tempPath: string): string {
  return tempPath + '.json'
}

function getTempFilePath(saveDir: string, filename: string): string {
  return path.join(saveDir, filename + '.download')
}
```

### 3.3 State Persistence Timing (D-03)

| Event | Action |
|-------|--------|
| **Pause** | Write complete state immediately |
| **Progress** | Every 5 seconds OR every 10MB (whichever comes first) |
| **Complete** | Delete state file |
| **Fail** | Keep state file for recovery |

**Throttled state persistence implementation:**
```typescript
interface StatePersistenceTracker {
  lastPersistTime: number
  lastPersistOffset: number
  minInterval: number    // 5000ms
  minBytes: number       // 10 * 1024 * 1024 (10MB)
}

function shouldPersistState(tracker: StatePersistenceTracker, currentOffset: number): boolean {
  const now = Date.now()
  const timeElapsed = now - tracker.lastPersistTime
  const bytesDownloaded = currentOffset - tracker.lastPersistOffset

  return timeElapsed >= tracker.minInterval || bytesDownloaded >= tracker.minBytes
}
```

---

## 4. Handler Implementation Patterns

### 4.1 Existing Pattern Reuse

From `download.handler.ts`, existing patterns to reuse:

1. **AbortController pattern** (lines 169, 185):
```typescript
const abortController = new AbortController()
// ... store in activeDownloads
signal: abortController.signal
```

2. **Progress notification pattern** (lines 196-222):
```typescript
response.data.on('data', (chunk: Buffer) => {
  downloadedSize += chunk.length
  // ... throttle to 100ms
  windows[0].webContents.send('download-progress', progressData)
})
```

3. **Stream pipeline pattern** (line 225):
```typescript
await streamPipeline(response.data, writer)
```

4. **Error handling pattern** (lines 263-296):
```typescript
catch (error: any) {
  if (error.name === 'CanceledError' || error.code === 'ERR_CANCELED') {
    // User-initiated cancellation
    return { success: false, error: 'Download cancelled', cancelled: true }
  }
  // ... cleanup and notify renderer
}
```

### 4.2 Modified ActiveDownload Interface

**Current interface** (lines 26-31):
```typescript
interface ActiveDownload {
  abortController: AbortController
  tempPath: string
  saveDir: string
  filename: string
}
```

**Extended for resume support:**
```typescript
interface ActiveDownload {
  abortController: AbortController
  tempPath: string
  saveDir: string
  filename: string
  totalSize: number       // Added: track total size
  downloadedSize: number  // Added: track progress for state persistence
  lastPersistTime: number // Added: for throttled persistence
  lastPersistOffset: number // Added: for throttled persistence
}
```

### 4.3 Cleanup Function Modification

**Current cleanup** (lines 39-52) - deletes temp file always:
```typescript
function cleanupDownload(taskId: string): void {
  const download = activeDownloads.get(taskId)
  if (download) {
    if (fs.existsSync(download.tempPath)) {
      try {
        fs.unlinkSync(download.tempPath)
      } catch {
        // Ignore cleanup errors
      }
    }
    activeDownloads.delete(taskId)
  }
}
```

**D-06, D-07 Decision:** Distinguish pause vs cancel:
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
    // Cancel: delete temp file and state file
    if (fs.existsSync(download.tempPath)) {
      try {
        fs.unlinkSync(download.tempPath)
      } catch {
        // Ignore cleanup errors
      }
    }
    // Also delete state file
    const statePath = download.tempPath + '.json'
    if (fs.existsSync(statePath)) {
      try {
        fs.unlinkSync(statePath)
      } catch {
        // Ignore cleanup errors
      }
    }
  }
  // Pause: preserve temp file, state file already written

  activeDownloads.delete(taskId)
}
```

---

## 5. RESUME_DOWNLOAD_TASK Handler Implementation

### 5.1 Handler Pseudocode (D-09)

```typescript
ipcMain.handle(
  IPC_CHANNELS.RESUME_DOWNLOAD_TASK,
  async (_event, params: ResumeDownloadParams) => {
    // 1. Validate parameters
    if (!isResumeDownloadParams(params)) {
      return {
        success: false,
        error: { code: 'INVALID_PARAMS', message: 'Invalid resume parameters' }
      }
    }

    const { taskId, url, filename, saveDir, offset } = params
    const tempPath = path.join(saveDir, filename + '.download')
    const statePath = tempPath + '.json'

    // 2. Check temp file exists
    if (!fs.existsSync(tempPath)) {
      return {
        success: false,
        error: { code: 'RESUME_FILE_NOT_FOUND', message: 'Temp file not found' }
      }
    }

    // 3. Validate temp file size
    const actualSize = fs.statSync(tempPath).size
    if (actualSize < offset) {
      // D-08: Validation failed, restart from 0
      fs.unlinkSync(tempPath)
      return {
        success: false,
        error: { code: 'RESUME_INVALID_OFFSET', message: 'Temp file smaller than offset' }
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
      totalSize: 0,      // Will be updated from response
      downloadedSize: offset,
      lastPersistTime: Date.now(),
      lastPersistOffset: offset,
    })

    // 6. Send Range request
    try {
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

      if (response.status === 206) {
        // Server supports Range - append mode
        writer = fs.createWriteStream(tempPath, { flags: 'a' })
        const contentLength = parseInt(String(response.headers['content-length'] || '0'), 10)
        effectiveTotalSize = offset + contentLength
      } else if (response.status === 200) {
        // D-02: Server doesn't support Range - restart from 0
        fs.unlinkSync(tempPath)
        writer = fs.createWriteStream(tempPath, { flags: 'w' })
        effectiveOffset = 0
        effectiveTotalSize = parseInt(String(response.headers['content-length'] || '0'), 10)

        // Notify renderer about restart
        const windows = BrowserWindow.getAllWindows()
        if (windows.length > 0) {
          windows[0].webContents.send('download-progress', {
            taskId,
            state: 'downloading',
            offset: 0,
            progress: 0,
            note: 'Server does not support resume, restarting download'
          })
        }
      } else {
        throw new Error(`Unexpected status code: ${response.status}`)
      }

      // 8. Stream download with progress
      let downloadedSize = effectiveOffset

      response.data.on('data', (chunk: Buffer) => {
        downloadedSize += chunk.length
        // ... progress update (reuse existing pattern)
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
        fs.unlinkSync(statePath)
      }

      // 12. Notify completion
      // ... (reuse existing pattern)

      return { success: true, filePath }

    } catch (error: any) {
      // Error handling (reuse existing pattern)
      // Keep temp file for retry on network errors
      // ...
    }
  }
)
```

---

## 6. GET_PENDING_DOWNLOADS Handler Implementation

### 6.1 Handler Pseudocode (D-10)

```typescript
ipcMain.handle(IPC_CHANNELS.GET_PENDING_DOWNLOADS, async () => {
  try {
    // 1. Get download directory from settings
    // Option A: From electron-store
    const downloadPath = store.get('appSettings.downloadPath') as string
    if (!downloadPath || !fs.existsSync(downloadPath)) {
      return { success: true, data: [] }
    }

    // 2. Scan for .download.json files
    const files = fs.readdirSync(downloadPath)
    const stateFiles = files.filter(f => f.endsWith('.download.json'))

    const pendingDownloads: PendingDownload[] = []

    for (const stateFile of stateFiles) {
      const statePath = path.join(downloadPath, stateFile)
      const tempPath = statePath.replace('.json', '')  // Remove .json to get .download path

      try {
        // 3. Parse JSON and validate
        const content = fs.readFileSync(statePath, 'utf-8')
        const state = JSON.parse(content) as PendingDownload

        // 4. Validate structure
        if (!isPendingDownload(state)) {
          // Invalid state file, delete it
          fs.unlinkSync(statePath)
          continue
        }

        // 5. Check corresponding .download file exists
        if (!fs.existsSync(tempPath)) {
          // Temp file missing, delete state file
          fs.unlinkSync(statePath)
          continue
        }

        // 6. Update offset from actual temp file size
        const actualSize = fs.statSync(tempPath).size
        state.offset = actualSize

        pendingDownloads.push(state)

      } catch (parseError) {
        // Corrupted state file, delete it
        fs.unlinkSync(statePath)
      }
    }

    return { success: true, data: pendingDownloads }

  } catch (error: any) {
    return {
      success: false,
      error: { code: 'SCAN_ERROR', message: error.message }
    }
  }
})
```

---

## 7. Error Codes Reference

### 7.1 Defined Error Codes (D-11)

| Code | Message | Scenario |
|------|---------|----------|
| `INVALID_PARAMS` | Invalid resume parameters | isResumeDownloadParams check failed |
| `RESUME_FILE_NOT_FOUND` | Temp file not found | `.download` file doesn't exist |
| `RESUME_STATE_CORRUPTED` | State file corrupted | JSON parse failed |
| `RESUME_SERVER_UNSUPPORTED` | Server does not support Range requests | Server returns 200 instead of 206 |
| `RESUME_INVALID_OFFSET` | Offset exceeds file size | actualSize < expected offset |
| `DOWNLOAD_CANCELLED` | Download was cancelled | AbortController.abort() called |

### 7.2 Error Response Structure

From `src/shared/types/ipc.ts:71-75`:
```typescript
interface IpcErrorInfo {
  code: string
  message: string
}

// Response format
interface IpcResponse<T> {
  success: boolean
  data?: T
  error?: IpcErrorInfo
}
```

---

## 8. Integration Points

### 8.1 Files to Modify

| File | Changes |
|------|---------|
| `electron/main/ipc/handlers/download.handler.ts` | Implement RESUME_DOWNLOAD_TASK, GET_PENDING_DOWNLOADS, modify cleanupDownload |
| `electron/main/ipc/handlers/base.ts` | No changes needed (already exports streamPipeline, logHandler) |

### 8.2 Files Already Complete (Phase 6)

| File | Status |
|------|--------|
| `src/shared/types/ipc.ts` | ✅ ResumeDownloadParams, PendingDownload, type guards defined |
| `electron/preload/index.ts` | ✅ resumeDownloadTask, getPendingDownloads exposed |
| `electron/preload/types.ts` | ✅ IPC_CHANNELS constants defined |
| `src/clients/electron.client.ts` | ✅ resumeDownloadTask, getPendingDownloads methods defined |

### 8.3 Dependencies

```typescript
// Already imported in download.handler.ts
import { ipcMain, BrowserWindow } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import axios from 'axios'
import { streamPipeline, logHandler } from './base'
import { IPC_CHANNELS, type ResumeDownloadParams, type PendingDownload } from '../../../../src/shared/types/ipc'
```

---

## 9. Testing Considerations

### 9.1 Manual Testing Checklist

- [ ] Test Range request with wallhaven.cc CDN (verify 206 response)
- [ ] Test resume with server that returns 200 (fallback behavior)
- [ ] Test state file atomic write (kill app during write)
- [ ] Test temp file validation with truncated file
- [ ] Test GET_PENDING_DOWNLOADS with various state files

### 9.2 Edge Cases

1. **Server returns 206 but with different file** (file changed)
   - Detection: Content-Length mismatch with state.totalSize
   - Action: Consider adding ETag/Last-Modified validation (Phase 9)

2. **Network timeout during resume**
   - Keep temp file, return error, allow retry

3. **Disk full during write**
   - Return error, keep temp file for user to free space

4. **Concurrent resume of same task**
   - Check activeDownloads before starting new resume

---

## 10. Code Organization Suggestions

### 10.1 New Helper Functions

```typescript
// State file operations
function getStateFilePath(tempPath: string): string
function writeStateFile(statePath: string, state: PendingDownload): void
function readStateFile(statePath: string): PendingDownload | null
function deleteStateFile(tempPath: string): void

// Validation
function validateTempFile(tempPath: string, expectedOffset: number): boolean

// State persistence tracking
function shouldPersistState(tracker: StateTracker, currentOffset: number): boolean
function updatePersistenceTracker(tracker: StateTracker, newOffset: number): void
```

### 10.2 Modified ActiveDownload Interface

```typescript
interface ActiveDownload {
  abortController: AbortController
  tempPath: string
  saveDir: string
  filename: string
  // Added for resume support
  totalSize: number
  downloadedSize: number
  lastPersistTime: number
  lastPersistOffset: number
}
```

---

## 11. Summary: What Planner Needs to Know

### Critical Implementation Details

1. **Range Request Header**: `Range: bytes=${offset}-` (note: no end value, just start)

2. **Status Code 206 vs 200**: 206 = partial content (append mode), 200 = full content (restart)

3. **Content-Length on 206**: Returns remaining bytes, NOT total. Calculate: `offset + contentLength`

4. **Append Mode**: `fs.createWriteStream(tempPath, { flags: 'a' })`

5. **Atomic Write**: Write to `.tmp` file, then `fs.renameSync(tmpPath, finalPath)`

6. **State File Location**: Same directory as temp file, `{filename}.download.json`

7. **Throttled Persistence**: Every 5 seconds OR 10MB, whichever comes first

8. **Cleanup Distinction**: Pause preserves files, Cancel deletes files

9. **Validation Before Resume**: Check temp file exists AND size >= offset

10. **Error Propagation**: Use IpcErrorInfo with code and message

### Key Decisions from CONTEXT.md

- D-01: Direct Range request without pre-check
- D-02: On Range failure, delete temp and restart
- D-03: Persist on pause + every 5s/10MB
- D-04: State file = PendingDownload JSON
- D-05: Atomic write for state files
- D-06: Pause preserves .download file
- D-07: Cancel deletes temp + state files
- D-08: Validate temp file size >= offset
- D-09/10: Handler pseudocode defined

---

*Research completed: 2026-04-26*
