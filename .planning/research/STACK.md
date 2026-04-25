# Electron + Vue 3 + TypeScript + Pinia 技术栈最佳实践

> 研究时间：2025-04-25
> 目标版本：Electron v41.2.2, Vue 3.5.32, TypeScript 6.0.0, Pinia 3.0.4

---

## 1. IPC 通信的最佳模式

### 1.1 当前架构分析

项目已采用 `contextBridge` 模式，这是正确的安全基础：

```
Main Process (Node.js) ←→ Preload (contextBridge) ←→ Renderer (Vue)
```

**现有优点：**
- ✅ `contextIsolation: true`
- ✅ `nodeIntegration: false`
- ✅ 使用 `contextBridge.exposeInMainWorld()` 暴露 API
- ✅ 已有类型定义 (`window.electronAPI`)

**待改进：**
- ❌ 单文件 `handlers.ts` 866 行，缺乏模块化
- ❌ 类型定义分散，未实现主进程/渲染进程类型共享
- ❌ 缺乏统一的错误处理机制

### 1.2 推荐架构：类型安全的 IPC 层

#### 推荐模式：共享类型定义 + 领域模块化

```
src/
├── shared/                    # 主进程和渲染进程共享
│   └── types/
│       ├── ipc.ts             # IPC 通道类型定义
│       ├── electron-api.ts    # ElectronAPI 接口定义
│       └── index.ts
│
electron/
├── main/
│   ├── ipc/
│   │   ├── index.ts           # IPC 注册入口
│   │   ├── handlers/          # 按领域拆分
│   │   │   ├── file-system.ts
│   │   │   ├── download.ts
│   │   │   ├── settings.ts
│   │   │   ├── wallpaper.ts
│   │   │   └── window.ts
│   │   └── utils/
│   │       └── error-handler.ts
│   └── index.ts
│
├── preload/
│   └── index.ts               # 使用共享类型
```

#### 类型安全 IPC 定义模式

```typescript
// src/shared/types/ipc.ts

// 定义所有 IPC 通道的输入输出类型
export interface IpcChannels {
  // 文件系统
  'select-folder': {
    input: void
    output: string | null
  }
  'read-directory': {
    input: { path: string }
    output: DirectoryContent[]
  }
  // 下载
  'start-download-task': {
    input: DownloadTaskInput
    output: void
  }
  // ... 其他通道
}

// 类型安全的 invoke 包装器
export type IpcInvoke = {
  [K in keyof IpcChannels]: (
    ...args: IpcChannels[K]['input'] extends void ? [] : [IpcChannels[K]['input']]
  ) => Promise<IpcChannels[K]['output']>
}
```

```typescript
// electron/preload/index.ts
import type { IpcInvoke } from '../../src/shared/types/ipc'

const electronAPI: IpcInvoke = {
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  readDirectory: (params) => ipcRenderer.invoke('read-directory', params),
  // ... 类型检查确保实现完整
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)
```

#### 领域模块化 handlers

```typescript
// electron/main/ipc/handlers/file-system.ts
import { IpcChannels } from '../../../../src/shared/types/ipc'

export function registerFileSystemHandlers(ipcMain: IpcMain) {
  ipcMain.handle('select-folder', async (event): IpcChannels['select-folder']['output'] => {
    const result = await dialog.showOpenDialog({ properties: ['openDirectory'] })
    return result.filePaths[0] || null
  })
  
  ipcMain.handle('read-directory', async (event, params): IpcChannels['read-directory']['output'] => {
    // 实现...
  })
}
```

```typescript
// electron/main/ipc/index.ts
import { registerFileSystemHandlers } from './handlers/file-system'
import { registerDownloadHandlers } from './handlers/download'
import { registerSettingsHandlers } from './handlers/settings'

export function registerAllIpcHandlers(ipcMain: IpcMain) {
  registerFileSystemHandlers(ipcMain)
  registerDownloadHandlers(ipcMain)
  registerSettingsHandlers(ipcMain)
}
```

### 1.3 错误处理最佳实践

```typescript
// electron/main/ipc/utils/error-handler.ts
import { dialog } from 'electron'

export function wrapHandler<T>(
  handler: (event: IpcMainInvokeEvent, ...args: any[]) => Promise<T>
) {
  return async (event: IpcMainInvokeEvent, ...args: any[]): Promise<T> => {
    try {
      return await handler(event, ...args)
    } catch (error) {
      console.error(`IPC Handler Error:`, error)
      
      // 可选：向用户显示错误对话框
      // dialog.showErrorBox('Error', error.message)
      
      // 返回标准化错误对象
      throw {
        code: error.code || 'UNKNOWN_ERROR',
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }
    }
  }
}

// 使用
ipcMain.handle('some-channel', wrapHandler(async (event, params) => {
  // 业务逻辑
}))
```

### 1.4 进度/事件通知模式

当前项目已实现下载进度通知，推荐继续使用此模式：

```typescript
// 主进程发送
webContents.send('download-progress', { id, progress, speed })

// Preload 桥接
onDownloadProgress: (callback) => {
  const handler = (_event, data) => callback(data)
  ipcRenderer.on('download-progress', handler)
  return () => ipcRenderer.removeListener('download-progress', handler)
}

// 渲染进程使用
const unsubscribe = window.electronAPI.onDownloadProgress((data) => {
  downloadStore.updateProgress(data)
})
// 组件卸载时清理
onUnmounted(unsubscribe)
```

**推荐理由：**
1. **类型安全**：共享类型定义消除 `any` 类型，编译期发现错误
2. **模块化**：按领域拆分 handlers，便于维护和测试
3. **安全**：保持 `contextIsolation` 模式，符合 Electron 官方推荐
4. **错误处理**：统一的错误包装器，避免异常穿透

---

## 2. TypeScript 类型定义的最佳实践

### 2.1 当前问题

- 60+ 处 `any` 类型使用
- 类型定义分散在各处
- 缺乏共享类型层

### 2.2 推荐类型组织结构

```
src/
├── types/
│   ├── index.ts              # 统一导出
│   ├── api/                  # API 相关类型
│   │   ├── wallhaven.ts
│   │   └── responses.ts
│   ├── domain/               # 领域模型
│   │   ├── wallpaper.ts
│   │   ├── download.ts
│   │   └── settings.ts
│   ├── ipc/                  # IPC 类型（与 electron/shared 同步）
│   │   └── index.ts
│   └── utils/                # 工具类型
│       └── index.ts
│
├── shared/types/             # 主进程和渲染进程共享
│   ├── ipc.ts
│   └── electron-api.ts
```

### 2.3 类型定义最佳实践

#### 使用 `interface` 定义数据结构，`type` 定义联合/工具类型

```typescript
// types/domain/wallpaper.ts

// 数据结构用 interface（可扩展）
export interface Wallpaper {
  id: string
  url: string
  resolution: string
  // ...
}

// 联合类型用 type
export type WallpaperCategory = 'general' | 'anime' | 'people'
export type WallpaperPurity = 'sfw' | 'sketchy' | 'nsfw'

// 工具类型
export type WallpaperFit = 'fill' | 'fit' | 'stretch' | 'tile' | 'center' | 'span'
```

#### 使用 `satisfies` 确保类型正确性

```typescript
const ROUTES = {
  online: { path: '/online', title: '在线壁纸', icon: 'fas fa-cloud' },
  local: { path: '/switch', title: '本地列表', icon: 'fas fa-folder' },
  download: { path: '/download', title: '下载中心', icon: 'fas fa-inbox-in' },
} satisfies Record<string, RouteConfig>
```

#### 使用 `const assertions` 定义常量

```typescript
export const DOWNLOAD_STATES = ['downloading', 'paused', 'waiting', 'completed'] as const
export type DownloadState = typeof DOWNLOAD_STATES[number]
```

#### 避免类型断言，使用类型守卫

```typescript
// ❌ 避免
const wallpaper = data as Wallpaper

// ✅ 推荐
function isWallpaper(data: unknown): data is Wallpaper {
  return typeof data === 'object' && 
         data !== null &&
         'id' in data &&
         'url' in data
}

if (isWallpaper(data)) {
  // data 类型收窄为 Wallpaper
}
```

### 2.4 Vue 组件类型定义

```typescript
// 使用 defineProps 泛型语法
const props = defineProps<{
  wallpaper: Wallpaper
  selectable?: boolean
}>()

// 使用 withDefaults
const props = withDefaults(defineProps<{
  wallpaper: Wallpaper
  selectable?: boolean
}>(), {
  selectable: false
})

// defineEmits 类型安全
const emit = defineEmits<{
  select: [wallpaper: Wallpaper]
  delete: [id: string]
}>()
```

### 2.5 Store 类型定义

```typescript
// stores/modules/download/types.ts
export interface DownloadItem {
  id: string
  url: string
  filename: string
  progress: number
  state: DownloadState
  // ...
}

export interface DownloadState {
  downloadingList: DownloadItem[]
  finishedList: FinishedDownloadItem[]
}
```

**推荐理由：**
1. **类型组织清晰**：按领域和用途分类
2. **共享类型**：主进程/渲染进程共享，避免类型不同步
3. **类型安全**：消除 `any`，使用类型守卫而非断言
4. **工具类型**：充分利用 TypeScript 类型系统

---

## 3. Pinia Store 的组织模式

### 3.1 当前架构分析

项目已采用 Setup Store 模式，这是正确选择：

```typescript
// 当前模式 ✅
export const useDownloadStore = defineStore('download', () => {
  const downloadingList = ref<DownloadItem[]>([])
  // ...
  return { downloadingList, startDownload, ... }
})
```

**现有优点：**
- ✅ 使用 Setup Store（Composition API 风格）
- ✅ 按领域分模块
- ✅ 分离 state/actions 文件

**待改进：**
- ❌ 缺乏 Getters 的组织
- ❌ Store 直接调用 IPC，缺乏抽象层

### 3.2 推荐组织结构

```
src/stores/
├── index.ts                  # 统一导出
├── modules/
│   ├── wallpaper/
│   │   ├── index.ts          # Store 定义
│   │   ├── types.ts          # 类型定义
│   │   ├── state.ts          # State 工厂
│   │   ├── getters.ts        # Getters
│   │   ├── actions.ts        # Actions
│   │   └── repository.ts     # 数据访问层
│   │
│   ├── download/
│   │   ├── index.ts
│   │   ├── types.ts
│   │   ├── state.ts
│   │   ├── getters.ts
│   │   ├── actions.ts
│   │   └── repository.ts
│   │
│   └── settings/
│       ├── index.ts
│       └── ...
│
└── utils/
    └── store-helpers.ts      # Store 工具函数
```

### 3.3 Setup Store 最佳实践

#### 完整的 Store 定义模式

```typescript
// stores/modules/download/index.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { DownloadItem, DownloadState } from './types'
import { createInitialState } from './state'
import { useDownloadRepository } from './repository'

export const useDownloadStore = defineStore('download', () => {
  // ========== State ==========
  const downloadingList = ref<DownloadItem[]>([])
  const finishedList = ref<FinishedDownloadItem[]>([])
  
  // ========== Repository ==========
  const repository = useDownloadRepository()
  
  // ========== Getters ==========
  const activeDownloads = computed(() => 
    downloadingList.value.filter(item => item.state === 'downloading')
  )
  
  const pausedDownloads = computed(() =>
    downloadingList.value.filter(item => item.state === 'paused')
  )
  
  const totalActive = computed(() => activeDownloads.value.length)
  const totalPaused = computed(() => pausedDownloads.value.length)
  const totalFinished = computed(() => finishedList.value.length)
  
  // ========== Actions ==========
  async function addDownloadTask(task: DownloadTaskInput) {
    const item: DownloadItem = {
      id: generateId(),
      ...task,
      progress: 0,
      state: 'waiting'
    }
    downloadingList.value.push(item)
    await repository.save(downloadingList.value)
    return item.id
  }
  
  async function startDownload(id: string) {
    const item = downloadingList.value.find(i => i.id === id)
    if (!item) return
    
    item.state = 'downloading'
    await repository.startDownload(item)
  }
  
  function reset() {
    downloadingList.value = []
    finishedList.value = []
  }
  
  // ========== Return ==========
  return {
    // State
    downloadingList,
    finishedList,
    
    // Getters
    activeDownloads,
    pausedDownloads,
    totalActive,
    totalPaused,
    totalFinished,
    
    // Actions
    addDownloadTask,
    startDownload,
    reset,
    
    // Lifecycle
    $reset: reset
  }
})
```

#### Repository 模式（数据访问层）

```typescript
// stores/modules/download/repository.ts
import { downloadService } from '@/services/download'

export function useDownloadRepository() {
  return {
    async save(list: DownloadItem[]) {
      await window.electronAPI.storeSet('downloadingList', JSON.parse(JSON.stringify(list)))
    },
    
    async load(): Promise<DownloadItem[]> {
      const data = await window.electronAPI.storeGet('downloadingList')
      return data || []
    },
    
    async startDownload(item: DownloadItem) {
      await window.electronAPI.startDownloadTask({
        id: item.id,
        url: item.url,
        filename: item.filename,
        path: item.path
      })
    }
  }
}
```

### 3.4 Store 组合模式

```typescript
// 在一个 Store 中使用另一个 Store
export const useDownloadStore = defineStore('download', () => {
  const wallpaperStore = useWallpaperStore()
  
  async function downloadSelected() {
    const selected = wallpaperStore.selectedWallpapers
    for (const wallpaper of selected) {
      await addDownloadTask(wallpaper)
    }
  }
  
  return { downloadSelected }
})
```

### 3.5 持久化策略

```typescript
// 使用 $subscribe 监听变化自动保存
export const useDownloadStore = defineStore('download', () => {
  // ... state 定义
  
  // 自动持久化
  watch([downloadingList, finishedList], () => {
    repository.save(downloadingList.value, finishedList.value)
  }, { deep: true })
  
  // 或使用 $subscribe（Pinia 内置）
  // store.$subscribe((mutation, state) => {
  //   repository.save(state)
  // })
})
```

**推荐理由：**
1. **Setup Store**：更好的 TypeScript 推断，符合 Composition API 风格
2. **Repository 模式**：分离数据访问逻辑，便于测试和替换存储实现
3. **Getters 组织**：集中定义计算属性，提高可读性
4. **模块化**：按领域划分，清晰的职责边界

---

## 4. Vue 3 Composition API 的架构模式

### 4.1 Composables 组织结构

```
src/
├── composables/
│   ├── index.ts               # 统一导出
│   ├── core/                  # 核心 composables
│   │   ├── useAlert.ts
│   │   ├── useLoading.ts
│   │   └── useNotification.ts
│   │
│   ├── domain/                # 领域 composables
│   │   ├── useWallpaper.ts
│   │   ├── useDownload.ts
│   │   └── useLocalFiles.ts
│   │
│   └── utils/                 # 工具 composables
│       ├── useDebounce.ts
│       ├── useThrottle.ts
│       └── useInfiniteScroll.ts
```

### 4.2 Composable 最佳实践

#### 命名规范

```typescript
// ✅ 以 use 开头
export function useAlert() { ... }
export function useWallpaperList() { ... }

// ❌ 避免
export function alert() { ... }
export function getAlert() { ... }
```

#### 返回值模式

```typescript
// composables/useAlert.ts
import { ref, computed } from 'vue'

export function useAlert() {
  // 内部状态（私有）
  const alerts = ref<AlertItem[]>([])
  
  // Getters
  const visibleAlerts = computed(() => 
    alerts.value.filter(a => a.visible)
  )
  
  // Actions
  function show(message: string, type: AlertType = 'info') {
    const alert: AlertItem = {
      id: generateId(),
      message,
      type,
      visible: true
    }
    alerts.value.push(alert)
    
    // 自动消失
    setTimeout(() => dismiss(alert.id), 3000)
  }
  
  function dismiss(id: string) {
    const index = alerts.value.findIndex(a => a.id === id)
    if (index > -1) {
      alerts.value.splice(index, 1)
    }
  }
  
  // 返回响应式引用和函数
  return {
    alerts,           // 只读状态
    visibleAlerts,    // 计算属性
    show,             // 方法
    dismiss           // 方法
  }
}
```

#### 响应式参数

```typescript
// 接受响应式参数
export function useWallpaperList(source: Ref<Wallpaper[]>) {
  const filtered = computed(() => 
    source.value.filter(w => w.selected)
  )
  
  // 监听参数变化
  watch(source, (newList) => {
    console.log('List changed:', newList.length)
  })
  
  return { filtered }
}

// 使用
const wallpapers = ref<Wallpaper[]>([])
const { filtered } = useWallpaperList(wallpapers)
```

### 4.3 当前项目 Composables 重构建议

#### 统一 Alert 管理（高优先级）

当前 Alert 状态在 4+ 个组件中重复，建议提取为 composable：

```typescript
// composables/core/useAlert.ts
import { ref, computed } from 'vue'
import type { AlertType } from '@/types'

interface AlertItem {
  id: string
  message: string
  type: AlertType
  visible: boolean
  timeout?: number
}

export function useAlert() {
  const alerts = ref<AlertItem[]>([])
  
  const latest = computed(() => alerts.value[alerts.value.length - 1])
  
  function show(message: string, type: AlertType = 'info', timeout = 3000) {
    const id = crypto.randomUUID()
    alerts.value.push({ id, message, type, visible: true })
    
    if (timeout > 0) {
      setTimeout(() => dismiss(id), timeout)
    }
    
    return id
  }
  
  function dismiss(id: string) {
    const index = alerts.value.findIndex(a => a.id === id)
    if (index > -1) {
      alerts.value[index].visible = false
      setTimeout(() => {
        alerts.value = alerts.value.filter(a => a.id !== id)
      }, 300) // 等待动画完成
    }
  }
  
  function clear() {
    alerts.value = []
  }
  
  // 便捷方法
  const success = (msg: string) => show(msg, 'success')
  const error = (msg: string) => show(msg, 'error')
  const warning = (msg: string) => show(msg, 'warning')
  const info = (msg: string) => show(msg, 'info')
  
  return {
    alerts,
    latest,
    show,
    dismiss,
    clear,
    success,
    error,
    warning,
    info
  }
}
```

#### 无限滚动 Composable

```typescript
// composables/utils/useInfiniteScroll.ts
import { ref, onMounted, onUnmounted } from 'vue'

interface InfiniteScrollOptions {
  threshold?: number      // 距离底部多少像素触发
  throttle?: number       // 节流时间
}

export function useInfiniteScroll(
  loader: () => Promise<void>,
  options: InfiniteScrollOptions = {}
) {
  const { threshold = 200, throttle = 300 } = options
  const isLoading = ref(false)
  const hasMore = ref(true)
  
  let lastTrigger = 0
  
  async function handleScroll() {
    const now = Date.now()
    if (now - lastTrigger < throttle) return
    
    const { scrollTop, scrollHeight, clientHeight } = document.documentElement
    const nearBottom = scrollHeight - scrollTop - clientHeight < threshold
    
    if (nearBottom && !isLoading.value && hasMore.value) {
      lastTrigger = now
      isLoading.value = true
      try {
        await loader()
      } finally {
        isLoading.value = false
      }
    }
  }
  
  onMounted(() => {
    window.addEventListener('scroll', handleScroll, { passive: true })
  })
  
  onUnmounted(() => {
    window.removeEventListener('scroll', handleScroll)
  })
  
  return {
    isLoading,
    hasMore,
    reset: () => {
      hasMore.value = true
      isLoading.value = false
    }
  }
}
```

### 4.4 服务层抽象

```typescript
// services/electron/index.ts
import type { IpcInvoke } from '@/shared/types/ipc'

class ElectronService {
  private api: IpcInvoke
  
  constructor() {
    this.api = window.electronAPI
  }
  
  // 文件系统
  async selectFolder() {
    return this.api.selectFolder()
  }
  
  async readDirectory(path: string) {
    return this.api.readDirectory({ path })
  }
  
  // 下载
  onDownloadProgress(callback: (data: DownloadProgress) => void) {
    return this.api.onDownloadProgress(callback)
  }
  
  // ... 其他方法
}

export const electronService = new ElectronService()

// 在组件中使用
const folder = await electronService.selectFolder()
```

### 4.5 组件设计模式

#### 视图组件（View/Page）

```typescript
// views/OnlineWallpaper.vue
<script setup lang="ts">
import { useWallpaperStore } from '@/stores/wallpaper'
import { useInfiniteScroll } from '@/composables/utils/useInfiniteScroll'
import { useAlert } from '@/composables/core/useAlert'

// Store
const store = useWallpaperStore()

// Composables
const { isLoading, hasMore } = useInfiniteScroll(() => store.loadMore())
const alert = useAlert()

// 生命周期
onMounted(async () => {
  try {
    await store.fetchWallpapers()
  } catch (e) {
    alert.error('加载壁纸失败')
  }
})
</script>
```

#### 可复用组件

```typescript
// components/WallpaperList.vue
<script setup lang="ts">
import type { Wallpaper } from '@/types'

const props = defineProps<{
  wallpapers: Wallpaper[]
  loading?: boolean
  selectable?: boolean
}>()

const emit = defineEmits<{
  select: [wallpaper: Wallpaper]
  preview: [wallpaper: Wallpaper]
  download: [wallpaper: Wallpaper]
}>()

// 组件内部逻辑
</script>
```

**推荐理由：**
1. **Composables 复用逻辑**：避免组件间代码重复
2. **服务层抽象**：统一管理外部依赖，便于测试和替换
3. **清晰的职责分离**：视图负责展示，Composable 负责逻辑，Store 负责状态
4. **类型安全**：Composition API 配合 TypeScript 获得完整类型推断

---

## 5. 项目架构总览

### 推荐的整体架构

```
src/
├── main.ts                    # 应用入口
├── App.vue                    # 根组件
│
├── views/                     # 页面视图
│   ├── OnlineWallpaper.vue
│   ├── LocalWallpaper.vue
│   └── ...
│
├── components/                # 可复用组件
│   ├── common/               # 通用组件
│   │   ├── Alert.vue
│   │   └── LoadingOverlay.vue
│   └── wallpaper/            # 壁纸相关组件
│       ├── WallpaperList.vue
│       └── ImagePreview.vue
│
├── composables/              # 组合式函数
│   ├── core/
│   │   ├── useAlert.ts
│   │   └── useLoading.ts
│   ├── domain/
│   │   └── useWallpaper.ts
│   └── utils/
│       └── useInfiniteScroll.ts
│
├── stores/                   # Pinia 状态管理
│   └── modules/
│       ├── wallpaper/
│       └── download/
│
├── services/                 # 服务层
│   ├── electron/             # Electron API 封装
│   └── api/                  # 外部 API 封装
│
├── types/                    # 类型定义
│   ├── domain/
│   ├── api/
│   └── utils/
│
├── shared/                   # 主进程/渲染进程共享
│   └── types/
│       └── ipc.ts
│
├── utils/                    # 工具函数
│   ├── format.ts
│   └── validation.ts
│
└── router/                   # 路由配置
    └── index.ts

electron/
├── main/
│   ├── index.ts              # 主进程入口
│   └── ipc/
│       ├── index.ts          # IPC 注册
│       └── handlers/         # 按领域拆分
│
└── preload/
    └── index.ts              # Preload 脚本
```

### 数据流向

```
┌──────────────────────────────────────────────────────────────┐
│                        Renderer Process                       │
├──────────────────────────────────────────────────────────────┤
│  Views → Composables → Stores → Services → ElectronAPI       │
│                           ↓                                   │
│                     Pinia Store                               │
│                           ↓                                   │
│                      Services                                 │
└───────────────────────────┬──────────────────────────────────┘
                            │ IPC
                            ↓
┌──────────────────────────────────────────────────────────────┐
│                        Main Process                           │
├──────────────────────────────────────────────────────────────┤
│  Preload (contextBridge) → IPC Handlers → Node.js APIs       │
└──────────────────────────────────────────────────────────────┘
```

---

## 6. 置信度评估

| 主题 | 置信度 | 理由 |
|------|--------|------|
| IPC 类型安全模式 | 高 | 基于官方推荐和行业标准实践 |
| TypeScript 组织 | 高 | 符合 TypeScript 官方指南 |
| Pinia Setup Store | 高 | Pinia 3.x 推荐模式 |
| Composables 架构 | 高 | Vue 3 官方推荐的代码复用方式 |
| 整体架构 | 中高 | 基于项目实际情况和最佳实践综合 |

---

## 7. 与 Vue 3 / Electron 最新版本兼容性

| 技术 | 当前版本 | 最新版本 | 兼容性 |
|------|----------|----------|--------|
| Electron | v41.2.2 | v33+ | ✅ 完全兼容 |
| Vue | v3.5.32 | v3.4+ | ✅ 完全兼容 |
| Pinia | v3.0.4 | v2.1+ | ✅ 完全兼容 |
| TypeScript | v6.0.0 | v5.x | ✅ 完全兼容 |

**说明：**
- 项目版本均为最新稳定版
- 推荐模式与这些版本完全兼容
- 无需考虑版本迁移问题

---

## 8. 实施优先级建议

### 第一阶段：类型安全基础

1. 创建 `src/shared/types/ipc.ts` - IPC 类型定义
2. 重构 Preload 使用共享类型
3. 创建 `src/types/` 目录结构

### 第二阶段：IPC 模块化

1. 将 `handlers.ts` 按领域拆分
2. 实现统一的错误处理
3. 更新 Preload API

### 第三阶段：Composables 提取

1. 创建 `useAlert` composable
2. 提取 `useInfiniteScroll`
3. 创建服务层抽象

### 第四阶段：Store 重构

1. 为 Store 添加 Repository 层
2. 优化 Getters 组织
3. 实现持久化策略

---

*文档版本：v1.0*
*创建时间：2025-04-25*
