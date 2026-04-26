---
status: issues_found
phase: "09"
files_reviewed: 9
critical: 0
warning: 4
info: 5
total: 9
---

# Phase 9 Code Review: Error Handling & Edge Cases

## Summary

Phase 9 added error handling improvements for download functionality:
1. Orphan temp file cleanup on app startup (files >7 days old)
2. Range support notification when server doesn't support resume
3. Enhanced state file error handling with Chinese messages

Overall, the implementation is solid with good error handling patterns. A few minor issues were found that should be addressed.

---

## Files Reviewed

| File | Status |
|------|--------|
| `electron/preload/index.ts` | ✅ Clean |
| `env.d.ts` | ⚠️ Warning |
| `src/main.ts` | ✅ Clean |
| `src/composables/download/useDownload.ts` | ✅ Clean |
| `src/services/download.service.ts` | ✅ Clean |
| `src/clients/electron.client.ts` | ✅ Clean |
| `src/shared/types/ipc.ts` | ✅ Clean |
| `electron/main/ipc/handlers/download.handler.ts` | ⚠️ Warning |
| `electron/main/ipc/handlers/cache.handler.ts` | ⚠️ Warning |

---

## Issues Found

### Warning (4)

#### W1: Type Duplication Between `env.d.ts` and `src/shared/types/ipc.ts`

**Location:** `env.d.ts:3-48`

**Description:** The `DownloadProgressData`, `ResumeDownloadParams`, `PendingDownload`, and `IpcResponse` types are defined in both `env.d.ts` and `src/shared/types/ipc.ts`. This creates potential for type drift and maintenance burden.

**Code:**
```typescript
// env.d.ts (duplicate)
interface DownloadProgressData {
  taskId: string
  progress: number
  // ...
}

// src/shared/types/ipc.ts (canonical)
export interface DownloadProgressData {
  taskId: string
  progress: number
  // ...
}
```

**Recommendation:** Remove duplicate types from `env.d.ts` and import from `@/shared/types/ipc`. Since `env.d.ts` is a global declaration file, consider using triple-slash references or re-exporting types.

---

#### W2: Inconsistent `resumeNotSupported` Field in Type Definitions

**Location:** `env.d.ts:9-13` vs `src/shared/types/ipc.ts:172-183`

**Description:** The `resumeNotSupported` field added in Phase 9 is present in `src/shared/types/ipc.ts` but missing from the duplicate type definition in `env.d.ts`. This is a concrete example of the type drift mentioned in W1.

**Code (env.d.ts - missing field):**
```typescript
interface DownloadProgressData {
  taskId: string
  progress: number
  offset: number
  speed: number
  state: 'downloading' | 'paused' | 'waiting' | 'completed'
  filePath?: string
  totalSize?: number
  error?: string
  // Missing: resumeNotSupported?: boolean
}
```

**Code (ipc.ts - has the field):**
```typescript
export interface DownloadProgressData {
  // ...
  /** 服务器不支持断点续传，已重新开始下载 */
  resumeNotSupported?: boolean
}
```

**Recommendation:** Same as W1 - consolidate type definitions.

---

#### W3: Potential Race Condition in Temp File Deletion During Resume

**Location:** `electron/main/ipc/handlers/download.handler.ts:594-609`

**Description:** When resuming a download with an invalid offset, the temp file and state file are deleted synchronously but without checking if another operation might be in progress on the same files.

**Code:**
```typescript
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
    error: RESUME_ERRORS.INVALID_OFFSET,
  }
}
```

**Recommendation:** This is a low-risk issue in practice since tasks are identified by unique IDs and the cleanup is synchronous. No immediate change needed, but consider adding a file lock mechanism if concurrent access becomes a concern.

---

#### W4: Missing Error Handling for `fs.statSync` in Cache Handler

**Location:** `electron/main/ipc/handlers/cache.handler.ts:176-178`

**Description:** When processing orphan files, `fs.statSync` is called without a try-catch block. If the file is deleted between `fs.readdirSync` and `fs.statSync`, the operation will throw an error that's caught by the outer try-catch but may result in incomplete cleanup.

**Code:**
```typescript
for (const downloadFile of downloadFiles) {
  const tempPath = path.join(downloadPath, downloadFile)
  const statePath = tempPath + '.json'

  try {
    const stat = fs.statSync(tempPath)  // Could throw if file deleted
    const fileAge = now - stat.mtimeMs
    // ...
  } catch (error: any) {
    results.errors.push(`Error processing ${downloadFile}: ${error.message}`)
  }
}
```

**Recommendation:** The current implementation is acceptable since errors are caught and logged. The file will be processed in the next cleanup cycle. Consider using `fs.stat` (async) for better performance with large directories.

---

### Info (5)

#### I1: Chinese Error Messages in Constants Object

**Location:** `electron/main/ipc/handlers/download.handler.ts:57-74`

**Description:** The `RESUME_ERRORS` constant object provides Chinese error messages for resume failures. This is a good pattern for user-facing messages.

**Code:**
```typescript
const RESUME_ERRORS = {
  FILE_NOT_FOUND: {
    code: 'RESUME_FILE_NOT_FOUND',
    message: '临时文件不存在，无法恢复下载',
  },
  INVALID_OFFSET: {
    code: 'RESUME_INVALID_OFFSET',
    message: '临时文件已损坏，已自动清理',
  },
  // ...
} as const
```

**Note:** Consider moving these to a shared error constants file for consistency with the existing error handling architecture.

---

#### I2: Good Pattern - Atomic State File Writes

**Location:** `electron/main/ipc/handlers/download.handler.ts:79-83`

**Description:** The implementation uses atomic write pattern (write to temp file, then rename) for state files, which prevents corruption from partial writes.

**Code:**
```typescript
function writeStateFile(statePath: string, state: PendingDownload): void {
  const tempStatePath = statePath + '.tmp'
  fs.writeFileSync(tempStatePath, JSON.stringify(state, null, 2), 'utf-8')
  fs.renameSync(tempStatePath, statePath)
}
```

**Note:** This is a well-implemented pattern.

---

#### I3: Good Pattern - Throttled State Persistence

**Location:** `electron/main/ipc/handlers/download.handler.ts:111-123`

**Description:** State is persisted based on time (5 seconds) or data size (10MB), whichever comes first. This balances reliability with performance.

**Code:**
```typescript
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

**Note:** Good balance of performance and data safety.

---

#### I4: Consistent Error Handling Pattern

**Location:** `src/composables/download/useDownload.ts:248-285`

**Description:** The `resumeDownload` function properly handles all error cases with specific error codes and user-friendly Chinese messages.

**Code:**
```typescript
switch (errorCode) {
  case 'RESUME_FILE_NOT_FOUND':
    showError(errorMessage || '临时文件不存在')
    // Remove from list
    break
  case 'RESUME_INVALID_OFFSET':
    showWarning(errorMessage || '临时文件已损坏，请重新下载')
    // Remove from list
    break
  case 'RESUME_STATE_CORRUPTED':
    showError(errorMessage || '下载记录已损坏')
    // Remove from list
    break
  default:
    // Keep paused state for retry
    task.state = 'paused'
    showError(errorMessage || '恢复下载失败')
}
```

**Note:** Well-structured error handling with appropriate user feedback.

---

#### I5: Clean Integration in App Startup

**Location:** `src/main.ts:67-82`

**Description:** The orphan file cleanup is properly integrated into the app initialization sequence, running before download restoration to ensure clean state.

**Code:**
```typescript
async function initializeApp() {
  const { useSettings, useDownload } = await import('./composables')

  await useSettings().load()
  await useDownload().loadHistory()

  // 清理孤儿临时文件（在恢复待处理下载之前）
  await useDownload().cleanupOrphanFiles()

  // 恢复待处理的下载任务
  await useDownload().restorePendingDownloads()
}
```

**Note:** Correct ordering - cleanup before restore.

---

## Summary of Recommendations

| Priority | Issue | Action |
|----------|-------|--------|
| Medium | W1/W2 | Consolidate duplicate type definitions |
| Low | W3 | Consider file locking for concurrent access (future) |
| Low | W4 | Current error handling is acceptable |
| Info | I1 | Consider centralizing error messages |

---

## Critical Issues

None found. The error handling implementation is robust and follows good practices.

---

## Conclusion

Phase 9 implementation is solid with well-structured error handling. The main concern is type duplication between `env.d.ts` and `src/shared/types/ipc.ts`, which should be addressed to prevent future type drift. The orphan file cleanup, Range support notification, and state file error handling all work correctly and integrate cleanly with the existing codebase.
