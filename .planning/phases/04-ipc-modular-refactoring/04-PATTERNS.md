# Phase 4: IPC 模块化重构 - Pattern Mapping

**Created:** 2026-04-26
**Status:** Complete

---

## Overview

This document maps the patterns for creating and modifying files in Phase 4. For each file, we identify:
1. Role and data flow
2. Closest existing analog in the codebase
3. Concrete code excerpts to follow

---

## Files to Create

### 1. `electron/main/ipc/handlers/base.ts`

**Role:** Shared utilities, types, and error handling wrapper for all handlers.

**Data Flow:**
- Imported by all other handler files
- Provides common utilities (getImageDimensions, generateThumbnail, streamPipeline)
- Provides logging function and error wrapper

**Closest Analog:** Current `handlers.ts` lines 9-170 (utility functions) + Phase 1 `src/errors/IpcError.ts`

**Key Code Excerpts:**

```typescript
// FROM handlers.ts:1-9 (imports)
import { ipcMain, dialog, shell, BrowserWindow } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import axios from 'axios'
import { pipeline } from 'stream'
import { promisify } from 'util'
import sharp from 'sharp'

const streamPipeline = promisify(pipeline)

// FROM handlers.ts:88-170 (getImageDimensions - KEEP EXACTLY AS IS)
function getImageDimensions(filePath: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const buffer = Buffer.alloc(24)
    const fd = fs.openSync(filePath, 'r')

    fs.read(fd, buffer, 0, 24, 0, (err, bytesRead) => {
      fs.closeSync(fd)

      if (err || bytesRead < 24) {
        resolve({ width: 0, height: 0 })
        return
      }

      try {
        let width = 0
        let height = 0

        // JPEG, PNG, GIF, WebP, BMP parsing logic...
        // (keep full implementation from lines 106-168)
      } catch (e) {
        resolve({ width: 0, height: 0 })
      }
    })
  })
}

// FROM handlers.ts:179-216 (generateThumbnail - KEEP EXACTLY AS IS)
async function generateThumbnail(
  imagePath: string,
  dirPath: string,
  fileName: string,
): Promise<string> {
  try {
    const cacheDir = path.join(dirPath, '.thumbnails')
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true })
    }
    // ... rest of implementation
  } catch (error) {
    return ''
  }
}

// NEW: Log handler utility (from CONTEXT.md D-09)
export function logHandler(
  handlerName: string,
  message: string,
  level: 'info' | 'error' | 'warn' = 'info'
): void {
  const timestamp = new Date().toISOString()
  console[level](`[${timestamp}][${handlerName}] ${message}`)
}

// NEW: Error wrapper (from CONTEXT.md)
export function wrapHandler<T>(
  handlerName: string,
  handler: (...args: any[]) => Promise<T>
): (...args: any[]) => Promise<IpcResponse<T>> {
  return async (...args) => {
    try {
      const data = await handler(...args)
      return { success: true, data }
    } catch (error: any) {
      logHandler(handlerName, `Error: ${error.message}`, 'error')
      return {
        success: false,
        error: {
          code: error instanceof IpcError ? error.code : 'INTERNAL_ERROR',
          message: error.message
        }
      }
    }
  }
}
```

**Import from Phase 1:**
```typescript
// FROM src/errors/IpcError.ts:25-49
export class IpcError extends AppError {
  readonly channel?: string

  constructor(message: string, options?: IpcErrorOptions) {
    super(message, {
      code: options?.code ?? 'IPC_ERROR',
      context: options?.context,
      cause: options?.cause,
    })
    this.name = 'IpcError'
    this.channel = options?.channel
  }
}
```

---

### 2. `electron/main/ipc/handlers/file.handler.ts`

**Role:** File operations handler (select-folder, read-directory, delete-file, open-folder)

**Data Flow:**
- Main process handles IPC invoke calls
- Returns file/directory information to renderer

**Closest Analog:** Current `handlers.ts` lines 14-83, 221-246

**Key Code Excerpts:**

```typescript
// FROM handlers.ts:14-25 (select-folder)
ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory'],
    title: '选择下载目录',
  })

  if (result.canceled || result.filePaths.length === 0) {
    return null
  }

  return result.filePaths[0]
})

// FROM handlers.ts:30-83 (read-directory)
ipcMain.handle('read-directory', async (_event, dirPath: string) => {
  try {
    if (!fs.existsSync(dirPath)) {
      return { error: '目录不存在', files: [] }
    }

    const files = fs.readdirSync(dirPath)
    const imageFiles = files.filter((file) => {
      const ext = path.extname(file).toLowerCase()
      return ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'].includes(ext)
    })

    const fileDetails = await Promise.all(
      imageFiles.map(async (file) => {
        // ... uses getImageDimensions and generateThumbnail from base.ts
      }),
    )

    return { error: null, files: fileDetails }
  } catch (error: any) {
    console.error('读取目录失败:', error)
    return { error: error.message, files: [] }
  }
})

// FROM handlers.ts:221-233 (delete-file)
ipcMain.handle('delete-file', async (_event, filePath: string) => {
  try {
    if (!fs.existsSync(filePath)) {
      return { success: false, error: '文件不存在' }
    }

    fs.unlinkSync(filePath)
    return { success: true, error: null }
  } catch (error: any) {
    console.error('删除文件失败:', error)
    return { success: false, error: error.message }
  }
})

// FROM handlers.ts:238-246 (open-folder)
ipcMain.handle('open-folder', async (_event, folderPath: string) => {
  try {
    await shell.openPath(folderPath)
    return { success: true }
  } catch (error: any) {
    console.error('打开文件夹失败:', error)
    return { success: false, error: error.message }
  }
})
```

---

### 3. `electron/main/ipc/handlers/download.handler.ts`

**Role:** Download management (download-wallpaper, start-download-task)

**Data Flow:**
- Main process downloads files
- Sends progress events via `webContents.send('download-progress', ...)`
- Returns file path on completion

**Closest Analog:** Current `handlers.ts` lines 251-307, 385-541

**Key Code Excerpts:**

```typescript
// FROM handlers.ts:251-307 (download-wallpaper)
ipcMain.handle(
  'download-wallpaper',
  async (
    _event,
    { url, filename, saveDir }: { url: string; filename: string; saveDir: string },
  ) => {
    try {
      if (!fs.existsSync(saveDir)) {
        fs.mkdirSync(saveDir, { recursive: true })
      }

      const filePath = path.join(saveDir, filename)

      // Handle duplicate files with counter
      let finalPath = filePath
      let counter = 1
      while (fs.existsSync(finalPath)) {
        const ext = path.extname(filename)
        const nameWithoutExt = filename.replace(ext, '')
        finalPath = path.join(saveDir, `${nameWithoutExt}_${counter}${ext}`)
        counter++
      }

      const response = await axios({
        method: 'GET',
        url: url,
        responseType: 'stream',
        timeout: 60000,
      })

      await streamPipeline(response.data, fs.createWriteStream(finalPath))

      return { success: true, filePath: finalPath, error: null }
    } catch (error: any) {
      console.error('下载壁纸失败:', error)
      return { success: false, filePath: null, error: error.message }
    }
  },
)

// FROM handlers.ts:385-541 (start-download-task) - CRITICAL: Progress callback pattern
ipcMain.handle(
  'start-download-task',
  async (_event, { taskId, url, filename, saveDir }) => {
    try {
      // ... file exists check ...

      const response = await axios({
        method: 'GET',
        url,
        responseType: 'stream',
        timeout: 60000,
      })

      const totalSize = parseInt(String(response.headers['content-length'] || '0'), 10)
      let downloadedSize = 0
      let lastTime = Date.now()
      let lastSize = 0

      response.data.on('data', (chunk: Buffer) => {
        downloadedSize += chunk.length

        const now = Date.now()
        if (now - lastTime >= 100) {
          const speed = (downloadedSize - lastSize) / ((now - lastTime) / 1000)
          const progress = totalSize > 0 ? (downloadedSize / totalSize) * 100 : 0

          // CRITICAL: Progress event pattern
          const { BrowserWindow } = require('electron')
          const windows = BrowserWindow.getAllWindows()
          if (windows.length > 0) {
            windows[0].webContents.send('download-progress', {
              taskId,
              progress: Math.min(progress, 99),
              offset: downloadedSize,
              speed,
              state: 'downloading',
              totalSize,
            })
          }

          lastTime = now
          lastSize = downloadedSize
        }
      })

      await streamPipeline(response.data, writer)
      // ... completion handling ...
    } catch (error: any) {
      // ... error handling and notify renderer ...
    }
  },
)
```

---

### 4. `electron/main/ipc/handlers/settings.handler.ts`

**Role:** Settings storage (save-settings, load-settings)

**Data Flow:**
- Saves/loads JSON settings file to userData directory
- Returns settings object to renderer

**Closest Analog:** Current `handlers.ts` lines 345-380

**Key Code Excerpts:**

```typescript
// FROM handlers.ts:345-357 (save-settings)
ipcMain.handle('save-settings', async (_event, settings: any) => {
  try {
    const { app } = await import('electron')
    const userDataPath = app.getPath('userData')
    const settingsPath = path.join(userDataPath, 'settings.json')

    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2))
    return { success: true }
  } catch (error: any) {
    console.error('保存设置失败:', error)
    return { success: false, error: error.message }
  }
})

// FROM handlers.ts:362-380 (load-settings)
ipcMain.handle('load-settings', async () => {
  try {
    const { app } = await import('electron')
    const userDataPath = app.getPath('userData')
    const settingsPath = path.join(userDataPath, 'settings.json')

    if (!fs.existsSync(settingsPath)) {
      return { success: true, settings: null }
    }

    const data = fs.readFileSync(settingsPath, 'utf-8')
    const settings = JSON.parse(data)

    return { success: true, settings }
  } catch (error: any) {
    console.error('加载设置失败:', error)
    return { success: false, error: error.message, settings: null }
  }
})
```

---

### 5. `electron/main/ipc/handlers/wallpaper.handler.ts`

**Role:** Wallpaper setting (set-wallpaper)

**Data Flow:**
- Main process sets desktop wallpaper using `wallpaper` package
- Dynamic import of wallpaper module

**Closest Analog:** Current `handlers.ts` lines 313-340

**Key Code Excerpts:**

```typescript
// FROM handlers.ts:313-340 (set-wallpaper)
ipcMain.handle('set-wallpaper', async (_event, imagePath: string) => {
  try {
    if (!fs.existsSync(imagePath)) {
      return { success: false, error: '图片文件不存在' }
    }

    // Dynamic import pattern for wallpaper package
    let setWallpaper: any
    try {
      const wallpaperModule = await import('wallpaper')
      setWallpaper = (wallpaperModule as any).setWallpaper
      if (!setWallpaper) {
        throw new Error('wallpaper 模块未正确导出 setWallpaper 函数')
      }
    } catch (importError: any) {
      console.error('导入 wallpaper 模块失败:', importError.message)
      return { success: false, error: `wallpaper 模块加载失败: ${importError.message}` }
    }

    await setWallpaper(imagePath)

    return { success: true, error: null }
  } catch (error: any) {
    console.error('设置壁纸失败:', error)
    return { success: false, error: error.message }
  }
})
```

---

### 6. `electron/main/ipc/handlers/window.handler.ts`

**Role:** Window control (window-minimize, window-maximize, window-close, window-is-maximized)

**Data Flow:**
- Main process controls BrowserWindow
- Uses `BrowserWindow.fromWebContents(event.sender)` to get window

**Closest Analog:** Current `handlers.ts` lines 638-675

**Key Code Excerpts:**

```typescript
// FROM handlers.ts:638-675 (window handlers)
ipcMain.handle('window-minimize', async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  if (win) {
    win.minimize()
  }
})

ipcMain.handle('window-maximize', async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  if (win) {
    if (win.isMaximized()) {
      win.unmaximize()
    } else {
      win.maximize()
    }
  }
})

ipcMain.handle('window-close', async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  if (win) {
    win.close()
  }
})

ipcMain.handle('window-is-maximized', async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  return win ? win.isMaximized() : false
})
```

**Note:** Window handlers return `void` or `boolean`, not `IpcResponse<T>`. Keep this pattern for backward compatibility.

---

### 7. `electron/main/ipc/handlers/cache.handler.ts`

**Role:** Cache management (clear-app-cache, get-cache-info)

**Data Flow:**
- Clears thumbnails, temp files, renderer cache
- Returns statistics about cleared items

**Closest Analog:** Current `handlers.ts` lines 738-866

**Key Code Excerpts:**

```typescript
// FROM handlers.ts:738-818 (clear-app-cache)
ipcMain.handle('clear-app-cache', async (_event, downloadPath?: string) => {
  try {
    const results = {
      thumbnailsDeleted: 0,
      tempFilesDeleted: 0,
      errors: [] as string[],
    }

    if (downloadPath && fs.existsSync(downloadPath)) {
      // Clear thumbnail cache
      const thumbnailDir = path.join(downloadPath, '.thumbnails')
      if (fs.existsSync(thumbnailDir)) {
        // ... delete thumbnails ...
      }

      // Clear .download temp files
      const allFiles = fs.readdirSync(downloadPath)
      allFiles.forEach(file => {
        if (file.endsWith('.download')) {
          // ... delete temp files ...
        }
      })
    }

    // Clear Electron renderer cache
    const { BrowserWindow } = await import('electron')
    const windows = BrowserWindow.getAllWindows()
    for (const win of windows) {
      await win.webContents.session.clearCache()
      await win.webContents.session.clearStorageData()
    }

    return { success: true, ...results }
  } catch (error: any) {
    return { success: false, error: error.message, ... }
  }
})

// FROM handlers.ts:824-866 (get-cache-info)
ipcMain.handle('get-cache-info', async (_event, downloadPath?: string) => {
  try {
    const info = { thumbnailsCount: 0, tempFilesCount: 0 }

    if (downloadPath && fs.existsSync(downloadPath)) {
      // Count thumbnails
      const thumbnailDir = path.join(downloadPath, '.thumbnails')
      if (fs.existsSync(thumbnailDir)) {
        const files = fs.readdirSync(thumbnailDir)
        info.thumbnailsCount = files.length
      }

      // Count temp files
      const allFiles = fs.readdirSync(downloadPath)
      info.tempFilesCount = allFiles.filter(file => file.endsWith('.download')).length
    }

    return { success: true, info }
  } catch (error: any) {
    return { success: false, error: error.message, info: { thumbnailsCount: 0, tempFilesCount: 0 } }
  }
})
```

---

### 8. `electron/main/ipc/handlers/api.handler.ts`

**Role:** API proxy (wallhaven-api-request)

**Data Flow:**
- Main process proxies requests to wallhaven.cc API
- Implements retry logic with exponential backoff
- Handles TLS connection issues

**Closest Analog:** Current `handlers.ts` lines 547-633

**Key Code Excerpts:**

```typescript
// FROM handlers.ts:547-633 (wallhaven-api-request)
ipcMain.handle(
  'wallhaven-api-request',
  async (_event, { endpoint, params, apiKey }) => {
    const maxRetries = 2
    let lastError: any = null

    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      try {
        console.log(`[Wallhaven API Proxy] Attempt ${attempt}/${maxRetries + 1}: ${endpoint}`)

        const url = `https://wallhaven.cc/api/v1${endpoint}`

        const response = await axios.get(url, {
          params: params,
          headers: {
            'User-Agent': 'Wallhaven-Desktop-App/1.0',
            ...(apiKey ? { 'X-API-Key': apiKey } : {}),
          },
          timeout: 15000,
          httpsAgent: new (await import('https')).Agent({
            keepAlive: true,
            keepAliveMsecs: 30000,
            maxSockets: 10,
            maxFreeSockets: 5,
            scheduling: 'fifo',
          }),
        })

        return { success: true, data: response.data }
      } catch (error: any) {
        lastError = error

        // Retry logic
        const isRetryableError =
          error.code === 'ECONNRESET' ||
          error.code === 'ETIMEDOUT' ||
          error.code === 'ECONNABORTED' ||
          error.message.includes('socket disconnected') ||
          error.message.includes('TLS') ||
          !error.response

        if (attempt <= maxRetries && isRetryableError) {
          const delay = Math.pow(2, attempt) * 500
          await new Promise(resolve => setTimeout(resolve, delay))
          continue
        }

        break
      }
    }

    return {
      success: false,
      error: lastError?.message || 'Unknown error',
      status: lastError?.response?.status,
      data: null,
    }
  },
)
```

**Security Note:** Filter API key from logs (from CONTEXT.md D-09):
```typescript
// When logging, filter sensitive data
const { apiKey, ...safeParams } = params
logHandler('wallhaven-api-request', `Request to ${endpoint}`, 'info')
```

---

### 9. `electron/main/ipc/handlers/store.handler.ts`

**Role:** Electron Store operations (store-get, store-set, store-delete, store-clear)

**Data Flow:**
- Main process accesses electron-store
- **CRITICAL:** Uses dynamic import from `../../index` to avoid circular dependency

**Closest Analog:** Current `handlers.ts` lines 680-732

**Key Code Excerpts:**

```typescript
// FROM handlers.ts:680-732 (store handlers) - MUST KEEP DYNAMIC IMPORT
ipcMain.handle('store-get', async (_event, key: string) => {
  try {
    // CRITICAL: Dynamic import to avoid circular dependency
    const { store } = await import('../../index')
    const value = store.get(key)
    return { success: true, value }
  } catch (error: any) {
    console.error('[Store] Get failed:', error)
    return { success: false, error: error.message, value: null }
  }
})

ipcMain.handle('store-set', async (_event, { key, value }: { key: string; value: any }) => {
  try {
    const { store } = await import('../../index')
    store.set(key, value)
    return { success: true }
  } catch (error: any) {
    console.error('[Store] Set failed:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('store-delete', async (_event, key: string) => {
  try {
    const { store } = await import('../../index')
    // @ts-ignore - electron-store runtime supports any string key
    store.delete(key)
    return { success: true }
  } catch (error: any) {
    console.error('[Store] Delete failed:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('store-clear', async () => {
  try {
    const { store } = await import('../../index')
    store.clear()
    return { success: true }
  } catch (error: any) {
    console.error('[Store] Clear failed:', error)
    return { success: false, error: error.message }
  }
})
```

---

### 10. `electron/main/ipc/handlers/index.ts`

**Role:** Registration entry point - imports all handlers and provides verification

**Data Flow:**
- Imported by `electron/main/index.ts`
- Side-effect imports register handlers with ipcMain

**Closest Analog:** `electron/main/index.ts` line 30 (`import './ipc/handlers'`)

**Pattern from CONTEXT.md:**

```typescript
// NEW FILE: electron/main/ipc/handlers/index.ts
import { ipcMain } from 'electron'
import './file.handler'
import './download.handler'
import './settings.handler'
import './wallpaper.handler'
import './window.handler'
import './cache.handler'
import './api.handler'
import './store.handler'

// All registered channels list (for verification)
export const REGISTERED_CHANNELS = [
  'select-folder',
  'read-directory',
  'delete-file',
  'open-folder',
  'download-wallpaper',
  'start-download-task',
  'set-wallpaper',
  'save-settings',
  'load-settings',
  'wallhaven-api-request',
  'window-minimize',
  'window-maximize',
  'window-close',
  'window-is-maximized',
  'store-get',
  'store-set',
  'store-delete',
  'store-clear',
  'clear-app-cache',
  'get-cache-info',
] as const

// Verification function
export function verifyHandlers(): void {
  const registered = new Set<string>()
  ipcMain.eventNames().forEach(name => {
    if (typeof name === 'string') registered.add(name)
  })

  REGISTERED_CHANNELS.forEach(channel => {
    if (!registered.has(channel)) {
      throw new Error(`Handler not registered: ${channel}`)
    }
  })

  console.log('[IPC] All handlers verified successfully')
}
```

---

### 11. `electron/preload/types.ts`

**Role:** Shared type definitions for preload and type-safe channel constants

**Data Flow:**
- Imported by `electron/preload/index.ts`
- Reuses `IPC_CHANNELS` from `src/shared/types/ipc.ts`

**Closest Analog:** `src/shared/types/ipc.ts` (Phase 1 created types)

**Key Pattern:**

```typescript
// NEW FILE: electron/preload/types.ts

// Re-export from Phase 1 types
export { IPC_CHANNELS } from '../../src/shared/types/ipc'

// Re-export all IPC types
export type {
  IpcResponse,
  IpcErrorInfo,
  ReadDirectoryResponse,
  DownloadWallpaperRequest,
  DownloadWallpaperResponse,
  StartDownloadTaskRequest,
  DownloadProgressData,
  // ... other types
} from '../../src/shared/types/ipc'

// Channel whitelist for validation
export const VALID_INVOKE_CHANNELS = Object.values(
  await import('../../src/shared/types/ipc').then(m => m.IPC_CHANNELS)
)
```

---

## Files to Modify

### 1. `electron/preload/index.ts`

**Modifications:**
1. Import `IPC_CHANNELS` from `./types.ts`
2. Replace string channel names with constants
3. Add channel validation for invoke calls

**Current Pattern (lines 89-92):**
```typescript
selectFolder: () => {
  console.log('[Preload] selectFolder called')
  return ipcRenderer.invoke('select-folder')
},
```

**Target Pattern:**
```typescript
import { IPC_CHANNELS, VALID_INVOKE_CHANNELS } from './types'

// Validation helper
function validateChannel(channel: string): boolean {
  return VALID_INVOKE_CHANNELS.includes(channel as any)
}

const electronAPI: ElectronAPI = {
  selectFolder: () => {
    console.log('[Preload] selectFolder called')
    const channel = IPC_CHANNELS.SELECT_FOLDER
    if (!validateChannel(channel)) {
      throw new Error(`Invalid IPC channel: ${channel}`)
    }
    return ipcRenderer.invoke(channel)
  },
  // ... other methods using IPC_CHANNELS constants
}
```

---

### 2. `electron/main/index.ts`

**Modifications:**
1. Replace `import './ipc/handlers'` with named import
2. Call `verifyHandlers()` after import

**Current Pattern (line 30):**
```typescript
import './ipc/handlers'
```

**Target Pattern:**
```typescript
import { verifyHandlers } from './ipc/handlers/index'

// After app.whenReady()...
app.whenReady().then(() => {
  // ... existing code ...

  // Verify all handlers are registered
  verifyHandlers()

  // ... rest of code ...
})
```

---

## Response Format Mapping

The following table shows which handlers use which response format:

| Handler | Current Format | Target Format | Notes |
|---------|---------------|---------------|-------|
| select-folder | `string \| null` | Keep as-is | Special case: null = canceled |
| read-directory | `{ error, files }` | Keep as-is | Already standardized |
| delete-file | `{ success, error }` | Keep as-is | Already standardized |
| open-folder | `{ success, error }` | Keep as-is | Already standardized |
| download-wallpaper | `{ success, filePath, error }` | Keep as-is | Already standardized |
| start-download-task | `{ success, filePath, error }` | Keep as-is | Already standardized |
| set-wallpaper | `{ success, error }` | Keep as-is | Already standardized |
| save-settings | `{ success, error }` | Keep as-is | Already standardized |
| load-settings | `{ success, settings, error }` | Keep as-is | Already standardized |
| wallhaven-api-request | `{ success, data, error, status }` | Keep as-is | Already standardized |
| window-minimize | `void` | Keep as-is | No response needed |
| window-maximize | `void` | Keep as-is | No response needed |
| window-close | `void` | Keep as-is | No response needed |
| window-is-maximized | `boolean` | Keep as-is | Simple return |
| store-get | `{ success, value, error }` | Keep as-is | Already standardized |
| store-set | `{ success, error }` | Keep as-is | Already standardized |
| store-delete | `{ success, error }` | Keep as-is | Already standardized |
| store-clear | `{ success, error }` | Keep as-is | Already standardized |
| clear-app-cache | `{ success, thumbnailsDeleted, tempFilesDeleted, errors }` | Keep as-is | Already standardized |
| get-cache-info | `{ success, info, error }` | Keep as-is | Already standardized |

**Decision:** Do NOT wrap handlers with `wrapHandler()`. Keep existing response formats for backward compatibility.

---

## Logging Pattern

Use the `logHandler` function from `base.ts`:

```typescript
import { logHandler } from './base'

// In handlers, replace:
console.error('读取目录失败:', error)

// With:
logHandler('read-directory', `Error: ${error.message}`, 'error')

// Success logging (optional):
logHandler('read-directory', `Read ${files.length} files from ${dirPath}`, 'info')
```

**Sensitive Data Filtering:**
```typescript
// In api.handler.ts, when logging:
const { apiKey, ...safeParams } = params
logHandler('wallhaven-api-request', `Request: ${endpoint} with params: ${JSON.stringify(safeParams)}`, 'info')
```

---

## Critical Implementation Notes

1. **Circular Dependency Prevention:**
   - `store.handler.ts` MUST use `await import('../../index')` for store
   - Never change to static import

2. **Progress Event Pattern:**
   - Download handlers send progress via `webContents.send('download-progress', ...)`
   - Must get window: `BrowserWindow.getAllWindows()[0].webContents`

3. **Window Handler Pattern:**
   - Use `BrowserWindow.fromWebContents(event.sender)` to get the correct window
   - This ensures multi-window support

4. **Channel Constants:**
   - Always use `IPC_CHANNELS` constants, never string literals
   - Import from `../../src/shared/types/ipc` in main process handlers

5. **Error Handling:**
   - Keep existing try-catch patterns
   - Use `IpcError` for new error cases if needed
   - Log errors with `logHandler()`

---

*Pattern mapping completed: 2026-04-26*
