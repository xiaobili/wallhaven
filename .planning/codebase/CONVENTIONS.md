# Coding Conventions

## TypeScript Conventions

### Type Definitions
- Types are organized in a centralized file: `src/types/index.ts`
- **`interface` is preferred over `type`** for object shapes, as it supports declaration merging and extension
- Type aliases (`type`) are used for union types, utility types, and computed types

```typescript
// Preferred: Interface for object shapes
export interface WallpaperItem {
  id: string
  url: string
  file_size: number
  // ...
}

// Type for union types
export type DownloadState = 'downloading' | 'paused' | 'waiting' | 'completed'
export type WallpaperFit = 'fill' | 'fit' | 'stretch' | 'tile' | 'center' | 'span'
```

### Naming Conventions
- **Variables**: camelCase (`const clientWidth = ref<number>(700)`)
- **Functions**: camelCase (`const formatResolution = (str: string): string => {}`)
- **Types/Interfaces**: PascalCase (`interface WallpaperItem`, `type DownloadState`)
- **Constants**: camelCase or SCREAMING_SNAKE_CASE for true constants
- **Private/internal functions**: Prefix with underscore (`_event`, `_timers`)

### Imports Organization
- Imports are organized: Vue imports first, then external packages, then local modules
- Path aliases: Use `@/` for `src/` imports

```typescript
// Vue imports first
import { ref, computed, onMounted, onUnmounted } from 'vue'
import type { Ref, Reactive } from 'vue'

// External packages
import axios, { type AxiosResponse, type CancelTokenSource } from 'axios'

// Local modules with @ alias
import type { WallpaperItem, TotalPageData } from '@/types'
import { formatResolution, formatFileSize } from '@/utils/helpers'
import { useWallpaperStore } from '@/stores/wallpaper'
```

### Type Imports
- Use `import type { }` for type-only imports to enable better tree-shaking

```typescript
import type { WallpaperItem, TotalPageData, GetParams, CustomParams } from '@/types'
import type { Ref, Reactive } from 'vue'
```

### TypeScript Configuration
- Strict mode enabled with `noUncheckedIndexedAccess: true` for extra array/object safety
- Path mapping configured: `"@/*": ["./src/*"]`
- Multiple tsconfig files for different environments (app, node, vitest, electron)

---

## Vue Component Conventions

### Script Setup
- **Always use `<script setup lang="ts">`** - the modern Composition API syntax
- No Options API usage - all components use Composition API

```vue
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { WallpaperItem } from '@/types'

// Props
const props = defineProps<{
  pageData: TotalPageData
  loading: boolean
  error: boolean
}>()

// Emits
const emit = defineEmits<{
  'set-bg': [item: WallpaperItem]
  'preview': [item: WallpaperItem]
}>()
</script>
```

### Props Definition
- Use TypeScript generic syntax with `defineProps<{}>()`
- Complex prop types are imported from `@/types`
- Optional props can use `withDefaults`

```typescript
// Simple typed props
const props = defineProps<{
  pageData: TotalPageData
  loading: boolean
  error: boolean
  selectedIds?: string[]  // Optional
}>()

// With defaults
interface Props {
  type?: 'success' | 'error' | 'warning' | 'info'
  message: string
  showIcon?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  type: 'info',
  showIcon: true,
  closable: true,
  duration: 0,
})
```

### Emits Definition
- Use TypeScript generic syntax with `defineEmits<{}>()`
- Event names use kebab-case, payloads are typed as tuples

```typescript
const emit = defineEmits<{
  'set-bg': [item: WallpaperItem]
  'preview': [item: WallpaperItem]
  'download-img': [item: WallpaperItem]
  'close-search-modal': []
  'select-wallpaper': [id: string]
}>()
```

### Component Naming
- **Components**: PascalCase filenames (`WallpaperList.vue`, `ImagePreview.vue`, `SearchBar.vue`)
- Component registration: Automatically handled by `<script setup>`

### defineExpose
- Use `defineExpose` to expose methods to parent components

```typescript
// Expose methods to parent
defineExpose({
  closeModal,
})
```

---

## Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| Vue Components | PascalCase | `WallpaperCard.vue`, `SearchBar.vue` |
| Composables | use prefix | `useWallpaper.ts` (not present, but pattern) |
| Stores | use prefix | `useWallpaperStore`, `useDownloadStore` |
| Views | PascalCase | `OnlineWallpaper.vue`, `SettingPage.vue` |
| Utils | camelCase | `helpers.ts`, `store.ts` |
| Types/Interfaces | PascalCase | `WallpaperItem`, `DownloadState` |
| Type files | lowercase | `types/index.ts` |
| Constants | camelCase/SCREAMING_SNAKE_CASE | `CACHE_TTL`, `ALL_CATEGORIES` |
| Private methods | underscore prefix | `_event`, `_listeners` |
| CSS classes | kebab-case | `.thumb-listing-page`, `.menu-item` |

---

## File Organization

### Component File Structure
```vue
<template>
  <!-- Template first -->
</template>

<script setup lang="ts">
// 1. Imports
import { ref, computed, onMounted, onUnmounted } from 'vue'
import type { WallpaperItem } from '@/types'

// 2. Props and Emits
const props = defineProps<{ /* ... */ }>()
const emit = defineEmits<{ /* ... */ }>()

// 3. Reactive state
const clientWidth = ref<number>(700)
const imgInfo = shallowRef<WallpaperItem | null>(null)

// 4. Computed properties
const calHeight = computed(() => { /* ... */ })

// 5. Methods
const close = () => { /* ... */ }

// 6. Lifecycle hooks
onMounted(() => { /* ... */ })
onUnmounted(() => { /* ... */ })

// 7. defineExpose (if needed)
defineExpose({ closeModal })
</script>

<style scoped>
/* Scoped styles */
</style>
```

### Store Organization (Pinia)
Store files are organized in a modular pattern:

```
src/stores/
├── wallpaper.ts              # Re-export for backward compatibility
└── modules/
    ├── wallpaper/
    │   ├── index.ts          # Main store definition
    │   ├── actions.ts        # Action functions
    │   ├── state.ts          # State factory functions
    │   ├── storage.ts        # Persistence helpers
    │   └── settings-storage.ts
    └── download/
        └── index.ts          # Download store
```

**Store Pattern**:
```typescript
// state.ts - Factory functions for initial state
export function createInitialState() {
  const totalPageData = shallowRef<TotalPageData>({ /* ... */ })
  const loading = ref<boolean>(false)
  const settings = reactive<AppSettings>(createDefaultSettings())
  return { totalPageData, loading, settings }
}

// actions.ts - Action functions
export function createWallpaperActions(
  totalPageData: any,
  loading: Ref<boolean>,
  // ...
) {
  async function fetchWallpapers(params: GetParams | null): Promise<void> { /* ... */ }
  return { fetchWallpapers }
}

// index.ts - Store composition
export const useWallpaperStore = defineStore('wallpaper', () => {
  const state = createInitialState()
  const actions = createWallpaperActions(/* ... */)
  return { ...state, ...actions }
})
```

### Service Pattern
Services are in `src/services/` and handle external API communication:

```typescript
// src/services/wallpaperApi.ts
const apiClient = axios.create({ /* config */ })

// Interceptors for request/response handling
apiClient.interceptors.request.use(/* ... */)
apiClient.interceptors.response.use(/* ... */)

// Exported API functions
export const searchWallpapers = async (params: GetParams | null): Promise<any> => { /* ... */ }
export const getWallpaperDetail = async (id: string): Promise<any> => { /* ... */ }
```

---

## Error Handling

### Try-Catch Patterns
All async operations use try-catch with logging:

```typescript
async function fetchWallpapers(params: GetParams | null): Promise<void> {
  loading.value = true
  error.value = false

  try {
    const data = await searchWallpapers(finalParams)
    totalPageData.value = { /* ... */ }
  } catch (err) {
    console.error('获取壁纸数据失败:', err)
    error.value = true
  } finally {
    loading.value = false
  }
}
```

### Error Display Patterns
- Error state is stored in reactive refs (`error.value = true`)
- UI conditionally shows error messages based on state
- User-friendly error messages in components:

```vue
<div v-if="wallpaperStore.error" class="error-container">
  <div class="error-content">
    <i class="fas fa-exclamation-triangle error-icon"></i>
    <h3>网络异常</h3>
    <p>无法连接到 Wallhaven API，请检查：</p>
    <ul>
      <li>网络连接是否正常</li>
      <li>API Key 是否正确</li>
    </ul>
    <button @click="retryFetch" class="retry-button">重试</button>
  </div>
</div>
```

### Alert Component Pattern
Custom Alert component for user notifications:

```typescript
const alert = reactive({
  visible: false,
  type: 'info' as 'success' | 'error' | 'warning' | 'info',
  message: '',
  duration: 3000
})

const showAlert = (
  message: string,
  type: 'success' | 'error' | 'warning' | 'info' = 'info',
  duration: number = 3000
) => {
  alert.message = message
  alert.type = type
  alert.duration = duration
  alert.visible = true
}

// Usage
showAlert('✅ 设置已保存', 'success')
showAlert('下载失败: ' + error.message, 'error')
```

### Logging Patterns
- Console logging with prefixes for debugging:
```typescript
console.log('[API] Using cached data for search')
console.error('[DownloadStore] 下载失败:', error)
console.warn('[Store] electronAPI not available')
```

---

## Styling

### CSS Approach
- **Scoped CSS** for component styles (`<style scoped>`)
- **External CSS imports** for shared styles:
```vue
<style scoped>
@import url("@/static/css/list.css");
/* Component-specific styles */
</style>
```

### CSS Naming Convention
- **BEM-like naming** for complex components
- kebab-case for class names
- Semantic naming based on functionality

```css
.thumb-listing-page { }
.thumb-listing-page-header { }
.thumb-checkbox { }
.thumb.selected { }
.menu-native.router-link-active { }
```

### Responsive Design
```css
@media (max-width: 768px) {
  .settings-page {
    padding: 0 1em;
  }
  .oneline {
    flex-direction: column;
  }
}
```

### CSS Variables & Colors
- Hardcoded colors with hex values
- Common color patterns:
  - Primary actions: `#667eea` to `#764ba2` gradients
  - Success: green tones (`#4a4`, `rgba(80, 160, 80, 0.95)`)
  - Error: red tones (`#c44`, `rgba(180, 60, 60, 0.95)`)
  - Warning: yellow/orange (`#ca4`, `rgba(180, 140, 40, 0.95)`)
  - Info: blue tones (`#48c`, `rgba(60, 120, 180, 0.95)`)

---

## Code Patterns

### Async Operations
- **Always use async/await** (no raw Promises or callbacks)
- Loading states managed with try/finally

```typescript
const handleChangeParams = (customParams: GetParams | null): void => {
  showLoadingOverlay.value = true
  wallpaperStore.fetchWallpapers(customParams).finally(() => {
    showLoadingOverlay.value = false
  })
}
```

### Event Handling
- Use arrow functions for event handlers
- Throttle/debounce for performance-sensitive events

```typescript
// Throttled scroll event
import { throttle } from '@/utils/helpers'

const scrollEvent = (): void => {
  if (wallpaperStore.loading) return
  // ...scroll logic
}

const throttledScrollEvent = throttle(scrollEvent, 300)

onMounted(() => {
  window.addEventListener('scroll', throttledScrollEvent, { passive: true })
})

onUnmounted(() => {
  window.removeEventListener('scroll', throttledScrollEvent)
})
```

### State Updates
- Use `shallowRef` for large objects to reduce reactivity overhead
- Create new objects for updates to trigger reactivity:

```typescript
// Using shallowRef with new object assignment
totalPageData.value = {
  sections: [data],
  totalPage: Number(data.meta.last_page) || 0,
  currentPage: Number(data.meta.current_page) || 0,
}

// For arrays - create new array to trigger shallowRef
const newSections = [...totalPageData.value.sections, data]
totalPageData.value = { ...totalPageData.value, sections: newSections }
```

### Computed Properties
- Use computed for derived state

```typescript
const apiKey = computed(() => wallpaperStore.settings.apiKey)

const calContainerW = computed(() => {
  const width = clientWidth.value - 200
  return width < 800 ? 800 : width
})
```

### Reactive Objects
- Use `reactive` for small objects (like settings)
- Use `ref`/`shallowRef` for primitive values and large objects

```typescript
// Small object - reactive
const settings = reactive<AppSettings>({
  downloadPath: '',
  maxConcurrentDownloads: 3,
  apiKey: '',
  wallpaperFit: 'fill',
})

// Large object - shallowRef
const totalPageData = shallowRef<TotalPageData>({
  totalPage: 0,
  currentPage: 0,
  sections: [],
})
```

### Vue Router Patterns
- Lazy-loaded routes with dynamic imports
- Route meta for additional info

```typescript
const routes: RouteRecordRaw[] = [
  {
    path: '/online',
    name: 'OnlineWallpaper',
    component: () => import('@/views/OnlineWallpaper.vue'),
    meta: {
      title: '在线壁纸',
      icon: 'fas fa-cloud',
    },
  },
]
```

### KeepAlive Caching
```vue
<router-view v-slot="{ Component, route }">
  <KeepAlive :include="['OnlineWallpaper', 'LocalWallpaper', 'DownloadWallpaper']">
    <component :is="Component" :key="route.path" />
  </KeepAlive>
</router-view>
```

---

## Electron-Specific Patterns

### IPC Communication
- Main process handlers in `electron/main/ipc/handlers.ts`
- Preload bridge in `electron/preload/index.ts`
- Type definitions in `env.d.ts`

```typescript
// Preload - expose to renderer
const electronAPI: ElectronAPI = {
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  storeGet: (key: string) => ipcRenderer.invoke('store-get', key),
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)

// Main process - handle IPC
ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog({ /* ... */ })
  return result.filePaths[0]
})
```

### Electron Store
- Use `electron-store` for persistent storage
- Wrapper utility in `src/utils/store.ts`

```typescript
// Utility wrapper
export async function storeGet<T = any>(key: string): Promise<T | null> {
  const result = await window.electronAPI.storeGet(key)
  return result.success ? result.value : null
}

export async function storeSet(key: string, value: any): Promise<boolean> {
  // Deep clone to remove Vue reactive proxy
  const plainValue = JSON.parse(JSON.stringify(value))
  const result = await window.electronAPI.storeSet({ key, value: plainValue })
  return result.success
}
```

### Environment Detection
```typescript
const isProduction = () => {
  const hasElectronAPI = typeof (window as any).electronAPI !== 'undefined'
  const isProd = import.meta.env.PROD
  return hasElectronAPI && isProd
}
```
