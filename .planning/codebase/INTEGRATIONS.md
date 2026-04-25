# Integrations

## External APIs

### Wallhaven API

#### Base URL
- **Production**: `https://wallhaven.cc/api/v1`
- **Development Proxy**: `/api` (proxied via Vite dev server)

#### Endpoints Used

| Endpoint | Method | Purpose | File Reference |
|----------|--------|---------|----------------|
| `/search` | GET | Search wallpapers with filters | `src/services/wallpaperApi.ts:201-243` |
| `/w/{id}` | GET | Get single wallpaper details | `src/services/wallpaperApi.ts:250-276` |

#### Authentication
- **Method**: API Key via HTTP Header
- **Header Name**: `X-API-Key`
- **Required For**: NSFW content access
- **Configuration**: Stored in `AppSettings.apiKey` via Pinia store

#### API Key Management
```typescript
// src/services/wallpaperApi.ts:124-136
apiClient.interceptors.request.use((config) => {
  const wallpaperStore = useWallpaperStore()
  if (wallpaperStore.settings.apiKey) {
    config.headers['X-API-Key'] = wallpaperStore.settings.apiKey
  }
  return config
})
```

#### Data Models

**Search Response** (from `src/types/index.ts`):
```typescript
interface WallpaperMeta {
  current_page: number
  last_page: number
  per_page: number
  total: number
  query?: string | WallpaperQuery
  seed?: string | null
}

interface WallpaperItem {
  id: string
  url: string
  short_url: string
  views: number
  favorites: number
  source: string
  purity: 'sfw' | 'sketchy' | 'nsfw'
  category: 'general' | 'anime' | 'people'
  dimension_x: number
  dimension_y: number
  resolution: string
  ratio: string
  file_size: number
  file_type: string
  created_at: string
  colors: string[]
  path: string
  thumbs: WallpaperThumb
}
```

**Search Parameters** (from `src/types/index.ts`):
```typescript
interface GetParams {
  q?: string              // Search query
  ai_art_filter?: number  // AI art filter (0 or 1)
  categories?: string     // Category filter (e.g., "111")
  purity?: string         // Content purity filter
  sorting?: string        // Sort method
  topRange?: string       // Time range for top sorting
  order?: string          // Sort order (desc/asc)
  colors?: string | null  // Color filter
  ratios?: string | null  // Aspect ratio filter
  atleast?: string | null // Minimum resolution
  resolutions?: string | null // Exact resolution
  page: number            // Page number
}
```

#### Request Flow

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Vue Component  │────▶│  wallpaperApi   │────▶│  Wallhaven API  │
│                 │     │  Service        │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ Production: Electron│
                    │ IPC Proxy           │
                    │ Development: Vite   │
                    │ Dev Server Proxy    │
                    └─────────────────────┘
```

#### Caching Strategy
- **Type**: In-memory cache (Map-based)
- **TTL**: 5 minutes
- **Max Size**: 50 entries
- **File**: `src/services/wallpaperApi.ts:21-68`

---

## Electron IPC Channels

### Renderer → Main Channels

| Channel | Handler File | Purpose | Parameters |
|---------|--------------|---------|------------|
| `select-folder` | `handlers.ts:14-25` | Open folder selection dialog | None |
| `read-directory` | `handlers.ts:30-83` | Read directory contents with thumbnails | `dirPath: string` |
| `delete-file` | `handlers.ts:221-233` | Delete a file | `filePath: string` |
| `open-folder` | `handlers.ts:238-246` | Open folder in system file manager | `folderPath: string` |
| `download-wallpaper` | `handlers.ts:251-307` | Download wallpaper file | `{ url, filename, saveDir }` |
| `start-download-task` | `handlers.ts:385-541` | Start download with progress tracking | `{ taskId, url, filename, saveDir }` |
| `set-wallpaper` | `handlers.ts:313-340` | Set desktop wallpaper | `imagePath: string` |
| `save-settings` | `handlers.ts:345-357` | Save app settings to disk | `settings: any` |
| `load-settings` | `handlers.ts:362-380` | Load app settings from disk | None |
| `wallhaven-api-request` | `handlers.ts:547-633` | Proxy Wallhaven API requests | `{ endpoint, params?, apiKey? }` |
| `window-minimize` | `handlers.ts:638-643` | Minimize window | None |
| `window-maximize` | `handlers.ts:648-657` | Toggle maximize window | None |
| `window-close` | `handlers.ts:662-667` | Close window | None |
| `window-is-maximized` | `handlers.ts:672-675` | Check if window is maximized | None |
| `store-get` | `handlers.ts:680-689` | Get value from electron-store | `key: string` |
| `store-set` | `handlers.ts:694-703` | Set value in electron-store | `{ key, value }` |
| `store-delete` | `handlers.ts:708-718` | Delete value from electron-store | `key: string` |
| `store-clear` | `handlers.ts:723-732` | Clear all electron-store data | None |
| `clear-app-cache` | `handlers.ts:738-818` | Clear app cache (thumbnails, temp files) | `downloadPath?: string` |
| `get-cache-info` | `handlers.ts:824-866` | Get cache statistics | `downloadPath?: string` |

### Main → Renderer Channels

| Channel | Purpose | Data Structure |
|---------|---------|----------------|
| `download-progress` | Send download progress updates | `{ taskId, progress, offset, speed, state, filePath?, totalSize?, error? }` |

### IPC Communication Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                        Renderer Process                           │
│  ┌─────────────┐    ┌────────────────┐    ┌──────────────────┐   │
│  │ Vue Store   │───▶│ window.        │───▶│ IPC Renderer     │   │
│  │ (Pinia)     │    │ electronAPI    │    │ (preload)        │   │
│  └─────────────┘    └────────────────┘    └──────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
                                    │
                                    │ ipcRenderer.invoke()
                                    │ ipcRenderer.on()
                                    ▼
┌──────────────────────────────────────────────────────────────────┐
│                        Main Process                               │
│  ┌─────────────────┐    ┌────────────────┐    ┌──────────────┐   │
│  │ IPC Main        │───▶│ IPC Handlers   │───▶│ Node.js APIs │   │
│  │                 │    │ (handlers.ts)  │    │ (fs, path,   │   │
│  │                 │    │                │    │  axios, etc) │   │
│  └─────────────────┘    └────────────────┘    └──────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

---

## Native Integrations

### Desktop Wallpaper

**Package**: `wallpaper` v7.3.1

**File Reference**: `electron/main/ipc/handlers.ts:313-340`

**Capabilities**:
- Set wallpaper from local file path
- Cross-platform support (Windows, macOS, Linux)

**Implementation**:
```typescript
// handlers.ts:313-340
ipcMain.handle('set-wallpaper', async (_event, imagePath: string) => {
  const wallpaperModule = await import('wallpaper')
  const setWallpaper = wallpaperModule.setWallpaper
  await setWallpaper(imagePath)
  return { success: true, error: null }
})
```

**Fit Modes** (configured in settings, applied by wallpaper package):
- `fill` - Fill screen, may crop
- `fit` - Fit within screen, may have bars
- `stretch` - Stretch to fill, may distort
- `tile` - Tile/repeat
- `center` - Center at original size
- `span` - Span across multiple monitors

### File System Operations

**File Reference**: `electron/main/ipc/handlers.ts`

#### Download Management
- **Download Directory**: User-configurable via settings
- **File Naming**: `wallhaven-{id}.{ext}`
- **Duplicate Handling**: Auto-append sequence number (`_1`, `_2`, etc.)
- **Temp Files**: `.download` extension during download

#### Thumbnail Generation
**Package**: `sharp` v0.34.5

**File Reference**: `handlers.ts:179-216`

```typescript
// Thumbnail generation process
await sharp(imagePath)
  .resize(300, 200, {
    fit: 'cover',
    position: 'center',
  })
  .jpeg({ quality: 80 })
  .toFile(thumbnailFilePath)
```

**Thumbnail Storage**: `{downloadDir}/.thumbnails/{filename}_thumb.jpg`

#### Directory Operations
- **Read Directory**: Returns files with metadata (name, path, size, dimensions, thumbnail path)
- **Delete File**: Remove file from filesystem
- **Open Folder**: Open in system file manager via `shell.openPath()`

### Settings Persistence

**Storage Solution**: `electron-store` v11.0.2

**File Reference**: `electron/main/index.ts:14-24`

**Store Configuration**:
```typescript
const store = new Store({
  name: 'wallhaven-data',
  defaults: {
    wallpaperQueryParams: null,
    appSettings: null,
    downloadFinishedList: []
  }
})
```

**Settings File Location**: `{userData}/wallhaven-data.json`

### Custom Protocol

**Protocol**: `wallhaven://`

**File Reference**: `electron/main/index.ts:36-78`

**Purpose**: Load local image files in renderer process

**Implementation**:
```typescript
protocol.handle('wallhaven', (request) => {
  const filePath = decodeURIComponent(request.url.replace(/^wallhaven:\/\//, ''))
  const fileContent = readFileSync(filePath)
  const mimeType = mimeTypes[extname(filePath).toLowerCase()]
  return new Response(fileContent, {
    status: 200,
    headers: { 'Content-Type': mimeType }
  })
})
```

**Usage**: `wallhaven://{encodedFilePath}` for local image display

### System Features

#### Window Controls
- **Minimize**: Custom frameless window minimize
- **Maximize/Restore**: Toggle maximize state
- **Close**: Close application
- **Maximize Check**: Query current maximize state

**Window Configuration**:
```typescript
// electron/main/index.ts:95-108
new BrowserWindow({
  width: 1900,
  height: 800,
  frame: false,        // Custom title bar
  autoHideMenuBar: true,
  webPreferences: {
    sandbox: false,
    contextIsolation: true,
    nodeIntegration: false,
  }
})
```

#### Shell Integration
- Open URLs in default browser: `shell.openExternal()`
- Open folders in file manager: `shell.openPath()`

---

## Data Flow Diagrams

### Wallpaper Search Flow

```
┌────────────────┐     ┌────────────────┐     ┌────────────────┐
│  SearchBar     │────▶│  useWallpaper  │────▶│  wallpaperApi  │
│  Component     │     │  Store         │     │  .search()     │
└────────────────┘     └────────────────┘     └────────────────┘
                                                       │
       ┌───────────────────────────────────────────────┘
       ▼
┌────────────────┐     ┌────────────────┐     ┌────────────────┐
│  Environment   │────▶│  Development:  │     │  Production:   │
│  Check         │     │  Vite Proxy    │     │  Electron IPC  │
└────────────────┘     └────────────────┘     └────────────────┘
                                                       │
       ┌───────────────────────────────────────────────┘
       ▼
┌────────────────┐     ┌────────────────┐     ┌────────────────┐
│  Wallhaven API │────▶│  Response      │────▶│  Store Update  │
│  Server        │     │  (with cache)  │     │  (Pinia)       │
└────────────────┘     └────────────────┘     └────────────────┘
                                                       │
       ┌───────────────────────────────────────────────┘
       ▼
┌────────────────┐
│  WallpaperList │
│  Component     │
└────────────────┘
```

### Download Flow

```
┌────────────────┐     ┌────────────────┐     ┌────────────────┐
│  User Action   │────▶│  downloadStore │────▶│  Add Task      │
│  (Download)    │     │  .addTask()    │     │  to Queue      │
└────────────────┘     └────────────────┘     └────────────────┘
                                                       │
       ┌───────────────────────────────────────────────┘
       ▼
┌────────────────┐     ┌────────────────┐     ┌────────────────┐
│  startDownload │────▶│  Electron IPC  │────▶│  Main Process  │
│  Task()        │     │  invoke()      │     │  Download      │
└────────────────┘     └────────────────┘     └────────────────┘
                                                       │
       ┌───────────────────────────────────────────────┘
       ▼
┌────────────────┐     ┌────────────────┐     ┌────────────────┐
│  axios stream  │────▶│  Progress      │────▶│  IPC Send      │
│  download      │     │  calculation   │     │  to Renderer   │
└────────────────┘     └────────────────┘     └────────────────┘
                                                       │
       ┌───────────────────────────────────────────────┘
       ▼
┌────────────────┐     ┌────────────────┐     ┌────────────────┐
│  Renderer      │────▶│  downloadStore │────▶│  UI Update     │
│  Callback      │     │  .updateProg() │     │  (Progress)    │
└────────────────┘     └────────────────┘     └────────────────┘
                                                       │
       ┌───────────────────────────────────────────────┘
       ▼
┌────────────────┐     ┌────────────────┐
│  Download      │────▶│  Move to       │
│  Complete      │     │  finishedList  │
└────────────────┘     └────────────────┘
```

### Set Wallpaper Flow

```
┌────────────────┐     ┌────────────────┐     ┌────────────────┐
│  User Action   │────▶│  downloadFile  │────▶│  Electron IPC  │
│  (Set BG)      │     │  (if needed)   │     │  download      │
└────────────────┘     └────────────────┘     └────────────────┘
                                                       │
       ┌───────────────────────────────────────────────┘
       ▼
┌────────────────┐     ┌────────────────┐     ┌────────────────┐
│  Electron IPC  │────▶│  wallpaper     │────▶│  Desktop       │
│  setWallpaper  │     │  package       │     │  Updated       │
└────────────────┘     └────────────────┘     └────────────────┘
```

### Settings Persistence Flow

```
┌────────────────┐     ┌────────────────┐     ┌────────────────┐
│  Settings Page │────▶│  wallpaperStore│────▶│  storeSet()    │
│  UI Changes    │     │  .updateSett() │     │  IPC           │
└────────────────┘     └────────────────┘     └────────────────┘
                                                       │
       ┌───────────────────────────────────────────────┘
       ▼
┌────────────────┐     ┌────────────────┐
│  Main Process  │────▶│  electron-store│
│  store-set     │     │  JSON file     │
└────────────────┘     └────────────────┘
```

---

## Security Considerations

### Context Isolation
- **Enabled**: `contextIsolation: true`
- **Node Integration**: Disabled (`nodeIntegration: false`)
- **Sandbox**: Disabled for native module support (`sandbox: false`)

### Preload Script Security
- Uses `contextBridge.exposeInMainWorld()` for safe API exposure
- Channel validation for generic IPC communication

### API Key Storage
- Stored locally in `electron-store`
- Never transmitted to third parties
- Only used for Wallhaven API authentication

---

## Error Handling

### API Error Handling
- **Retry Logic**: 2 retries with exponential backoff (1s, 2s)
- **Retryable Errors**: `ECONNRESET`, `ETIMEDOUT`, `ECONNABORTED`, TLS errors
- **Timeout**: 15 seconds for API requests

### Download Error Handling
- Automatic temp file cleanup on failure
- Progress state reset on error
- Error propagation to renderer for UI feedback

### Cache Management
- Thumbnail regeneration on access if missing
- Temp file cleanup (`.download` files)
- Electron session cache clearing
