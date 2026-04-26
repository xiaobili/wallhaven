---
wave: 1
depends_on: []
files_modified:
  - src/errors/types.ts
  - src/shared/types/ipc.ts
  - electron/preload/types.ts
  - electron/preload/index.ts
  - electron/main/ipc/handlers/download.handler.ts
  - electron/main/ipc/handlers/index.ts
  - src/clients/electron.client.ts
autonomous: true
requirements: [INFR-01]
---

# Phase 6: Core Resume Infrastructure - Implementation Plan

**Goal:** Establish IPC channels, type definitions, and validation foundation for download resume functionality.

**Scope:**
- Define `ResumeDownloadParams` and `PendingDownload` types
- Add `RESUME_DOWNLOAD_TASK` and `GET_PENDING_DOWNLOADS` IPC channels
- Add type guard functions for resume-related types
- Add resume-related error codes
- Register placeholder IPC handlers
- Update preload and client APIs

**Out of Scope:**
- Actual resume logic implementation (Phase 7)
- Renderer integration (Phase 8)
- Error handling edge cases (Phase 9)

---

## Task 1: Add Resume-Related Error Codes

<read_first>
- src/errors/types.ts (current error code definitions)
</read_first>

<acceptance_criteria>
- `src/errors/types.ts` contains `RESUME_INVALID_OFFSET: 'RESUME_INVALID_OFFSET'`
- `src/errors/types.ts` contains `RESUME_FILE_NOT_FOUND: 'RESUME_FILE_NOT_FOUND'`
- `src/errors/types.ts` contains `RESUME_STATE_CORRUPTED: 'RESUME_STATE_CORRUPTED'`
- `src/errors/types.ts` contains `RESUME_SERVER_UNSUPPORTED: 'RESUME_SERVER_UNSUPPORTED'`
- TypeScript compiles without errors
</acceptance_criteria>

<action>
Add four new error codes to the `ErrorCodes` constant object in `src/errors/types.ts`.

After the existing `NETWORK_SERVER_ERROR: 'NETWORK_SERVER_ERROR'` line, add a new section:

```typescript
  // 断点续传错误
  RESUME_INVALID_OFFSET: 'RESUME_INVALID_OFFSET',
  RESUME_FILE_NOT_FOUND: 'RESUME_FILE_NOT_FOUND',
  RESUME_STATE_CORRUPTED: 'RESUME_STATE_CORRUPTED',
  RESUME_SERVER_UNSUPPORTED: 'RESUME_SERVER_UNSUPPORTED',
```

These error codes follow the existing naming convention (UPPER_SNAKE_CASE) and will be used by type guards and IPC handlers for resume-related error conditions.
</action>

---

## Task 2: Add IPC Channel Constants for Resume

<read_first>
- src/shared/types/ipc.ts (current IPC_CHANNELS definition)
</read_first>

<acceptance_criteria>
- `src/shared/types/ipc.ts` contains `RESUME_DOWNLOAD_TASK: 'resume-download-task'` in IPC_CHANNELS
- `src/shared/types/ipc.ts` contains `GET_PENDING_DOWNLOADS: 'get-pending-downloads'` in IPC_CHANNELS
- TypeScript compiles without errors
</acceptance_criteria>

<action>
Add two new channel constants to the `IPC_CHANNELS` object in `src/shared/types/ipc.ts`.

After the existing `CANCEL_DOWNLOAD_TASK: 'cancel-download-task'` line, add:

```typescript
  RESUME_DOWNLOAD_TASK: 'resume-download-task',
  GET_PENDING_DOWNLOADS: 'get-pending-downloads',
```

These follow the existing naming convention: SCREAMING_SNAKE_CASE for constants, kebab-case for channel strings.
</action>

---

## Task 3: Add ResumeDownloadParams and PendingDownload Types

<read_first>
- src/shared/types/ipc.ts (existing type definitions, especially StartDownloadTaskRequest)
</read_first>

<acceptance_criteria>
- `src/shared/types/ipc.ts` contains `export interface ResumeDownloadParams extends StartDownloadTaskRequest`
- `ResumeDownloadParams` contains `offset: number` field
- `src/shared/types/ipc.ts` contains `export interface PendingDownload`
- `PendingDownload` contains fields: `taskId`, `url`, `filename`, `saveDir`, `offset`, `totalSize`, `createdAt`, `updatedAt` (all required)
- `PendingDownload` contains optional fields: `wallpaperId`, `small`, `resolution`, `size`
- TypeScript compiles without errors
</acceptance_criteria>

<action>
Add two new type definitions to `src/shared/types/ipc.ts` after the `DownloadProgressData` interface (around line 177).

First, add `ResumeDownloadParams`:

```typescript
/**
 * 恢复下载任务请求参数
 * 继承 StartDownloadTaskRequest 并添加 offset 字段
 */
export interface ResumeDownloadParams extends StartDownloadTaskRequest {
  /** 已下载的字节数 */
  offset: number
}
```

Second, add `PendingDownload`:

```typescript
/**
 * 待恢复的下载任务信息
 * 包含恢复下载所需的所有状态信息
 */
export interface PendingDownload {
  /** 任务 ID */
  taskId: string
  /** 下载 URL */
  url: string
  /** 文件名 */
  filename: string
  /** 保存目录 */
  saveDir: string
  /** 已下载字节数 */
  offset: number
  /** 文件总大小 */
  totalSize: number
  /** Wallhaven 壁纸 ID */
  wallpaperId?: string
  /** 缩略图 URL */
  small?: string
  /** 分辨率信息 */
  resolution?: string
  /** 文件大小 */
  size?: number
  /** 创建时间 ISO 字符串 */
  createdAt: string
  /** 更新时间 ISO 字符串 */
  updatedAt: string
}
```

These types follow the existing naming convention (PascalCase) and structure (required fields first, optional fields after).
</action>

---

## Task 4: Add Type Guards for Resume Types

<read_first>
- src/shared/types/ipc.ts (existing isIpcErrorInfo type guard implementation)
</read_first>

<acceptance_criteria>
- `src/shared/types/ipc.ts` contains `export function isResumeDownloadParams(value: unknown): value is ResumeDownloadParams`
- `isResumeDownloadParams` validates: taskId (string), url (string), filename (string), saveDir (string), offset (number >= 0)
- `src/shared/types/ipc.ts` contains `export function isPendingDownload(value: unknown): value is PendingDownload`
- `isPendingDownload` validates: taskId, url, filename, saveDir, offset, totalSize (number), createdAt (string), updatedAt (string)
- TypeScript compiles without errors
</acceptance_criteria>

<action>
Add two new type guard functions to `src/shared/types/ipc.ts` after the existing `isIpcErrorInfo` function (after line 295).

First, add `isResumeDownloadParams`:

```typescript
/**
 * 检查是否为 ResumeDownloadParams
 */
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
```

Second, add `isPendingDownload`:

```typescript
/**
 * 检查是否为 PendingDownload
 */
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

These type guards follow the existing `isIpcErrorInfo` pattern with explicit type checks.
</action>

---

## Task 5: Update Preload Types with New Channels and Types

<read_first>
- electron/preload/types.ts (current VALID_INVOKE_CHANNELS and type exports)
- src/shared/types/ipc.ts (new types just added: ResumeDownloadParams, PendingDownload)
</read_first>

<acceptance_criteria>
- `electron/preload/types.ts` exports `ResumeDownloadParams` type
- `electron/preload/types.ts` exports `PendingDownload` type
- `electron/preload/types.ts` contains `IPC_CHANNELS.RESUME_DOWNLOAD_TASK` in VALID_INVOKE_CHANNELS
- `electron/preload/types.ts` contains `IPC_CHANNELS.GET_PENDING_DOWNLOADS` in VALID_INVOKE_CHANNELS
- TypeScript compiles without errors
</acceptance_criteria>

<action>
Modify `electron/preload/types.ts` in two places:

1. Add type exports to the `export type { ... }` block (after `ClearCacheResponse`):
```typescript
  ResumeDownloadParams,
  PendingDownload,
```

2. Add new channels to `VALID_INVOKE_CHANNELS` array (after `IPC_CHANNELS.CANCEL_DOWNLOAD_TASK`):
```typescript
  IPC_CHANNELS.RESUME_DOWNLOAD_TASK,
  IPC_CHANNELS.GET_PENDING_DOWNLOADS,
```
</action>

---

## Task 6: Update Preload API with Resume Methods

<read_first>
- electron/preload/index.ts (current ElectronAPI interface and electronAPI implementation)
- src/shared/types/ipc.ts (IPC_CHANNELS constants)
</read_first>

<acceptance_criteria>
- `electron/preload/index.ts` ElectronAPI interface contains `resumeDownloadTask: (params: ResumeDownloadParams) => Promise<IpcResponse<string>>`
- `electron/preload/index.ts` ElectronAPI interface contains `getPendingDownloads: () => Promise<IpcResponse<PendingDownload[]>>`
- `electron/preload/index.ts` electronAPI object contains `resumeDownloadTask` implementation
- `electron/preload/index.ts` electronAPI object contains `getPendingDownloads` implementation
- TypeScript compiles without errors
</acceptance_criteria>

<action>
Modify `electron/preload/index.ts` in two places:

1. Add imports at the top (after the existing import from './types'):
Add to the import: `ResumeDownloadParams, PendingDownload, IpcResponse`

2. Add method declarations to `ElectronAPI` interface (after `cancelDownloadTask`):
```typescript
  // 恢复下载任务
  resumeDownloadTask: (params: ResumeDownloadParams) => Promise<IpcResponse<string>>

  // 获取待恢复的下载任务列表
  getPendingDownloads: () => Promise<IpcResponse<PendingDownload[]>>
```

3. Add implementations to `electronAPI` object (after `cancelDownloadTask`):
```typescript
  // 恢复下载任务
  resumeDownloadTask: (params) => {
    console.log('[Preload] resumeDownloadTask called:', params.taskId, 'offset:', params.offset)
    return ipcRenderer.invoke(IPC_CHANNELS.RESUME_DOWNLOAD_TASK, params)
  },

  // 获取待恢复的下载任务列表
  getPendingDownloads: () => {
    console.log('[Preload] getPendingDownloads called')
    return ipcRenderer.invoke(IPC_CHANNELS.GET_PENDING_DOWNLOADS)
  },
```
</action>

---

## Task 7: Add Placeholder IPC Handlers for Resume

<read_first>
- electron/main/ipc/handlers/download.handler.ts (existing handler registration patterns)
- src/shared/types/ipc.ts (IPC_CHANNELS constants, ResumeDownloadParams, PendingDownload types)
</read_first>

<acceptance_criteria>
- `electron/main/ipc/handlers/download.handler.ts` contains `ipcMain.handle(IPC_CHANNELS.RESUME_DOWNLOAD_TASK, ...)` with placeholder implementation
- `electron/main/ipc/handlers/download.handler.ts` contains `ipcMain.handle(IPC_CHANNELS.GET_PENDING_DOWNLOADS, ...)` with placeholder implementation
- RESUME_DOWNLOAD_TASK handler returns `{ success: false, error: { code: 'NOT_IMPLEMENTED', message: 'Resume download - Phase 7' } }`
- GET_PENDING_DOWNLOADS handler returns `{ success: true, data: [] }`
- TypeScript compiles without errors
</acceptance_criteria>

<action>
Add two placeholder IPC handlers to `electron/main/ipc/handlers/download.handler.ts` inside the `registerDownloadHandlers()` function, after the CANCEL_DOWNLOAD_TASK handler.

First, add imports at the top of the file (update the import from shared/types/ipc to include new types):
```typescript
import { IPC_CHANNELS, type ResumeDownloadParams, type PendingDownload } from '../../../../src/shared/types/ipc'
```

Then add the handlers before the closing brace of `registerDownloadHandlers()`:

```typescript
  /**
   * 恢复下载任务（占位实现）
   * Phase 7 将实现完整逻辑
   */
  ipcMain.handle(
    IPC_CHANNELS.RESUME_DOWNLOAD_TASK,
    async (_event, params: ResumeDownloadParams) => {
      logHandler('resume-download-task', `Placeholder called for task: ${params.taskId}`)
      return {
        success: false,
        error: {
          code: 'NOT_IMPLEMENTED',
          message: 'Resume download - Phase 7',
        },
      }
    },
  )

  /**
   * 获取待恢复的下载任务列表（占位实现）
   * Phase 7 将实现完整逻辑
   */
  ipcMain.handle(IPC_CHANNELS.GET_PENDING_DOWNLOADS, async () => {
    logHandler('get-pending-downloads', 'Placeholder called')
    return {
      success: true,
      data: [] as PendingDownload[],
    }
  })
```
</action>

---

## Task 8: Update Handler Index with New Channels

<read_first>
- electron/main/ipc/handlers/index.ts (current REGISTERED_CHANNELS list)
</read_first>

<acceptance_criteria>
- `electron/main/ipc/handlers/index.ts` REGISTERED_CHANNELS contains `'resume-download-task'`
- `electron/main/ipc/handlers/index.ts` REGISTERED_CHANNELS contains `'get-pending-downloads'`
- TypeScript compiles without errors
</acceptance_criteria>

<action>
Modify `electron/main/ipc/handlers/index.ts` to add the new channels to the `REGISTERED_CHANNELS` array.

After `'cancel-download-task'`, add:
```typescript
  'resume-download-task',
  'get-pending-downloads',
```
</action>

---

## Task 9: Update Electron Client with Resume Methods

<read_first>
- src/clients/electron.client.ts (existing download methods pattern)
- src/shared/types/ipc.ts (ResumeDownloadParams, PendingDownload types)
</read_first>

<acceptance_criteria>
- `src/clients/electron.client.ts` imports `ResumeDownloadParams` and `PendingDownload` types
- `src/clients/electron.client.ts` `ElectronClientImpl` class contains `resumeDownloadTask(params: ResumeDownloadParams): Promise<IpcResponse<string>>`
- `src/clients/electron.client.ts` `ElectronClientImpl` class contains `getPendingDownloads(): Promise<IpcResponse<PendingDownload[]>>`
- Both methods follow existing error handling patterns
- TypeScript compiles without errors
</acceptance_criteria>

<action>
Modify `src/clients/electron.client.ts` in three places:

1. Add imports at the top (update the import from '@/shared/types/ipc'):
```typescript
import type {
  IpcResponse,
  DownloadProgressData,
  LocalFile,
  CacheInfo,
  ResumeDownloadParams,
  PendingDownload,
} from '@/shared/types/ipc'
```

2. Add `resumeDownloadTask` method in the download management section (after `cancelDownloadTask`):
```typescript
  /**
   * 恢复下载任务
   */
  async resumeDownloadTask(params: ResumeDownloadParams): Promise<IpcResponse<string>> {
    if (!this.isAvailable()) {
      return this.createUnavailableResponse<string>()
    }

    try {
      const result = await window.electronAPI.resumeDownloadTask(params)
      if (result.success && result.data) {
        return { success: true, data: result.data }
      }
      return {
        success: false,
        error: {
          code: result.error?.code || 'DOWNLOAD_RESUME_ERROR',
          message: result.error?.message || 'Resume download failed',
        },
      }
    } catch (error) {
      return {
        success: false,
        error: { code: 'DOWNLOAD_RESUME_ERROR', message: String(error) },
      }
    }
  }
```

3. Add `getPendingDownloads` method (after `resumeDownloadTask`):
```typescript
  /**
   * 获取待恢复的下载任务列表
   */
  async getPendingDownloads(): Promise<IpcResponse<PendingDownload[]>> {
    if (!this.isAvailable()) {
      return this.createUnavailableResponse<PendingDownload[]>()
    }

    try {
      const result = await window.electronAPI.getPendingDownloads()
      if (result.success) {
        return { success: true, data: result.data || [] }
      }
      return {
        success: false,
        data: [],
        error: {
          code: result.error?.code || 'GET_PENDING_DOWNLOADS_ERROR',
          message: result.error?.message || 'Get pending downloads failed',
        },
      }
    } catch (error) {
      return {
        success: false,
        data: [],
        error: { code: 'GET_PENDING_DOWNLOADS_ERROR', message: String(error) },
      }
    }
  }
```
</action>

---

## Verification

After completing all tasks, verify the implementation:

```bash
# 1. TypeScript compilation check
npm run typecheck  # or: npx tsc --noEmit

# 2. Verify new types are exported
grep -n "ResumeDownloadParams" src/shared/types/ipc.ts
grep -n "PendingDownload" src/shared/types/ipc.ts
grep -n "isResumeDownloadParams" src/shared/types/ipc.ts
grep -n "isPendingDownload" src/shared/types/ipc.ts

# 3. Verify new channels are registered
grep -n "RESUME_DOWNLOAD_TASK" src/shared/types/ipc.ts
grep -n "GET_PENDING_DOWNLOADS" src/shared/types/ipc.ts
grep -n "resume-download-task" electron/main/ipc/handlers/index.ts
grep -n "get-pending-downloads" electron/main/ipc/handlers/index.ts

# 4. Verify error codes
grep -n "RESUME_INVALID_OFFSET" src/errors/types.ts
grep -n "RESUME_FILE_NOT_FOUND" src/errors/types.ts
grep -n "RESUME_STATE_CORRUPTED" src/errors/types.ts
grep -n "RESUME_SERVER_UNSUPPORTED" src/errors/types.ts

# 5. Verify preload and client
grep -n "resumeDownloadTask" electron/preload/index.ts
grep -n "getPendingDownloads" electron/preload/index.ts
grep -n "resumeDownloadTask" src/clients/electron.client.ts
grep -n "getPendingDownloads" src/clients/electron.client.ts
```

---

## Must-Haves (Goal-Backward Verification)

These are the non-negotiable deliverables for this phase:

1. **TypeScript compiles without errors** - All new types and code must be valid TypeScript
2. **`ResumeDownloadParams` type exists and extends `StartDownloadTaskRequest`** - Required for resume request validation
3. **`PendingDownload` type exists with all required fields** - Required for state persistence (Phase 7)
4. **`IPC_CHANNELS.RESUME_DOWNLOAD_TASK` constant exists** - Required for IPC communication
5. **`IPC_CHANNELS.GET_PENDING_DOWNLOADS` constant exists** - Required for IPC communication
6. **Type guards `isResumeDownloadParams` and `isPendingDownload` exist** - Required for validation
7. **Error codes `RESUME_*` exist in `ErrorCodes`** - Required for error handling (Phase 7+)
8. **Preload API methods `resumeDownloadTask` and `getPendingDownloads` exist** - Required for renderer-to-main communication
9. **Electron client methods `resumeDownloadTask` and `getPendingDownloads` exist** - Required by services layer (Phase 8)
10. **Handler placeholders are registered and callable** - Required for Phase 7 implementation

---

## PLANNING COMPLETE

**Plan Count:** 9 tasks
**Wave:** 1 (all tasks can be executed in sequence with dependencies respected)
**Autonomous:** Yes - all tasks have concrete values and acceptance criteria
