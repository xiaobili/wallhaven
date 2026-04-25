# Project Structure

## Directory Layout

```
wallhaven/
├── .github/                    # GitHub configuration
│   └── workflows/
│       └── build.yml           # CI/CD workflow for builds
│
├── .planning/                  # Planning and documentation
│   └── codebase/               # Codebase analysis documents
│       ├── ARCHITECTURE.md     # This architecture documentation
│       └── STRUCTURE.md        # This structure documentation
│
├── build/                      # Build resources and icons
│   ├── entitlements.mac.plist  # macOS entitlements
│   ├── icon.icns               # macOS icon bundle
│   ├── icon.ico                # Windows icon
│   ├── icon.png                # Linux icon
│   ├── icon-256.png            # Scaled icon
│   ├── icon.iconset/           # macOS icon variants
│   ├── preview/                # Preview images for stores
│   └── source-icon.png         # Source icon file
│
├── electron/                   # Electron-specific code
│   ├── main/                   # Main process
│   │   ├── index.ts            # Main process entry point
│   │   └── ipc/
│   │       └── handlers.ts     # IPC channel handlers
│   │
│   └── preload/                # Preload scripts
│       └── index.ts            # Preload script (exposes window.electronAPI)
│
├── public/                     # Public static files
│   └── favicon.ico             # Web favicon
│
├── scripts/                    # Build and utility scripts
│   ├── generate-icons.js       # Icon generation script
│   └── generate-ico.js         # ICO file generation
│
├── src/                        # Vue renderer process
│   ├── components/             # Reusable Vue components
│   │   ├── Alert.vue           # Alert/notification component
│   │   ├── AlertDemo.vue       # Alert component demo
│   │   ├── ElectronTest.vue    # Electron API testing component
│   │   ├── ImagePreview.vue    # Full-screen image preview modal
│   │   ├── LoadingOverlay.vue  # Loading spinner overlay
│   │   ├── PageHeader.vue      # Custom title bar with window controls
│   │   ├── SearchBar.vue       # Wallpaper search interface
│   │   └── WallpaperList.vue   # Wallpaper grid display
│   │
│   ├── views/                  # Page-level components
│   │   ├── OnlineWallpaper.vue # Online wallpaper search page
│   │   ├── LocalWallpaper.vue  # Local wallpaper management
│   │   ├── DownloadWallpaper.vue # Download center page
│   │   ├── SettingPage.vue     # Settings page
│   │   ├── APITest.vue         # API testing tool
│   │   ├── Diagnostic.vue      # Electron diagnostics page
│   │   └── AlertTest.vue       # Alert component test page
│   │
│   ├── stores/                 # Pinia state management
│   │   ├── wallpaper.ts        # Re-exports wallpaper store
│   │   └── modules/
│   │       ├── wallpaper/      # Wallpaper domain store
│   │       │   ├── index.ts    # Store definition
│   │       │   ├── state.ts    # State factory
│   │       │   ├── actions.ts  # Actions factory
│   │       │   ├── storage.ts  # Custom params persistence
│   │       │   ├── settings-storage.ts # Settings persistence
│   │       │   └── README.md   # Store documentation
│   │       │
│   │       └── download/       # Download management store
│   │           └── index.ts    # Download store
│   │
│   ├── services/               # External service integrations
│   │   └── wallpaperApi.ts     # Wallhaven API service
│   │
│   ├── router/                 # Vue Router configuration
│   │   └── index.ts            # Route definitions
│   │
│   ├── types/                  # TypeScript type definitions
│   │   ├── index.ts            # All type exports
│   │   └── README.md           # Types documentation
│   │
│   ├── utils/                  # Utility functions
│   │   ├── helpers.ts          # General helper functions
│   │   └── store.ts            # Electron-store wrapper
│   │
│   ├── static/                 # Static assets
│   │   ├── css/                # Stylesheets
│   │   │   ├── all.css         # Combined styles
│   │   │   ├── common.css      # Common styles
│   │   │   └── list.css        # Wallpaper list styles
│   │   │
│   │   ├── icons/              # Icon assets
│   │   │   ├── logo.png        # App logo
│   │   │   └── icon-s-close-hover.svg
│   │   │
│   │   └── webfonts/           # Font Awesome webfonts
│   │
│   ├── __tests__/              # Unit tests
│   │   └── App.spec.ts         # App component tests
│   │
│   ├── App.vue                 # Root Vue component
│   ├── Main.vue                # Main layout component
│   └── main.ts                 # Vue app entry point
│
├── .gitignore                  # Git ignore rules
├── .prettierrc.json            # Prettier configuration
├── README.md                   # Project documentation
├── electron-builder.yml        # Electron Builder configuration
├── electron.vite.config.ts     # Electron-Vite build configuration
├── env.d.ts                    # TypeScript environment declarations
├── index.html                  # HTML entry point
├── package.json                # NPM package configuration
├── package-lock.json           # Dependency lock file
├── tsconfig.json               # TypeScript base configuration
├── tsconfig.app.json           # TypeScript app configuration
├── tsconfig.electron.json      # TypeScript Electron configuration
├── tsconfig.node.json          # TypeScript Node.js configuration
├── tsconfig.vitest.json        # TypeScript Vitest configuration
├── vite.config.ts              # Vite configuration
└── vitest.config.ts            # Vitest test configuration
```

---

## Key Files

| File | Purpose |
|------|---------|
| `electron/main/index.ts` | Main process entry - creates window, initializes store, registers protocol |
| `electron/main/ipc/handlers.ts` | All IPC channel handlers - file operations, downloads, API proxy |
| `electron/preload/index.ts` | Exposes `window.electronAPI` to renderer with typed IPC methods |
| `src/main.ts` | Vue app bootstrap - creates app, Pinia, router, async initialization |
| `src/App.vue` | Root component - contains PageHeader and router-view wrapper |
| `src/Main.vue` | Main layout - sidebar navigation and content container |
| `src/router/index.ts` | Route definitions with lazy-loaded components |
| `src/stores/modules/wallpaper/index.ts` | Wallpaper store definition using Composition API |
| `src/stores/modules/download/index.ts` | Download management store |
| `src/services/wallpaperApi.ts` | Wallhaven API client with caching and environment detection |
| `src/utils/store.ts` | Wrapper for electron-store IPC operations |
| `src/utils/helpers.ts` | Utility functions (debounce, throttle, formatters) |
| `src/types/index.ts` | TypeScript interfaces for all data structures |
| `env.d.ts` | Global type declarations for `window.electronAPI` |
| `electron.vite.config.ts` | Build configuration for main, preload, renderer |
| `electron-builder.yml` | Packaging configuration for all platforms |

---

## Module Organization

### Components (`src/components/`)

Components are organized by reusability:

1. **Layout Components:**
   - `PageHeader.vue` - Custom title bar (used once in App.vue)
   - Used for frameless window with custom controls

2. **Feature Components:**
   - `SearchBar.vue` - Complex search interface with filters
   - `WallpaperList.vue` - Grid display with selection support

3. **UI Components:**
   - `Alert.vue` - Toast notifications
   - `LoadingOverlay.vue` - Loading spinner overlay
   - `ImagePreview.vue` - Modal image preview

4. **Development Components:**
   - `ElectronTest.vue` - API testing
   - `AlertDemo.vue` - Component demonstration

### Views (`src/views/`)

Page-level components mapped to routes:

| View | Purpose | Key Features |
|------|---------|--------------|
| `OnlineWallpaper.vue` | Main wallpaper search | Search, browse, download, set wallpaper |
| `LocalWallpaper.vue` | Local file management | Browse local images, set wallpaper |
| `DownloadWallpaper.vue` | Download center | Queue management, progress tracking |
| `SettingPage.vue` | App configuration | API key, download path, preferences |
| `APITest.vue` | Development tool | Test API endpoints |
| `Diagnostic.vue` | Debugging | Electron environment diagnostics |
| `AlertTest.vue` | Component testing | Alert component showcase |

### Stores (`src/stores/`)

Organized by domain with modular structure:

```
stores/
├── wallpaper.ts              # Re-export entry point
└── modules/
    ├── wallpaper/            # Domain: Wallpaper search & settings
    │   ├── index.ts          # defineStore setup
    │   ├── state.ts          # State shape definition
    │   ├── actions.ts        # Business logic
    │   ├── storage.ts        # Custom params persistence
    │   └── settings-storage.ts # Settings persistence
    │
    └── download/             # Domain: Download management
        └── index.ts          # Self-contained store
```

### Services (`src/services/`)

External API abstraction layer:

- `wallpaperApi.ts` - Wallhaven API client
  - Axios instance with interceptors
  - In-memory caching (5 min TTL)
  - Request cancellation support
  - Environment-aware (dev proxy vs production IPC)

### Utils (`src/utils/`)

Cross-cutting utilities:

| File | Contents |
|------|----------|
| `helpers.ts` | `debounce`, `throttle`, `formatResolution`, `formatFileSize`, `formatSpeed`, `formatTime`, `arrayToBinaryString`, `deepClone`, `isEmpty`, `filterEmptyValues`, `preloadImages`, `cleanupObject` |
| `store.ts` | `storeGet`, `storeSet`, `storeDelete`, `storeClear` - Wraps electron-store IPC |

---

## Import Patterns

### Alias Usage

The `@/` alias is configured for the `src/` directory:

```typescript
// In vite.config.ts / electron.vite.config.ts
resolve: {
  alias: {
    '@': resolve(__dirname, 'src')
  }
}
```

### Common Import Patterns

**Components importing from stores:**
```typescript
import { useWallpaperStore } from '@/stores/wallpaper'
import { useDownloadStore } from '@/stores/modules/download'
```

**Components importing types:**
```typescript
import type { WallpaperItem, GetParams } from '@/types'
```

**Components importing utilities:**
```typescript
import { throttle, formatResolution } from '@/utils/helpers'
import { storeGet, storeSet } from '@/utils/store'
```

**Store modules importing types:**
```typescript
import type { TotalPageData, GetParams, CustomParams, AppSettings } from '@/types'
```

**Services importing stores:**
```typescript
import { useWallpaperStore } from '@/stores/wallpaper'
// Note: Creates circular dependency risk - store imports service only for types
```

### Relative vs Absolute Imports

- **Absolute (`@/`)**: Used for all cross-module imports
  - Components → stores, types, utils
  - Stores → types, utils
  - Services → types

- **Relative (`./`)**: Used for local imports within module
  - Store module files importing from each other
  - Type re-exports

```typescript
// Within stores/modules/wallpaper/index.ts
import { createInitialState } from './state'
import { createWallpaperActions } from './actions'
```

### Type-Only Imports

TypeScript type-only imports are used for type definitions:

```typescript
import type { Ref, Reactive } from 'vue'
import type { WallpaperItem, GetParams } from '@/types'
```

---

## File Naming Conventions

| Category | Convention | Example |
|----------|------------|---------|
| Vue Components | PascalCase | `SearchBar.vue`, `WallpaperList.vue` |
| TypeScript files | camelCase | `wallpaperApi.ts`, `helpers.ts` |
| Store files | camelCase | `wallpaper.ts`, `download.ts` |
| Type files | camelCase | `index.ts` (re-exports types) |
| CSS files | kebab-case | `common.css`, `list.css` |
| Config files | kebab-case | `electron-builder.yml` |
| Test files | [name].spec.ts | `App.spec.ts` |

---

## Build Output Structure

After running `npm run build`:

```
out/
├── main/                      # Compiled main process
│   └── index.js               # Bundled main process code
│
├── preload/                   # Compiled preload scripts
│   └── index.mjs              # Bundled preload script (ES module)
│
└── renderer/                  # Compiled renderer (Vue app)
    ├── index.html             # Entry HTML
    └── assets/
        ├── js/
        │   ├── vendor-[hash].js     # Vue, Vue Router, Pinia
        │   ├── utils-[hash].js      # Axios
        │   ├── components-[hash].js # Vue components
        │   └── index-[hash].js      # Application code
        └── [ext]/
            └── [name]-[hash].[ext]  # CSS, images, etc.
```

---

## Configuration Files

| File | Purpose |
|------|---------|
| `package.json` | Dependencies, scripts, npm metadata |
| `electron.vite.config.ts` | Build config for all three processes |
| `electron-builder.yml` | Packaging configuration (Windows, macOS, Linux) |
| `vite.config.ts` | Additional Vite configuration |
| `vitest.config.ts` | Unit test configuration |
| `tsconfig.json` | TypeScript project references |
| `tsconfig.app.json` | TypeScript config for renderer |
| `tsconfig.electron.json` | TypeScript config for Electron code |
| `tsconfig.node.json` | TypeScript config for Node.js scripts |
| `tsconfig.vitest.json` | TypeScript config for tests |
| `.prettierrc.json` | Code formatting rules |
| `.gitignore` | Git ignore patterns |
| `env.d.ts` | Global type augmentations |
