# Phase 6 Research: Core Resume Infrastructure

**Research Date:** 2026-04-26
**Phase Focus:** IPC channels, type definitions, validation foundation

---

## 1. Existing IPC Type Patterns and Naming Conventions

### Channel Naming Convention

The project uses a consistent naming pattern for IPC channels:

| Constant Name | Channel String | Pattern |
|---------------|----------------|---------|
| `START_DOWNLOAD_TASK` | `'start-download-task'` | SCREAMING_SNAKE_CASE constant → kebab-case channel |
| `PAUSE_DOWNLOAD_TASK` | `'pause-download-task'` | Same pattern |
| `DOWNLOAD_PROGRESS` | `'download-progress'` | Same pattern |

**Convention:**
- Constants: `SCREAMING_SNAKE_CASE` in `IPC_CHANNELS` object
- Channel strings: `kebab-case` matching the constant
- Both defined in `src/shared/types/ipc.ts`

### Type Naming Convention

Request/Response types follow a consistent pattern:

```typescript
// Request types: {Action}Request
interface StartDownloadTaskRequest { ... }
interface DownloadTaskOperationRequest { ... }

// Response types: {Action}Response
interface DownloadTaskOperationResponse { ... }
interface DownloadWallpaperResponse { ... }

// Data types: {Purpose}Data
interface DownloadProgressData { ... }
```

### Location for New Types

All IPC-related types should be added to `src/shared/types/ipc.ts`:

```typescript
// Current structure:
// 1. IPC_CHANNELS constant (lines 15-54)
// 2. IpcResponse and IpcErrorInfo (lines 61-73)
// 3. Request/Response types per channel (lines 75-279)
// 4. Type guards (lines 281-295)
```

---

## 2. Existing Type Guard Implementations

### Current Pattern

Only one type guard exists currently:

```typescript
// src/shared/types/ipc.ts:286-295
export function isIpcErrorInfo(value: unknown): value is IpcErrorInfo {
  return (
    typeof value === 'object' &&
    value !== null &&
    'code' in value &&
    'message' in value &&
    typeof (value as IpcErrorInfo).code === 'string' &&
    typeof (value as IpcErrorInfo).message === 'string'
  )
}
```

### Type Guard Pattern Characteristics

1. **Input:** `value: unknown`
2. **Return type:** `value is TypeName` (type predicate)
3. **Structure:**
   - Check `typeof value === 'object'`
   - Check `value !== null`
   - Check each required property exists with `'prop' in value`
   - Check each property has the correct type

### Recommended Pattern for Resume Types

```typescript
export function isResumeDownloadParams(value: unknown): value is ResumeDownloadParams {
  if (typeof value !== 'object' || value === null) return false
  
  const v = value as ResumeDownloadParams
  return (
    typeof v.taskId === 'string' &&
    typeof v.url === 'string' &&
    typeof v.filename === 'string' &&
    typeof v.saveDir === 'string' &&
    typeof v.offset === 'number' &&
    v.offset >= 0
  )
}

export function isPendingDownload(value: unknown): value is PendingDownload {
  if (typeof value !== 'object' || value === null) return false
  
  const v = value as PendingDownload
  return (
    typeof v.taskId === 'string' &&
    typeof v.url === 'string' &&
    typeof v.filename === 'string' &&
    typeof v.saveDir === 'string' &&
    typeof v.offset === 'number' &&
    typeof v.totalSize === 'number' &&
    typeof v.createdAt === 'string' &&
    typeof v.updatedAt === 'string'
  )
}
```

---

## 3. Current Download Handler Structure and Registration Pattern

### Handler File Structure

`electron/main/ipc/handlers/download.handler.ts`:

```typescript
// 1. Imports
import { ipcMain, BrowserWindow } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import axios from 'axios'
import { streamPipeline, logHandler } from './base'
import { IPC_CHANNELS } from '../../../../src/shared/types/ipc'

// 2. Local interfaces
interface ActiveDownload {
  abortController: AbortController
  tempPath: string
  saveDir: string
  filename: string
}

// 3. State management
const activeDownloads = new Map<string, ActiveDownload>()

// 4. Helper functions
function cleanupDownload(taskId: string): void { ... }

// 5. Registration function
export function registerDownloadHandlers(): void {
  ipcMain.handle('download-wallpaper', ...)
  ipcMain.handle(IPC_CHANNELS.START_DOWNLOAD_TASK, ...)
  ipcMain.handle(IPC_CHANNELS.PAUSE_DOWNLOAD_TASK, ...)
  ipcMain.handle(IPC_CHANNELS.CANCEL_DOWNLOAD_TASK, ...)
}
```

### Registration Pattern

Handlers are registered via `registerDownloadHandlers()` function:

```typescript
// In electron/main/ipc/handlers/download.handler.ts
export function registerDownloadHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.START_DOWNLOAD_TASK, async (_event, params) => {
    // Handler implementation
  })
}
```

Then called from the main index:

```typescript
// In electron/main/ipc/handlers/index.ts
import { registerDownloadHandlers } from './download.handler'

export function registerAllHandlers(): void {
  registerDownloadHandlers()
  // ... other handlers
}
```

### Placeholder Implementation Pattern

For Phase 6, new handlers should have placeholder implementations:

```typescript
ipcMain.handle(IPC_CHANNELS.RESUME_DOWNLOAD_TASK, async (_event, params) => {
  // Placeholder - actual implementation in Phase 7
  return {
    success: false,
    error: 'Not implemented - Phase 7',
  }
})

ipcMain.handle(IPC_CHANNELS.GET_PENDING_DOWNLOADS, async () => {
  // Placeholder - actual implementation in Phase 7
  return {
    success: true,
    data: [],
  }
})
```

---

## 4. Current Download State Management

### DownloadItem Interface (Renderer Side)

```typescript
// src/types/index.ts:184-198
interface DownloadItem {
  id: string
  url: string
  filename: string
  small: string
  resolution: string
  size: number
  offset: number       // Bytes downloaded
  progress: number     // 0-100
  speed: number        // Bytes/sec
  state: DownloadState
  path?: string
  time?: string
  wallpaperId?: string
}

type DownloadState = 'downloading' | 'paused' | 'waiting' | 'completed' | 'failed'
```

### DownloadProgressData (IPC)

```typescript
// src/shared/types/ipc.ts:167-176
interface DownloadProgressData {
  taskId: string
  progress: number
  offset: number       // Already has offset
  speed: number
  state: 'downloading' | 'paused' | 'waiting' | 'completed' | 'failed'
  filePath?: string
  error?: string
  totalSize?: number   // Already has totalSize
}
```

### Key Observations

1. **`offset` already exists** in both `DownloadItem` and `DownloadProgressData`
2. **`totalSize` already exists** in `DownloadProgressData`
3. These fields will be reused for resume functionality
4. The `paused` state already exists

---

## 5. Edge Cases and Considerations for Type Definitions

### ResumeDownloadParams Design Considerations

**Decision D-01:** Extends `StartDownloadTaskRequest` + `offset`

```typescript
interface ResumeDownloadParams extends StartDownloadTaskRequest {
  offset: number  // Already downloaded bytes
}
```

**Edge Cases:**
- `offset = 0` → Should this be rejected or treated as fresh download?
- `offset > totalSize` → Invalid state, should fail validation
- `offset < 0` → Invalid, should fail validation

**Validation Rules (Phase 6 - Basic):**
```typescript
// Basic validation (Phase 6)
offset >= 0
taskId is non-empty string
url is non-empty string

// Complex validation (Phase 7)
offset <= totalSize
temp file exists and has size >= offset
```

### PendingDownload Design Considerations

**Decision D-02:** Complete state snapshot

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

**Edge Cases:**
- Optional fields (`wallpaperId`, `small`, `resolution`, `size`) may be `undefined`
- `totalSize = 0` → Unknown file size (server didn't provide Content-Length)
- JSON serialization may lose `undefined` values (become `null` or missing)

**Serialization Consideration:**
```typescript
// When saving to .download.json:
JSON.stringify(pendingDownload)

// When loading:
const loaded = JSON.parse(content)
// Optional fields may be missing, not undefined
```

### Error Code Considerations

**Decision D-08:** Extend existing `IpcErrorInfo` structure

New error codes to add:

```typescript
// In src/errors/types.ts (extend ErrorCodes)
RESUME_INVALID_OFFSET: 'RESUME_INVALID_OFFSET',
RESUME_FILE_NOT_FOUND: 'RESUME_FILE_NOT_FOUND',
RESUME_STATE_CORRUPTED: 'RESUME_STATE_CORRUPTED',
RESUME_SERVER_UNSUPPORTED: 'RESUME_SERVER_UNSUPPORTED',
```

---

## 6. Integration Points with Existing Code

### Files to Modify

| File | Changes |
|------|---------|
| `src/shared/types/ipc.ts` | Add types, channels, type guards |
| `electron/preload/types.ts` | Add to `VALID_INVOKE_CHANNELS` |
| `electron/preload/index.ts` | Add new API methods |
| `electron/main/ipc/handlers/download.handler.ts` | Add placeholder handlers |
| `electron/main/ipc/handlers/index.ts` | Add channels to `REGISTERED_CHANNELS` |
| `src/clients/electron.client.ts` | Add client methods |
| `src/errors/types.ts` | Add new error codes |

### Preload API Pattern

```typescript
// electron/preload/index.ts
// Add to ElectronAPI interface
resumeDownloadTask: (params: ResumeDownloadParams) => Promise<IpcResponse<string>>
getPendingDownloads: () => Promise<IpcResponse<PendingDownload[]>>

// Add to electronAPI object
resumeDownloadTask: (params) => {
  return ipcRenderer.invoke(IPC_CHANNELS.RESUME_DOWNLOAD_TASK, params)
},
getPendingDownloads: () => {
  return ipcRenderer.invoke(IPC_CHANNELS.GET_PENDING_DOWNLOADS)
},
```

### Channel Whitelist Pattern

```typescript
// electron/preload/types.ts
export const VALID_INVOKE_CHANNELS: readonly string[] = [
  // ... existing channels
  IPC_CHANNELS.RESUME_DOWNLOAD_TASK,
  IPC_CHANNELS.GET_PENDING_DOWNLOADS,
] as const
```

---

## 7. Potential Pitfalls and Gotchas

### Type Guard Strictness

**Issue:** Type guards with `in` operator can be too permissive.

```typescript
// Too permissive - accepts extra properties
'offset' in value

// Better - explicitly check types
typeof v.offset === 'number' && v.offset >= 0
```

**Recommendation:** Follow the existing `isIpcErrorInfo` pattern with explicit type checks.

### Cross-Process Type Consistency

**Issue:** Types defined in `src/shared/types/ipc.ts` must be importable by both processes.

Current pattern works:
```typescript
// Main process
import { IPC_CHANNELS } from '../../../../src/shared/types/ipc'

// Renderer process
import { IPC_CHANNELS } from '@/shared/types/ipc'
```

**Gotcha:** When adding types, ensure they don't import renderer-only dependencies.

### JSON Serialization

**Issue:** `undefined` values become `null` or are omitted.

```typescript
const pending: PendingDownload = {
  taskId: '123',
  wallpaperId: undefined,  // Will be omitted in JSON
}

const json = JSON.stringify(pending)
// {"taskId":"123"}  -- wallpaperId is missing

const loaded = JSON.parse(json)
loaded.wallpaperId  // undefined, not null
```

**Recommendation:** Type guards should handle missing optional properties gracefully.

### Backward Compatibility

**Issue:** Existing `StartDownloadTaskRequest` should not be modified.

```typescript
// DON'T modify existing type
interface StartDownloadTaskRequest {
  taskId: string
  url: string
  filename: string
  saveDir: string
  // Don't add offset here - use ResumeDownloadParams extends pattern
}
```

### Error Code Naming

**Issue:** Must match existing naming convention in `src/errors/types.ts`.

```typescript
// Existing pattern: UPPER_SNAKE_CASE
STORE_ERROR: 'STORE_ERROR',
NETWORK_ERROR: 'NETWORK_ERROR',

// New codes should follow same pattern
RESUME_INVALID_OFFSET: 'RESUME_INVALID_OFFSET',
```

### Temp File Naming Convention

**From CONTEXT.md D-04:**
- State file: `{filename}.download.json`
- Temp file: `{filename}.download`

This naming convention should be documented in comments but not enforced in Phase 6 types.

---

## 8. Summary: What to Plan

### Deliverables for Phase 6

1. **Type Definitions** (`src/shared/types/ipc.ts`)
   - `ResumeDownloadParams extends StartDownloadTaskRequest`
   - `PendingDownload` interface
   - Add `RESUME_DOWNLOAD_TASK` and `GET_PENDING_DOWNLOADS` to `IPC_CHANNELS`

2. **Type Guards** (`src/shared/types/ipc.ts`)
   - `isResumeDownloadParams(value: unknown): value is ResumeDownloadParams`
   - `isPendingDownload(value: unknown): value is PendingDownload`

3. **Error Codes** (`src/errors/types.ts`)
   - `RESUME_INVALID_OFFSET`
   - `RESUME_FILE_NOT_FOUND`
   - `RESUME_STATE_CORRUPTED`
   - `RESUME_SERVER_UNSUPPORTED`

4. **IPC Handler Placeholders** (`electron/main/ipc/handlers/download.handler.ts`)
   - `RESUME_DOWNLOAD_TASK` handler (returns not implemented)
   - `GET_PENDING_DOWNLOADS` handler (returns empty array)

5. **Preload Updates**
   - Add channels to `VALID_INVOKE_CHANNELS`
   - Add API methods to `ElectronAPI` interface and implementation

6. **Client Updates** (`src/clients/electron.client.ts`)
   - `resumeDownloadTask()` method
   - `getPendingDownloads()` method

### Order of Implementation

1. Add error codes (no dependencies)
2. Add IPC channel constants (no dependencies)
3. Add type definitions (depend on error codes for return types)
4. Add type guards (depend on type definitions)
5. Update preload types (depend on channel constants)
6. Update preload API (depend on types)
7. Add handler placeholders (depend on channel constants)
8. Update handler index (depend on handlers)
9. Update electron client (depend on types and preload)

### Verification Checklist

- [ ] TypeScript compiles without errors
- [ ] Type guards correctly validate/invalidates test cases
- [ ] IPC channels appear in `VALID_INVOKE_CHANNELS`
- [ ] IPC channels appear in `REGISTERED_CHANNELS`
- [ ] Placeholder handlers are callable from renderer
- [ ] No runtime errors when importing new types

---

## RESEARCH COMPLETE
