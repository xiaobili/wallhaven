# Architecture

## Process Model

### Main Process
**Entry point:** `electron/main/index.ts`

**Responsibilities:**
- Application lifecycle management (create window, handle quit)
- Custom protocol registration (`wallhaven://` for local file access)
- Persistent storage via `electron-store`
- IPC handler registration and request processing
- Native OS integrations (file dialogs, wallpaper setting, shell operations)

**Initialization flow:**
1. Initialize `electron-store` with default data structure
2. Export store instance for use by IPC handlers
3. Import IPC handlers (side-effect import)
4. Register `wallhaven://` custom protocol for local image loading
5. Create BrowserWindow with preload script and security settings
6. Load renderer (dev URL or built files)

**IPC Handlers:** (`electron/main/ipc/handlers.ts`)

| Channel | Purpose |
|---------|---------|
| `select-folder` | Open folder selection dialog |
| `read-directory` | Read directory contents with thumbnails |
| `open-folder` | Open folder in system file manager |
| `delete-file` | Delete file from filesystem |
| `download-wallpaper` | Simple wallpaper download |
| `start-download-task` | Download with progress tracking |
| `set-wallpaper` | Set desktop wallpaper via `wallpaper` package |
| `save-settings` | Save app settings to JSON file |
| `load-settings` | Load app settings from JSON file |
| `wallhaven-api-request` | Proxy API requests (bypasses CORS in production) |
| `window-minimize` | Minimize window |
| `window-maximize` | Toggle maximize/restore |
| `window-close` | Close window |
| `window-is-maximized` | Check maximize state |
| `store-get` | Get value from electron-store |
| `store-set` | Set value in electron-store |
| `store-delete` | Delete key from electron-store |
| `store-clear` | Clear all electron-store data |
| `clear-app-cache` | Clear thumbnails and temp files |
| `get-cache-info` | Get cache statistics |

### Renderer Process
**Entry point:** `src/main.ts`

**Vue Application Setup:**
```typescript
const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.mount('#app')

// Async initialization after mount
initializeApp() // Loads settings, registers download progress listener
```

**Security Configuration:**
- `contextIsolation: true`
- `nodeIntegration: false`
- `sandbox: false` (required for certain Node.js operations)

### Preload Scripts
**Entry point:** `electron/preload/index.ts`

**Purpose:** Expose safe, controlled IPC bridge between renderer and main process

**Exposed API:** `window.electronAPI`

The preload script uses `contextBridge.exposeInMainWorld()` to expose a typed API object with the following categories:

1. **File System Operations:** `selectFolder`, `readDirectory`, `openFolder`, `deleteFile`
2. **Download Management:** `downloadWallpaper`, `startDownloadTask`, `onDownloadProgress`, `removeDownloadProgressListener`
3. **Wallpaper Control:** `setWallpaper`
4. **Settings:** `saveSettings`, `loadSettings`
5. **API Proxy:** `wallhavenApiRequest`
6. **Window Controls:** `minimizeWindow`, `maximizeWindow`, `closeWindow`, `isMaximized`
7. **Store Operations:** `storeGet`, `storeSet`, `storeDelete`, `storeClear`
8. **Cache Management:** `clearAppCache`, `getCacheInfo`
9. **Legacy IPC:** `send`, `receive` (channel whitelist enforced)

---

## Vue Application Architecture

### Component Hierarchy

```
App.vue
├── PageHeader.vue          # Custom title bar with window controls
└── Main.vue                # Main layout container
    ├── .left-menu          # Sidebar navigation
    │   ├── Logo
    │   └── router-link(s)  # Navigation items
    └── .container          # Router view container
        └── <router-view>   # Active route component
            └── KeepAlive   # Caches: OnlineWallpaper, LocalWallpaper, DownloadWallpaper
                └── [Page Component]

Page Components (views/):
├── OnlineWallpaper.vue
│   ├── LoadingOverlay.vue
│   ├── Alert.vue
│   ├── ImagePreview.vue
│   ├── SearchBar.vue
│   └── WallpaperList.vue
├── LocalWallpaper.vue
│   ├── Alert.vue
│   └── ImagePreview.vue
├── DownloadWallpaper.vue
│   ├── Alert.vue
│   └── ImagePreview.vue
├── SettingPage.vue
│   └── Alert.vue
├── APITest.vue             # Development tool
├── Diagnostic.vue          # Electron diagnostics
└── AlertTest.vue           # Component testing
```

### Router Structure
**File:** `src/router/index.ts`

| Path | Name | Component | Meta |
|------|------|-----------|------|
| `/` | - | (redirect) | → `/online` |
| `/online` | OnlineWallpaper | OnlineWallpaper.vue | title: "在线壁纸", icon: "fas fa-cloud" |
| `/switch` | LocalWallpaper | LocalWallpaper.vue | title: "本地列表", icon: "fas fa-folder" |
| `/download` | DownloadWallpaper | DownloadWallpaper.vue | title: "下载中心", icon: "fas fa-inbox-in" |
| `/setting` | SettingPage | SettingPage.vue | title: "设置", icon: "fas fa-cog" |
| `/api-test` | APITest | APITest.vue | title: "API测试", icon: "fas fa-wrench" |
| `/diagnostic` | Diagnostic | Diagnostic.vue | title: "Electron诊断", icon: "fas fa-stethoscope" |
| `/alert-test` | AlertTest | AlertTest.vue | title: "Alert组件测试", icon: "fas fa-bell" |

**Navigation Guards:** None (uses KeepAlive for state preservation)

**History Mode:** `createWebHashHistory()` (required for Electron file:// protocol compatibility)

### State Management

**Pinia Stores:**

#### 1. WallpaperStore (`src/stores/modules/wallpaper/`)
**Location:** `src/stores/wallpaper.ts` (re-exports from `modules/wallpaper`)

**State Shape:**
```typescript
{
  totalPageData: shallowRef<TotalPageData>,  // Paginated wallpaper data
  loading: Ref<boolean>,                      // Loading state
  error: Ref<boolean>,                        // Error state
  queryParams: Ref<GetParams | null>,         // Current search params
  savedParams: Ref<CustomParams | null>,      // Saved custom params
  settings: Reactive<AppSettings>             // App settings
}

interface AppSettings {
  downloadPath: string
  maxConcurrentDownloads: number
  apiKey: string
  wallpaperFit: 'fill' | 'fit' | 'stretch' | 'tile' | 'center' | 'span'
}
```

**Actions:**
- `fetchWallpapers(params)` - Fetch wallpapers (replaces data)
- `loadMoreWallpapers()` - Load next page (appends data)
- `resetState()` - Clear all wallpaper data
- `saveCustomParams(params)` - Save search params to electron-store
- `getSavedParams()` - Load saved search params
- `updateSettings(newSettings)` - Update and persist settings
- `loadSettings()` - Load settings from electron-store

**Getters:** None (uses computed in components)

**File Structure:**
```
stores/modules/wallpaper/
├── index.ts           # Store definition (defineStore)
├── state.ts           # State factory functions
├── actions.ts         # Action factory functions
├── storage.ts         # Custom params persistence
├── settings-storage.ts # Settings persistence
└── README.md          # Documentation
```

#### 2. DownloadStore (`src/stores/modules/download/`)
**Location:** `src/stores/modules/download/index.ts`

**State Shape:**
```typescript
{
  downloadingList: Ref<DownloadItem[]>,      // Active/paused downloads
  finishedList: Ref<FinishedDownloadItem[]>  // Completed downloads
}

interface DownloadItem {
  id: string
  url: string
  filename: string
  small: string           // Thumbnail URL
  resolution: string
  size: number
  offset: number          // Bytes downloaded
  progress: number        // 0-100
  speed: number           // Bytes/sec
  state: 'downloading' | 'paused' | 'waiting' | 'completed'
  path?: string
  time?: string
  wallpaperId?: string
}
```

**Computed Properties:**
- `activeDownloads` - Filter downloading items
- `pausedDownloads` - Filter paused items
- `totalActive` - Count active downloads
- `totalPaused` - Count paused downloads
- `totalFinished` - Count finished downloads

**Actions:**
- `addDownloadTask(task)` - Add single download task
- `addBatchDownloadTasks(tasks)` - Add multiple tasks
- `startDownload(id)` - Begin actual download via Electron IPC
- `pauseDownload(id)` - Pause download
- `resumeDownload(id)` - Resume download
- `cancelDownload(id)` - Cancel and remove from queue
- `updateProgress(id, progress, ...)` - Update progress from IPC callback
- `completeDownload(id, filePath)` - Move to finished list
- `removeFinishedRecord(id)` - Remove from finished list
- `clearFinishedList()` - Clear all finished records
- `saveToStorage()` - Persist to electron-store
- `loadFromStorage()` - Load from electron-store
- `isDownloading(wallpaperId)` - Check if already in queue

---

## Data Flow

### 1. API Request Flow (Development vs Production)

```
┌─────────────────────────────────────────────────────────────────┐
│                    DEVELOPMENT MODE                              │
│  Renderer                                                │
│  └── wallpaperApi.ts                                             │
│      └── apiClient.get('/api/search')                           │
│          └── Vite Proxy → https://wallhaven.cc/api/v1/search    │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    PRODUCTION MODE                               │
│  Renderer                                                │
│  └── wallpaperApi.ts                                             │
│      └── isProduction() check → true                            │
│          └── window.electronAPI.wallhavenApiRequest()           │
│              └── IPC: 'wallhaven-api-request'                   │
│                  └── Main Process                               │
│                      └── axios.get(wallhaven.cc/api/v1/...)     │
│                          └── Response → IPC reply               │
└─────────────────────────────────────────────────────────────────┘
```

### 2. Download Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  User clicks download on wallpaper                               │
│      ↓                                                           │
│  OnlineWallpaper.vue                                             │
│  └── downloadStore.addDownloadTask()                            │
│      └── saveToStorage() → electron-store                       │
│      ↓                                                           │
│  downloadStore.startDownload(taskId)                            │
│      └── window.electronAPI.startDownloadTask()                 │
│          └── IPC: 'start-download-task'                         │
│              └── Main Process (handlers.ts)                     │
│                  └── axios stream download                      │
│                  └── On progress: send('download-progress')     │
│                      ↓                                           │
│  Preload: ipcRenderer.on('download-progress')                   │
│      ↓                                                           │
│  main.ts: onDownloadProgress callback                           │
│      └── downloadStore.updateProgress()                         │
│          └── If 100%: completeDownload()                        │
│              └── Move to finishedList                           │
└─────────────────────────────────────────────────────────────────┘
```

### 3. Settings Persistence Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  User changes settings in SettingPage.vue                        │
│      ↓                                                           │
│  wallpaperStore.updateSettings(partialSettings)                 │
│      └── Object.assign(settings, partialSettings)               │
│          └── saveSettingsToStorage(settings)                    │
│              └── storeSet('appSettings', settings)              │
│                  └── window.electronAPI.storeSet()              │
│                      └── IPC: 'store-set'                       │
│                          └── Main: store.set(key, value)        │
│                              └── electron-store writes to disk  │
└─────────────────────────────────────────────────────────────────┘
```

### 4. Wallpaper Display Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  Component mount / search triggered                              │
│      ↓                                                           │
│  wallpaperStore.fetchWallpapers(params)                         │
│      └── searchWallpapers(params)                               │
│          └── API returns { data: [], meta: {...} }              │
│              ↓                                                   │
│  totalPageData.value = { sections: [data], ... }                │
│      ↓                                                           │
│  WallpaperList.vue receives pageData prop                       │
│      └── v-for renders sections and items                       │
│          └── Lazy loaded images with IntersectionObserver       │
└─────────────────────────────────────────────────────────────────┘
```

---

## Key Patterns

### 1. Repository Pattern (Service Layer)
- `src/services/wallpaperApi.ts` abstracts API communication
- Handles caching, error handling, environment detection
- Components interact with service, not directly with axios/IPC

### 2. Composition API with Factory Functions
- Store modules use factory functions to create state and actions
- `createInitialState()` and `createWallpaperActions()` pattern
- Enables better testability and separation of concerns

### 3. Performance Optimizations
- `shallowRef` for large data structures (wallpaper lists)
- `KeepAlive` for cached route components
- Lazy loading images with `loading="lazy"` and IntersectionObserver
- Throttled scroll events (300ms)
- API response caching (5 min TTL)

### 4. Storage Abstraction
- `src/utils/store.ts` wraps electron-store IPC calls
- Provides consistent async interface
- Handles JSON serialization to strip Vue proxies

### 5. IPC Communication Pattern
```
Renderer                          Main Process
   │                                    │
   │  window.electronAPI.method()      │
   │  ─────────────────────────────►   │
   │                                    │  Process request
   │                                    │  Access Node.js APIs
   │  ◄─────────────────────────────   │
   │  Promise<result>                  │
```

### 6. Custom Protocol for Local Files
- `wallhaven://` protocol registered in main process
- Allows safe loading of local images in renderer
- Bypasses file:// protocol restrictions
- Returns proper MIME types for images

### 7. Event-Driven Download Progress
- Main process sends progress via `webContents.send()`
- Preload script forwards to renderer via callback
- Main.ts registers global listener, updates store
- Decoupled download logic from UI

### 8. Module Organization
- Stores organized by domain (wallpaper, download)
- Each store module has separate files for state, actions, storage
- Services folder for external API integration
- Utils for cross-cutting concerns
