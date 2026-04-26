# Phase 4: IPC 模块化重构 - Research

**Research Date:** 2026-04-26
**Status:** Complete

---

## Executive Summary

Phase 4 requires splitting the 866-line `handlers.ts` into 8 domain-specific handler files while maintaining complete backward compatibility. This research identifies the key technical considerations for planning.

---

## 1. Current State Analysis

### 1.1 File Structure

```
electron/main/ipc/
└── handlers.ts          # 866 lines, ALL handlers in one file
```

**Handler breakdown by domain:**

| Domain | Channels | Lines | Complexity |
|--------|----------|-------|------------|
| File Operations | select-folder, read-directory, delete-file, open-folder | ~95 | Medium (includes image parsing, thumbnails) |
| Download | download-wallpaper, start-download-task | ~205 | High (progress tracking, temp files) |
| Settings | save-settings, load-settings | ~35 | Low |
| Wallpaper | set-wallpaper | ~30 | Medium (dynamic import) |
| Window | window-minimize, window-maximize, window-close, window-is-maximized | ~35 | Low |
| Cache | clear-app-cache, get-cache-info | ~85 | Medium |
| API Proxy | wallhaven-api-request | ~90 | High (retry logic, TLS handling) |
| Store | store-get, store-set, store-delete, store-clear | ~55 | Medium (imports store from main/index) |
| **Utilities** | getImageDimensions, generateThumbnail, streamPipeline | ~120 | Medium |

### 1.2 Current Imports

```typescript
// handlers.ts:1-7
import { ipcMain, dialog, shell, BrowserWindow } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import axios from 'axios'
import { pipeline } from 'stream'
import { promisify } from 'util'
import sharp from 'sharp'
```

### 1.3 Store Dependency

The store handlers import `store` dynamically from `../index`:

```typescript
// handlers.ts:682-689
ipcMain.handle('store-get', async (_event, key: string) => {
  try {
    const { store } = await import('../index')
    const value = store.get(key)
    return { success: true, value }
  } catch (error: any) {
    // ...
  }
})
```

This is a critical dependency to maintain to avoid circular imports.

---

## 2. Key Technical Decisions for Planning

### 2.1 Handler Registration Mechanism

**Option A: Side-effect imports (current pattern)**
```typescript
// handlers/index.ts
import './file.handler'
import './download.handler'
// etc.
```
- Pro: Matches current pattern in main/index.ts
- Con: Harder to verify all handlers registered

**Option B: Explicit registration function**
```typescript
// handlers/index.ts
export function registerAllHandlers() {
  registerFileHandlers()
  registerDownloadHandlers()
  // etc.
}
```
- Pro: Explicit, testable, can add verification
- Con: Requires more boilerplate

**Recommendation:** Option B with verification check. The CONTEXT.md decision D-08 already specifies this approach.

### 2.2 Shared Utilities Location

**Question:** Where should `getImageDimensions` and `generateThumbnail` live?

**Decision from CONTEXT.md:** Move to `base.ts`

**Considerations:**
- These are only used by `read-directory` handler
- `streamPipeline` is used by download handlers
- Could also create a separate `utils.ts` if base.ts becomes too large

**Import path after split:**
```typescript
// handlers/file.handler.ts
import { getImageDimensions, generateThumbnail } from './base'
```

### 2.3 Error Handling Wrapper Design

**Current pattern:** Each handler has its own try-catch with inconsistent error formats:

```typescript
// Pattern 1: Returns { success, error }
return { success: false, error: error.message }

// Pattern 2: Returns { error: string | null }
return { error: '目录不存在', files: [] }

// Pattern 3: Returns primitive
return null  // select-folder when canceled
```

**Target:** Unify to `IpcResponse<T>` format:

```typescript
interface IpcResponse<T> {
  success: boolean
  data?: T
  error?: { code: string; message: string }
}
```

**Challenge:** Some handlers return different structures today:
- `select-folder`: Returns `string | null` (needs wrapper)
- `read-directory`: Returns `{ error, files }` (needs conversion)
- `window-minimize`: Returns `void` (no response needed)

**Recommendation for planning:**
1. Define which handlers need response wrapper
2. Define which handlers can keep current return type for backward compatibility
3. Document exceptions clearly

### 2.4 Channel Name Constants

**Phase 1 already created `IPC_CHANNELS` in `src/shared/types/ipc.ts`:**

```typescript
export const IPC_CHANNELS = {
  SELECT_FOLDER: 'select-folder',
  READ_DIRECTORY: 'read-directory',
  // ... all 18 channels defined
} as const
```

**Planning consideration:** How to import in main process?

```typescript
// Option 1: Direct import with relative path
import { IPC_CHANNELS } from '../../../src/shared/types/ipc'

// Option 2: Configure tsconfig path alias
import { IPC_CHANNELS } from '@/shared/types/ipc'
```

**Recommendation:** Use tsconfig path alias for cleaner imports. Need to verify main process tsconfig supports this.

### 2.5 Store Handler Circular Import Risk

**Current flow:**
```
main/index.ts → imports handlers.ts
handlers.ts → dynamic import('../index') for store
```

**After split:**
```
main/index.ts → imports handlers/index.ts
handlers/index.ts → imports store.handler.ts
store.handler.ts → dynamic import('../../index') for store
```

**Risk:** If we change to static import, circular dependency will break.

**Recommendation:** Keep dynamic import pattern for store in `store.handler.ts`.

---

## 3. Preload Script Updates

### 3.1 Current State

The preload script (`electron/preload/index.ts`) has:
- Full `ElectronAPI` interface definition (lines 6-84)
- Implementation with direct channel strings (lines 87-215)
- Partial channel validation for `send`/`receive` only (lines 202-213)

### 3.2 Required Changes

1. **Import channel constants:**
```typescript
import { IPC_CHANNELS } from '../src/shared/types/ipc'
// or configure path alias
```

2. **Add invoke channel whitelist:**
```typescript
const VALID_INVOKE_CHANNELS = Object.values(IPC_CHANNELS)

function validateChannel(channel: string): boolean {
  return VALID_INVOKE_CHANNELS.includes(channel as any)
}
```

3. **Wrap invoke calls with validation:**
```typescript
selectFolder: () => {
  const channel = IPC_CHANNELS.SELECT_FOLDER
  if (!validateChannel(channel)) {
    throw new Error(`Invalid IPC channel: ${channel}`)
  }
  return ipcRenderer.invoke(channel)
}
```

### 3.3 Type Safety Enhancement

**Option:** Create typed invoke wrapper:

```typescript
// preload/types.ts
type IpcInvokeMap = {
  [IPC_CHANNELS.SELECT_FOLDER]: () => Promise<string | null>
  [IPC_CHANNELS.READ_DIRECTORY]: (dirPath: string) => Promise<ReadDirectoryResponse>
  // etc.
}

function invoke<K extends keyof IpcInvokeMap>(
  channel: K,
  ...args: Parameters<IpcInvokeMap[K]>
): Promise<ReturnType<IpcInvokeMap[K]>> {
  return ipcRenderer.invoke(channel, ...args)
}
```

**Recommendation for planning:** Keep simpler approach for Phase 4, defer full typed invoke to future iteration.

---

## 4. Logging and Debugging

### 4.1 Current Pattern

Each handler has ad-hoc console logging:

```typescript
console.error('读取目录失败:', error)
console.error('[Store] Get failed:', error)
console.log(`[Wallhaven API Proxy] Attempt ${attempt}/${maxRetries + 1}`)
```

### 4.2 Unified Logger Design

**From CONTEXT.md decision D-09:**

```typescript
// base.ts
export function logHandler(
  handlerName: string,
  message: string,
  level: 'info' | 'error' | 'warn' = 'info'
): void {
  const timestamp = new Date().toISOString()
  console[level](`[${timestamp}][${handlerName}] ${message}`)
}
```

**Sensitive data filtering:**

The API handler logs requests with API keys. Need to filter:

```typescript
// Bad: logs full params including apiKey
console.log('[Wallhaven API Proxy]', params)

// Good: filter sensitive data
const { apiKey, ...safeParams } = params
console.log('[Wallhaven API Proxy]', safeParams)
```

---

## 5. Testing Considerations

### 5.1 Verification Checklist

After split, verify:

1. **All 18 channels still work:**
   - [ ] select-folder
   - [ ] read-directory
   - [ ] delete-file
   - [ ] open-folder
   - [ ] download-wallpaper
   - [ ] start-download-task
   - [ ] set-wallpaper
   - [ ] save-settings
   - [ ] load-settings
   - [ ] wallhaven-api-request
   - [ ] window-minimize
   - [ ] window-maximize
   - [ ] window-close
   - [ ] window-is-maximized
   - [ ] store-get
   - [ ] store-set
   - [ ] store-delete
   - [ ] store-clear
   - [ ] clear-app-cache
   - [ ] get-cache-info

2. **Progress events work:**
   - Download progress callbacks fire correctly
   - Main process sends to correct window

3. **Error handling preserved:**
   - All error paths return expected format
   - No unhandled rejections

### 5.2 Integration Points

- `main/index.ts` imports handlers
- Store dynamic import works
- Preload exposes correct API
- Renderer calls work unchanged

---

## 6. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Circular import with store | Medium | High | Keep dynamic import in store.handler.ts |
| Missing handler registration | Medium | High | Add verification function in handlers/index.ts |
| Channel name typos | Low | High | Use IPC_CHANNELS constants |
| Progress callback broken | Medium | High | Test download flow end-to-end |
| Error format mismatch | Medium | Medium | Define explicit format per handler in plan |

---

## 7. Pre-existing Assets (Phase 1)

These assets are already available and should be reused:

### 7.1 Error Classes (`src/errors/`)

```typescript
// Already implemented
export { AppError } from './AppError'
export { IpcError } from './IpcError'
export { StoreError } from './StoreError'
export { NetworkError } from './NetworkError'
export { ErrorCodes } from './types'
```

### 7.2 IPC Types (`src/shared/types/ipc.ts`)

```typescript
// Already implemented
export const IPC_CHANNELS = { ... } as const
export interface IpcResponse<T> { ... }
export interface IpcErrorInfo { ... }
// Plus all channel-specific request/response types
```

---

## 8. Recommendations for Planning

### 8.1 Plan Structure

Create plans in this order:

1. **IPC-01: base.ts** - Creates foundation for all other handlers
2. **IPC-02~08: Handler files** - Can be parallelized after base.ts
3. **IPC-09: Error wrapper** - Applied to all handlers
4. **IPC-10: Preload update** - Depends on all handlers being split

### 8.2 Per-Handler Plan Template

For each handler file, document:

1. Channels handled
2. Import dependencies
3. Exported functions
4. Error handling pattern
5. Response format (standard vs. exception)

### 8.3 Critical Path

```
base.ts → file.handler.ts → download.handler.ts → (parallel others) → handlers/index.ts → preload update
```

### 8.4 Backward Compatibility Checklist

For each handler, verify:

- [ ] Channel name unchanged
- [ ] Request parameters unchanged
- [ ] Response structure unchanged
- [ ] Error format unchanged (or consistently updated)

---

## 9. Questions for Planner

1. **Store handler location:** Should `store.handler.ts` include the store import, or should we create a separate `store-client.ts` in a services layer? (Current: dynamic import from main/index)

2. **Error wrapper scope:** Should the error wrapper be applied to ALL handlers, or only those that currently have inconsistent error formats? (Some handlers like `select-folder` return `null` on cancel - should this become `{ success: true, data: null }`?)

3. **Logging depth:** Should we log all IPC calls, or only errors? (Could impact performance with many calls)

4. **Channel validation timing:** Should validation happen at preload (throw error) or silently fail? (Current preload pattern throws for send/receive)

---

## Appendix A: Full Handler List with Signatures

| Channel | Handler Signature | Return Type |
|---------|-------------------|-------------|
| select-folder | `() => Promise<string \| null>` | `string \| null` |
| read-directory | `(dirPath: string) => Promise<...>` | `{ error, files }` |
| delete-file | `(filePath: string) => Promise<...>` | `{ success, error }` |
| open-folder | `(folderPath: string) => Promise<...>` | `{ success, error }` |
| download-wallpaper | `(params) => Promise<...>` | `{ success, filePath, error }` |
| start-download-task | `(params) => Promise<...>` | `{ success, filePath, error }` |
| set-wallpaper | `(imagePath: string) => Promise<...>` | `{ success, error }` |
| save-settings | `(settings: any) => Promise<...>` | `{ success, error }` |
| load-settings | `() => Promise<...>` | `{ success, settings, error }` |
| wallhaven-api-request | `(params) => Promise<...>` | `{ success, data, error, status }` |
| window-minimize | `() => Promise<void>` | `void` |
| window-maximize | `() => Promise<void>` | `void` |
| window-close | `() => Promise<void>` | `void` |
| window-is-maximized | `() => Promise<boolean>` | `boolean` |
| store-get | `(key: string) => Promise<...>` | `{ success, value, error }` |
| store-set | `(params) => Promise<...>` | `{ success, error }` |
| store-delete | `(key: string) => Promise<...>` | `{ success, error }` |
| store-clear | `() => Promise<...>` | `{ success, error }` |
| clear-app-cache | `(downloadPath?) => Promise<...>` | `{ success, thumbnailsDeleted, tempFilesDeleted, errors }` |
| get-cache-info | `(downloadPath?) => Promise<...>` | `{ success, info, error }` |

---

## Appendix B: File Size Estimates After Split

| File | Estimated Lines |
|------|-----------------|
| base.ts | ~150 (utils + types + logger) |
| file.handler.ts | ~120 |
| download.handler.ts | ~220 |
| settings.handler.ts | ~50 |
| wallpaper.handler.ts | ~45 |
| window.handler.ts | ~50 |
| cache.handler.ts | ~100 |
| api.handler.ts | ~100 |
| store.handler.ts | ~70 |
| handlers/index.ts | ~40 |
| **Total** | ~945 (vs 866 before) |

The increase is due to:
- Import statements in each file
- JSDoc comments for exported functions
- More explicit type annotations

---

*Research completed: 2026-04-26*
