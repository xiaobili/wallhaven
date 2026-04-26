# PLAN-03: Enhanced State File Error Handling

---
wave: 2
depends_on:
  - PLAN-01
files_modified:
  - electron/main/ipc/handlers/download.handler.ts
  - src/shared/types/ipc.ts
  - src/composables/download/useDownload.ts
requirements:
  - ERRH-02
autonomous: true
---

## Goal

Enhance state file error handling with specific error codes and clear user notifications. Improve the handling of corrupted state files and missing temp files during resume attempts.

## Context

From CONTEXT.md decisions:
- D-03/D-04: State file corruption handling
- D-05: Error codes for different failure scenarios

Current error codes exist but error messages could be more user-friendly. The GET_PENDING_DOWNLOADS handler already handles some corruption cases, but we can improve consistency.

## Tasks

### Task 1: Add RESUME_STATE_CORRUPTED error handling

<read_first>
- electron/main/ipc/handlers/download.handler.ts
- src/shared/types/ipc.ts
</read_first>

<action>
Update the `readStateFile` function in `download.handler.ts` to distinguish between "file not found" and "file corrupted":

Find the `readStateFile` function (around line 59-68):
```typescript
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
```

Update it to return more specific error information:
```typescript
type StateFileResult = 
  | { success: true; data: PendingDownload }
  | { success: false; error: 'NOT_FOUND' | 'PARSE_ERROR' | 'VALIDATION_ERROR' }

function readStateFile(statePath: string): StateFileResult {
  try {
    if (!fs.existsSync(statePath)) {
      return { success: false, error: 'NOT_FOUND' }
    }
    
    const content = fs.readFileSync(statePath, 'utf-8')
    const state = JSON.parse(content)
    
    if (!isPendingDownload(state)) {
      return { success: false, error: 'VALIDATION_ERROR' }
    }
    
    return { success: true, data: state }
  } catch {
    return { success: false, error: 'PARSE_ERROR' }
  }
}
```

Then update the RESUME_DOWNLOAD_TASK handler to use the new return type:
```typescript
// Check temp file exists
if (!fs.existsSync(tempPath)) {
  return {
    success: false,
    error: {
      code: 'RESUME_FILE_NOT_FOUND',
      message: '临时文件不存在，无法恢复下载',
    },
  }
}
```

The validation logic at line 559-578 already handles `RESUME_INVALID_OFFSET`.

Update GET_PENDING_DOWNLOADS handler to use the new function:
```typescript
const state = readStateFile(statePath)
if (!state.success) {
  // Log specific error
  if (state.error === 'PARSE_ERROR') {
    logHandler('get-pending-downloads', `Corrupted state file: ${stateFile}`, 'warn')
  }
  // Delete invalid state file
  try {
    fs.unlinkSync(statePath)
  } catch {
    // Ignore cleanup errors
  }
  continue
}

// Use state.data instead of state
```
</action>

<acceptance_criteria>
- `grep -n "StateFileResult" electron/main/ipc/handlers/download.handler.ts` returns at least 1 match
- `grep -n "PARSE_ERROR" electron/main/ipc/handlers/download.handler.ts` returns at least 1 match
- `grep -n "VALIDATION_ERROR" electron/main/ipc/handlers/download.handler.ts` returns at least 1 match
</acceptance_criteria>

---

### Task 2: Add Chinese error messages for resume failures

<read_first>
- electron/main/ipc/handlers/download.handler.ts
- src/shared/types/ipc.ts
</read_first>

<action>
Update error messages in RESUME_DOWNLOAD_TASK handler to use Chinese:

```typescript
// Error code definitions with Chinese messages
const RESUME_ERRORS = {
  FILE_NOT_FOUND: {
    code: 'RESUME_FILE_NOT_FOUND',
    message: '临时文件不存在，无法恢复下载',
  },
  INVALID_OFFSET: {
    code: 'RESUME_INVALID_OFFSET',
    message: '临时文件已损坏，已自动清理',
  },
  STATE_CORRUPTED: {
    code: 'RESUME_STATE_CORRUPTED',
    message: '下载记录已损坏，无法恢复',
  },
  FAILED: {
    code: 'RESUME_FAILED',
    message: '恢复下载失败',
  },
}
```

Update the existing error returns to use these constants:
```typescript
// At line 549-557
if (!fs.existsSync(tempPath)) {
  return {
    success: false,
    error: RESUME_ERRORS.FILE_NOT_FOUND,
  }
}

// At line 571-577
return {
  success: false,
  error: RESUME_ERRORS.INVALID_OFFSET,
}
```
</action>

<acceptance_criteria>
- `grep -n "RESUME_ERRORS" electron/main/ipc/handlers/download.handler.ts` returns at least 1 match
- Chinese error messages are present for all error codes
</acceptance_criteria>

---

### Task 3: Enhance useDownload error handling

<read_first>
- src/composables/download/useDownload.ts
- src/composables/core/useAlert.ts
</read_first>

<action>
Update the `resumeDownload` function in `useDownload.ts` to show user-friendly messages based on error codes:

Find the error handling section in `resumeDownload` (around line 241-258) and enhance it:

```typescript
if (!result.success) {
  const errorCode = result.error?.code
  const errorMessage = result.error?.message

  // 根据错误类型处理
  switch (errorCode) {
    case 'RESUME_FILE_NOT_FOUND':
      // 临时文件丢失，从列表移除
      showError(errorMessage || '临时文件不存在')
      const index1 = store.downloadingList.findIndex((item) => item.id === id)
      if (index1 !== -1) {
        store.downloadingList.splice(index1, 1)
      }
      return false

    case 'RESUME_INVALID_OFFSET':
      // 临时文件损坏，已自动清理
      showWarning(errorMessage || '临时文件已损坏，请重新下载')
      const index2 = store.downloadingList.findIndex((item) => item.id === id)
      if (index2 !== -1) {
        store.downloadingList.splice(index2, 1)
      }
      return false

    case 'RESUME_STATE_CORRUPTED':
      // 状态文件损坏
      showError(errorMessage || '下载记录已损坏')
      const index3 = store.downloadingList.findIndex((item) => item.id === id)
      if (index3 !== -1) {
        store.downloadingList.splice(index3, 1)
      }
      return false

    default:
      // 其他错误，保持暂停状态允许重试
      task.state = 'paused'
      showError(errorMessage || '恢复下载失败')
      return false
  }
}
```

Add `showWarning` to the destructured methods at the top of `useDownload`:
```typescript
const { showError, showWarning } = useAlert()
```
</action>

<acceptance_criteria>
- `grep -n "RESUME_FILE_NOT_FOUND" src/composables/download/useDownload.ts` returns at least 1 match
- `grep -n "RESUME_INVALID_OFFSET" src/composables/download/useDownload.ts` returns at least 1 match
- `grep -n "RESUME_STATE_CORRUPTED" src/composables/download/useDownload.ts` returns at least 1 match
- Switch statement handles all error codes
</acceptance_criteria>

---

## Verification

After all tasks complete:

1. Manually corrupt a state file (invalid JSON)
2. Try to resume download - should show "下载记录已损坏"
3. Delete temp file manually, keep state file
4. Try to resume - should show "临时文件不存在"
5. Truncate temp file to smaller size
6. Try to resume - should show "临时文件已损坏"

## must_haves

- [ ] StateFileResult type with specific error types
- [ ] RESUME_ERRORS constant with Chinese messages
- [ ] useDownload handles all error codes with appropriate notifications
- [ ] Error messages are user-friendly (in Chinese)
