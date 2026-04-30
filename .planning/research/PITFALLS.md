# Electron + Vue 3 项目重构陷阱指南

> 本文档识别重构过程中的常见陷阱，帮助开发者避免破坏现有功能。

## 概述

基于对 Wallhaven 壁纸浏览器项目的分析，以下是重构过程中需要特别注意的陷阱分类：

---

## 1. IPC 重构的风险点

### 1.1 通道名称变更导致通信中断

**陷阱描述**：修改 IPC 通道名称会破坏 preload 脚本与主进程之间的通信契约。

**涉及文件**：
- `electron/main/ipc/handlers.ts` - 25 个 IPC 处理器
- `electron/preload/index.ts` - 对应的调用方

**警告信号**：
- 主进程控制台出现 `No handler registered for channel: xxx`
- 渲染进程收到 `Error: Error invoking remote method`

**预防策略**：
1. 创建通道名称常量文件 `electron/shared/ipc-channels.ts`，主进程和 preload 共享
2. 使用 TypeScript 字面量类型约束通道名称：
   ```typescript
   // electron/shared/ipc-channels.ts
   export const IPC_CHANNELS = {
     SELECT_FOLDER: 'select-folder',
     READ_DIRECTORY: 'read-directory',
     // ...
   } as const

   export type IpcChannel = typeof IPC_CHANNELS[keyof typeof IPC_CHANNELS]
   ```
3. 在 preload 中添加通道名称验证，拒绝未知的通道调用

**阶段映射**：阶段 1（IPC 模块化拆分）

---

### 1.2 消息格式不一致导致数据丢失

**陷阱描述**：修改 IPC 消息的参数结构或返回值格式，导致渲染进程无法正确解析数据。

**当前消息格式示例**（来自 `handlers.ts`）：
```typescript
// read-directory 返回格式
{ error: string | null, files: FileDetail[] }

// download-wallpaper 参数格式
{ url: string, filename: string, saveDir: string }

// store-get 返回格式
{ success: boolean, value: any, error?: string }
```

**警告信号**：
- 渲染进程访问 `undefined` 属性
- 数据显示异常或空白
- 控制台出现 `Cannot read property 'xxx' of undefined`

**预防策略**：
1. 为每个 IPC 消息定义 TypeScript 接口：
   ```typescript
   // electron/shared/ipc-types.ts
   export interface ReadDirectoryRequest {
     dirPath: string
   }

   export interface ReadDirectoryResponse {
     error: string | null
     files: FileDetail[]
   }
   ```
2. 保持消息格式向后兼容：新增字段使用可选属性，不删除现有字段
3. 添加运行时类型校验（可选使用 zod 等库）

**阶段映射**：阶段 1（IPC 模块化拆分）

---

### 1.3 进度回调监听器内存泄漏

**陷阱描述**：重构下载进度回调时，未正确移除事件监听器导致内存泄漏。

**当前实现**（`electron/preload/index.ts:123-130`）：
```typescript
onDownloadProgress: (callback: (data: any) => void) => {
  ipcRenderer.on('download-progress', (_event, data) => callback(data))
},
removeDownloadProgressListener: (callback: (data: any) => void) => {
  ipcRenderer.removeListener('download-progress', callback as any)
}
```

**警告信号**：
- 组件销毁后控制台仍有进度日志
- 下载任务数量异常增长
- 长时间运行后内存占用持续上升

**预防策略**：
1. 在 Vue 组件中使用 `onUnmounted` 钩子确保移除监听器：
   ```typescript
   onMounted(() => {
     window.electronAPI.onDownloadProgress(handleProgress)
   })

   onUnmounted(() => {
     window.electronAPI.removeDownloadProgressListener(handleProgress)
   })
   ```
2. 考虑使用 `useDownloadProgress` composable 封装监听器生命周期
3. 在 preload 中使用 `once` 方法替代 `on` 用于一次性事件

**阶段映射**：阶段 2（Composables 抽象）

---

### 1.4 错误处理不一致导致异常吞没

**陷阱描述**：不同 IPC 处理器的错误返回格式不一致，导致渲染进程无法统一处理错误。

**当前不一致示例**（来自 `handlers.ts`）：
```typescript
// 有些返回 { success: false, error: string }
ipcMain.handle('delete-file', async (_event, filePath: string) => {
  return { success: false, error: '文件不存在' }
})

// 有些返回 { error: string, files: [] }
ipcMain.handle('read-directory', async (_event, dirPath: string) => {
  return { error: '目录不存在', files: [] }
})

// 有些直接抛出异常
ipcMain.handle('window-minimize', async (event) => {
  // 无返回值，错误时可能抛异常
})
```

**警告信号**：
- 错误提示不统一
- 某些错误被静默忽略
- 用户看到 "Unknown error" 或无反馈

**预防策略**：
1. 定义统一的 IPC 响应类型：
   ```typescript
   interface IpcResponse<T = void> {
     success: boolean
     data?: T
     error?: string
   }
   ```
2. 创建错误处理中间件或包装函数
3. 为所有处理器添加统一的 try-catch 和日志

**阶段映射**：阶段 1（IPC 模块化拆分）

---

## 2. Store 重构的常见错误

### 2.1 shallowRef 与 reactive 混用导致响应性丢失

**陷阱描述**：`shallowRef` 用于大型数据优化性能，但深层属性修改不会触发更新。

**当前实现**（`src/stores/modules/wallpaper/state.ts:38-42`）：
```typescript
const totalPageData = shallowRef<TotalPageData>({
  totalPage: 0,
  currentPage: 0,
  sections: [],
})
```

**警告信号**：
- 数据已更新但 UI 未刷新
- 需要手动触发 `.value = ...` 才能更新
- Vue DevTools 显示数据但视图不响应

**预防策略**：
1. 对于 `shallowRef`，始终替换整个对象而非修改属性：
   ```typescript
   // 错误：不会触发更新
   totalPageData.value.currentPage = 5

   // 正确：创建新对象
   totalPageData.value = {
     ...totalPageData.value,
     currentPage: 5
   }
   ```
2. 在 actions 中添加注释说明数据结构的响应式特性
3. 考虑使用 `triggerRef()` 强制触发更新（谨慎使用）

**阶段映射**：阶段 2（Store 重构）

---

### 2.2 Store 直接调用 IPC 导致测试困难

**陷阱描述**：Store 直接依赖 `window.electronAPI`，无法在没有 Electron 环境时进行单元测试。

**当前问题示例**（`src/stores/modules/download/index.ts:89-102`）：
```typescript
const startDownload = async (id: string): Promise<void> => {
  // 直接依赖 window.electronAPI
  if (typeof window !== 'undefined' && window.electronAPI) {
    const selectedDir = await window.electronAPI.selectFolder()
    // ...
  }
}
```

**警告信号**：
- 单元测试报错 `window.electronAPI is undefined`
- 需要 mock 整个 Electron 环境才能测试
- Store 逻辑与 Electron 强耦合

**预防策略**：
1. 创建 Electron 服务层抽象：
   ```typescript
   // src/services/electron/index.ts
   export interface IElectronService {
     selectFolder(): Promise<string | null>
     startDownloadTask(params: DownloadParams): Promise<DownloadResult>
     // ...
   }

   export const electronService: IElectronService = {
     selectFolder: () => window.electronAPI.selectFolder(),
     // ...
   }
   ```
2. Store 通过依赖注入接收服务：
   ```typescript
   export const useDownloadStore = defineStore('download', () => {
     const electron = inject<IElectronService>('electronService')
     // 使用 electron.startDownloadTask() 而非 window.electronAPI
   })
   ```
3. 测试时注入 mock 实现

**阶段映射**：阶段 1（服务层抽象）

---

### 2.3 设置持久化时机不当导致数据丢失

**陷阱描述**：异步保存设置时应用意外关闭，导致设置丢失。

**当前实现**（`src/stores/modules/wallpaper/settings-storage.ts`）：
```typescript
export async function saveSettingsToStorage(settings: AppSettings): Promise<void> {
  try {
    await storeSet(SETTINGS_STORAGE_KEY, settings)
  } catch (err) {
    console.error('保存应用设置到 electron-store 失败:', err)
  }
}
```

**警告信号**：
- 重启应用后设置恢复为默认值
- 用户修改的下载路径丢失
- API Key 需要重新输入

**预防策略**：
1. 对于关键设置，使用同步保存：
   ```typescript
   // 紧急保存使用同步方法
   export function saveSettingsSync(settings: AppSettings): void {
     // 调用同步 IPC
     ipcRenderer.sendSync('store-set-sync', { key, value })
   }
   ```
2. 添加防抖机制避免频繁写入磁盘
3. 监听窗口关闭事件确保保存完成：
   ```typescript
   window.addEventListener('beforeunload', async (e) => {
     await saveSettingsToStorage(settings)
   })
   ```

**阶段映射**：阶段 2（Store 重构）

---

### 2.4 finishedList 数量限制导致历史记录丢失

**陷阱描述**：下载完成列表限制 50 条，重构时可能误改此限制或遗漏此逻辑。

**当前实现**（`src/stores/modules/download/index.ts:246-248`）：
```typescript
// 限制已完成列表数量（最多保留50条）
if (finishedList.value.length > 50) {
  finishedList.value = finishedList.value.slice(0, 50)
}
```

**警告信号**：
- 用户投诉下载历史记录无故消失
- 重构后历史记录数量异常
- `slice(0, 50)` 被误删除

**预防策略**：
1. 将限制值提取为可配置常量：
   ```typescript
   const MAX_FINISHED_ITEMS = 50

   if (finishedList.value.length > MAX_FINISHED_ITEMS) {
     finishedList.value = finishedList.value.slice(0, MAX_FINISHED_ITEMS)
   }
   ```
2. 添加单元测试验证限制逻辑
3. 在重构文档中明确标注此业务规则

**阶段映射**：阶段 2（Store 重构）

---

## 3. 类型安全改造的陷阱

### 3.1 消除 any 时过度类型细化

**陷阱描述**：将 `any` 替换为具体类型时，类型定义过于严格，导致运行时类型错误。

**当前 `any` 使用位置**（来自 CONCERNS.md）：
- `handlers.ts`: 27 处
- `wallpaperApi.ts`: 13 处
- `helpers.ts`: 10 处
- `preload/index.ts`: 10 处

**警告信号**：
- TypeScript 编译通过但运行时报错
- API 响应格式变更导致类型不匹配
- 第三方库返回意外类型

**预防策略**：
1. 使用渐进式类型强化：
   ```typescript
   // 第一步：使用 unknown 替代 any
   function handle(data: unknown) {
     // 运行时类型检查
     if (typeof data === 'object' && data !== null) {
       // ...
     }
   }

   // 第二步：定义具体类型并添加类型守卫
   function isWallpaperItem(data: unknown): data is WallpaperItem {
     return typeof data === 'object'
       && data !== null
       && 'id' in data
       && 'path' in data
   }
   ```
2. 优先使用 TypeScript 的 `satisfies` 操作符
3. 为 API 响应添加运行时验证（zod 或自定义守卫）

**阶段映射**：阶段 3（类型安全强化）

---

### 3.2 类型定义重复导致不一致

**陷阱描述**：同一类型在多处定义，重构时修改一处但遗漏其他位置。

**当前重复定义示例**：
```typescript
// src/stores/modules/wallpaper/state.ts:8-18
export interface AppSettings {
  downloadPath: string
  maxConcurrentDownloads: number
  apiKey: string
  wallpaperFit: 'fill' | 'fit' | 'stretch' | 'tile' | 'center' | 'span'
}

// src/types/index.ts:218-228 - 相同类型重复定义
export interface AppSettings {
  downloadPath: string
  maxConcurrentDownloads: number
  apiKey: string
  wallpaperFit: WallpaperFit
}
```

**警告信号**：
- TypeScript 提示 "Type A is not assignable to Type B"
- 修改一处类型后编译错误增加
- IDE 自动导入错误的类型定义

**预防策略**：
1. 统一类型定义位置：`src/types/` 目录
2. 使用 barrel export 统一导出：
   ```typescript
   // src/types/index.ts
   export * from './wallpaper'
   export * from './download'
   export * from './settings'
   ```
3. 添加 ESLint 规则禁止重复类型定义

**阶段映射**：阶段 3（类型安全强化）

---

### 3.3 IPC 消息类型与运行时不匹配

**陷阱描述**：TypeScript 类型定义与实际 IPC 消息结构不一致，编译通过但运行失败。

**问题示例**：
```typescript
// env.d.ts:68 - 类型定义
storeGet: (key: string) => Promise<{ success: boolean; value: any; error?: string }>

// electron/preload/index.ts:174 - 实际返回
storeGet: (key: string) => {
  return ipcRenderer.invoke('store-get', key)  // 返回 Promise<any>
}
```

**警告信号**：
- 访问 `result.value` 时得到 `undefined`
- 类型提示有某个属性但实际不存在
- IPC 调用后数据结构异常

**预防策略**：
1. 使用共享类型文件确保一致性：
   ```typescript
   // electron/shared/types.ts
   export interface StoreGetResult<T = unknown> {
     success: boolean
     value: T | null
     error?: string
   }
   ```
2. 在 preload 和 env.d.ts 中引用同一类型
3. 添加类型测试文件验证类型正确性

**阶段映射**：阶段 1（IPC 模块化拆分）

---

### 3.4 Vue 组件 Props 类型推断失败

**陷阱描述**：重构组件时 Props 类型定义不当，导致模板中无类型提示或类型错误。

**警告信号**：
- 模板中使用 props 属性无智能提示
- `defineProps` 类型推断为 `any`
- 父组件传递错误的 props 类型无警告

**预防策略**：
1. 使用 TypeScript 泛型定义 Props：
   ```typescript
   // 推荐
   interface Props {
     pageData: PageData
     loading: boolean
   }
   const props = defineProps<Props>()

   // 或使用 withDefaults
   const props = withDefaults(defineProps<Props>(), {
     loading: false
   })
   ```
2. 避免使用运行时 Props 声明与 TypeScript 混用
3. 为复杂 Props 类型添加 JSDoc 注释

**阶段映射**：阶段 3（类型安全强化）

---

## 4. 保持向后兼容的注意事项

### 4.1 electron-store 键名变更导致数据丢失

**陷阱描述**：修改存储键名后，用户升级应用时丢失所有历史数据。

**当前存储键**（来自 `electron/main/index.ts:14-24`）：
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

**警告信号**：
- 升级后用户设置重置
- 下载历史记录清空
- API Key 需要重新输入

**预防策略**：
1. 保持存储键名不变
2. 如必须变更，添加数据迁移逻辑：
   ```typescript
   // 迁移旧数据到新键名
   function migrateOldData() {
     const oldData = store.get('oldKey')
     if (oldData) {
       store.set('newKey', oldData)
       store.delete('oldKey')
     }
   }
   ```
3. 在 CHANGELOG 中明确标注存储格式变更

**阶段映射**：所有阶段

---

### 4.2 缩略图缓存路径变更导致图片加载失败

**陷阱描述**：修改缩略图存储位置后，已生成的缩略图无法加载。

**当前缓存路径**（`handlers.ts:186-195`）：
```typescript
const cacheDir = path.join(dirPath, '.thumbnails')
const thumbnailFilePath = path.join(cacheDir, `${baseName}_thumb.jpg`)
```

**警告信号**：
- 本地壁纸显示为空白或加载失败
- 控制台大量 404 错误
- 缩略图重新生成消耗大量 CPU

**预防策略**：
1. 保持缓存目录结构不变
2. 如必须变更，添加缓存迁移或重新生成逻辑
3. 提供"重建缓存"功能供用户手动触发

**阶段映射**：阶段 1（IPC 模块化拆分）

---

### 4.3 自定义协议格式变更

**陷阱描述**：修改 `wallhaven://` 协议格式后，已保存的本地壁纸路径失效。

**当前协议实现**（`electron/main/index.ts:36-78`）：
```typescript
protocol.handle('wallhaven', (request) => {
  const filePath = decodeURIComponent(request.url.replace(/^wallhaven:\/\//, ''))
  // ...
})
```

**警告信号**：
- 本地壁纸无法显示
- 图片预览功能异常
- URL 解析错误

**预防策略**：
1. 协议格式一旦确定不可变更
2. 添加版本号支持未来迁移：
   ```
   wallhaven://v1/{path}
   ```
3. 保持向后兼容的 URL 解析逻辑

**阶段映射**：阶段 1（IPC 模块化拆分）

---

### 4.4 API 请求参数格式变更

**陷阱描述**：修改发送给 Wallhaven API 的参数格式，导致搜索结果异常。

**当前参数转换**（`src/stores/modules/wallpaper/actions.ts:28-35`）：
```typescript
const finalParams = params
  ? (Object.fromEntries(
      Object.entries(params).filter(
        ([_, value]) => value !== null && value !== undefined && value !== '',
      ),
    ) as GetParams)
  : null
```

**警告信号**：
- 搜索返回空结果
- 筛选条件不生效
- 分页异常

**预防策略**：
1. 保持参数名称与 Wallhaven API 文档一致
2. 添加参数格式单元测试
3. 在 API 服务层统一处理参数转换

**阶段映射**：阶段 1（服务层抽象）

---

## 5. 其他常见陷阱

### 5.1 Alert 状态管理重复

**陷阱描述**：重构时未提取 Alert composable，导致重复代码持续存在。

**当前重复位置**（来自 CONCERNS.md）：
- `src/views/OnlineWallpaper.vue`
- `src/views/LocalWallpaper.vue`
- `src/views/SettingPage.vue`
- `src/views/DownloadWallpaper.vue`

**警告信号**：
- 不同页面的 Alert 行为不一致
- 修改 Alert 逻辑需要改多处
- 添加新功能时重复复制代码

**预防策略**：
1. 创建 `useAlert` composable：
   ```typescript
   // src/composables/useAlert.ts
   export function useAlert() {
     const alert = reactive({
       visible: false,
       type: 'info' as AlertType,
       message: '',
       duration: 3000
     })

     const showAlert = (message: string, type: AlertType = 'info', duration = 3000) => {
       alert.message = message
       alert.type = type
       alert.duration = duration
       alert.visible = true
     }

     return { alert, showAlert }
   }
   ```
2. 在所有视图组件中统一使用
3. 添加 Alert 行为的单元测试

**阶段映射**：阶段 2（Composables 抽象）

---

### 5.2 遗漏 window.electronAPI 存在性检查

**陷阱描述**：在非 Electron 环境（如浏览器测试）中调用 `window.electronAPI` 导致错误。

**正确检查模式**（`src/utils/store.ts:9-12`）：
```typescript
if (typeof window === 'undefined' || !window.electronAPI) {
  console.warn('[Store] electronAPI not available, returning null')
  return null
}
```

**警告信号**：
- 浏览器控制台报错 `Cannot read property 'xxx' of undefined`
- 单元测试失败
- 开发环境下功能异常

**预防策略**：
1. 创建统一的 Electron API 访问工具：
   ```typescript
   // src/utils/electron.ts
   export function isElectronEnv(): boolean {
     return typeof window !== 'undefined' && !!window.electronAPI
   }

   export function getElectronAPI(): ElectronAPI | null {
     return isElectronEnv() ? window.electronAPI : null
   }
   ```
2. 所有 Electron API 调用通过工具函数访问
3. 添加非 Electron 环境的 fallback 行为

**阶段映射**：阶段 1（服务层抽象）

---

### 5.3 Vue reactive proxy 无法通过 IPC 传递

**陷阱描述**：将 Vue reactive 对象直接传给 IPC 会导致克隆错误。

**当前处理**（`src/utils/store.ts:38-39`）：
```typescript
// 深度克隆对象，移除 Vue reactive proxy，避免 IPC 克隆错误
const plainValue = JSON.parse(JSON.stringify(value))
```

**警告信号**：
- 主进程收到 `An object could not be cloned` 错误
- 数据传递失败
- 控制台出现 structured clone 相关错误

**预防策略**：
1. 在 IPC 通信边界始终序列化/反序列化
2. 使用 `toRaw()` 获取原始对象（性能更好）：
   ```typescript
   import { toRaw } from 'vue'
   const plainValue = toRaw(reactiveValue)
   ```
3. 在服务层统一处理此转换

**阶段映射**：阶段 1（服务层抽象）

---

## 6. 断点续传功能陷阱（v2.1 里程碑）

> 研究：在现有 Electron 应用中添加断点续传功能时可能遇到的问题

### 研究背景

**当前里程碑**: v2.1 下载断点续传
**目标**: 为现有下载功能添加断点续传能力

**当前实现状态**:
- 现有下载功能使用 `axios` + `stream` 流式下载
- 支持暂停/取消功能，使用 `AbortController` 实现
- 暂停后恢复会**重新开始下载**，不支持断点续传
- 临时文件命名为 `.download` 后缀，但暂停时会被删除

---

### 6.1 文件损坏风险（File Corruption During Partial Writes）

**陷阱描述**: 暂停下载时，临时文件可能处于不完整状态。如果写入流未正确关闭，文件可能损坏。

**当前代码风险点** (`download.handler.ts:194-225`):
```typescript
const writer = fs.createWriteStream(tempPath)
// ... 流式写入
await streamPipeline(response.data, writer)
```

**潜在问题**:
- `streamPipeline` 在 abort 时可能留下不完整文件
- 未使用 `flags: 'a'` 追加模式，恢复时无法续写
- 没有文件完整性校验机制

**警告信号**:
- 恢复下载后文件大小异常
- 图片无法打开或显示损坏
- 文件大小与预期不符

**预防策略**:
1. 使用追加写入模式 `fs.createWriteStream(tempPath, { flags: 'a' })`
2. 记录已下载字节数，恢复时验证临时文件大小
3. 实现文件哈希校验（如 ETag/Content-MD5）
4. 写入完成后进行原子重命名（当前已实现）

**应对阶段**: 阶段 1 - 断点续传核心实现

---

### 6.2 服务器不支持 Range 请求（Server Range Support）

**陷阱描述**: 并非所有服务器都支持 HTTP Range 请求头，断点续传依赖服务器返回 `206 Partial Content`。

**Wallhaven API 情况**:
- Wallhaven 图片服务器（CDN）通常支持 Range 请求
- 但第三方图床链接可能不支持

**当前代码缺失**:
```typescript
// 当前实现未检查服务器是否支持 Range
const response = await axios({
  method: 'GET',
  url,
  // 缺少 Range 头设置
})
```

**警告信号**:
- 恢复下载时服务器返回 200 而非 206
- 下载进度超过 100%
- 文件大小与预期不符

**预防策略**:
1. 下载前发送 HEAD 请求检查 `Accept-Ranges: bytes` 响应头
2. 如不支持 Range，标记任务为"不支持续传"，暂停后只能重新下载
3. 缓存服务器能力信息，避免重复检查
4. 用户界面提示哪些任务支持续传

**检测逻辑**:
```typescript
async function checkRangeSupport(url: string): Promise<boolean> {
  const response = await axios.head(url)
  return response.headers['accept-ranges'] === 'bytes'
}
```

**应对阶段**: 阶段 1 - 断点续传核心实现

---

### 6.3 服务器文件变更（File Changed Between Pause and Resume）

**陷阱描述**: 暂停期间服务器上的文件可能已更新，恢复下载会导致文件内容混乱。

**检测方法**:
- 比较 `Content-Length` 是否变化
- 使用 ETag 或 Last-Modified 头验证

**当前代码缺失**:
```typescript
const totalSize = parseInt(String(response.headers['content-length'] || '0'), 10)
// 未保存 ETag 或 Last-Modified
```

**警告信号**:
- 恢复下载后图片显示异常
- 文件大小与实际内容不匹配
- 图片部分区域显示错误

**预防策略**:
1. 首次下载时保存 `ETag` 和 `Last-Modified` 头
2. 恢复下载时发送条件请求 `If-Match` 或 `If-Unmodified-Since`
3. 如果验证失败，提示用户文件已更新，需重新下载
4. 将元数据存储在持久化存储中

**存储结构建议**:
```typescript
interface DownloadMetadata {
  taskId: string
  url: string
  etag?: string
  lastModified?: string
  contentLength: number
  downloadedBytes: number
  tempPath: string
}
```

**应对阶段**: 阶段 2 - 进度持久化

---

### 6.4 临时文件清理问题（Temp File Cleanup Issues）

**陷阱描述**: 临时文件可能因为各种原因未被正确清理，占用磁盘空间。

**当前实现问题** (`download.handler.ts:39-52`):
```typescript
function cleanupDownload(taskId: string): void {
  // 暂停时也会删除临时文件！
  if (fs.existsSync(download.tempPath)) {
    fs.unlinkSync(download.tempPath) // 这会阻止续传
  }
}
```

**风险场景**:
- 应用崩溃时临时文件残留
- 暂停后取消任务，临时文件可能残留
- 磁盘空间不足时无法创建新文件

**警告信号**:
- 下载目录存在大量 `.download` 文件
- 磁盘空间异常占用
- 恢复下载失败找不到临时文件

**预防策略**:
1. 暂停时**保留**临时文件，仅取消时删除
2. 应用启动时扫描并清理孤立临时文件（超过一定时间）
3. 提供手动清理功能
4. 设置临时文件过期时间（如 7 天）

**清理策略**:
```typescript
// 应用启动时清理孤立临时文件
function cleanOrphanedTempFiles(downloadDir: string): void {
  const files = fs.readdirSync(downloadDir)
  const now = Date.now()

  files
    .filter(f => f.endsWith('.download'))
    .forEach(f => {
      const stat = fs.statSync(path.join(downloadDir, f))
      const age = now - stat.mtimeMs
      // 清理超过 7 天的临时文件
      if (age > 7 * 24 * 60 * 60 * 1000) {
        fs.unlinkSync(path.join(downloadDir, f))
      }
    })
}
```

**应对阶段**: 阶段 2 - 进度持久化

---

### 6.5 状态持久化竞态条件（State Persistence Race Conditions）

**陷阱描述**: 多进程/多线程环境下，状态持久化可能导致数据不一致。

**当前架构风险**:
- `downloadRepository` 和 `downloadStore` 可能同时更新
- `finishedList` 和 `downloadingList` 存储在不同位置
- 缺少持久化任务状态（重启后丢失）

**当前存储状态**:
- `downloadingList`: 仅在内存（Pinia Store）
- `finishedList`: 持久化到 `electron-store`
- 断点续传需要持久化进行中任务

**警告信号**:
- 重启应用后下载进度丢失
- 同一任务多个副本
- 进度数据不一致

**预防策略**:
1. 使用单一数据源原则，统一持久化入口
2. 实现原子写入，避免部分更新
3. 添加版本号和校验和
4. 使用文件锁或队列机制防止并发写入

**持久化策略**:
```typescript
interface PersistedDownloadState {
  version: number
  tasks: DownloadItem[]
  metadata: Map<string, DownloadMetadata>
  lastUpdated: string
}
```

**应对阶段**: 阶段 2 - 进度持久化

---

### 6.6 流处理内存泄漏（Memory Leaks from Incomplete Stream Handling）

**陷阱描述**: 下载中断时，如果流未正确关闭，会导致内存泄漏和文件句柄泄漏。

**当前实现风险** (`download.handler.ts:194-225`):
```typescript
const writer = fs.createWriteStream(tempPath)
response.data.on('data', ...)
await streamPipeline(response.data, writer)
```

**风险点**:
- `AbortError` 发生时，事件监听器可能未移除
- `response.data.on('data', ...)` 监听器未显式移除
- 异常路径下可能留下打开的文件句柄

**警告信号**:
- 长时间运行后内存占用持续上升
- 文件句柄数不断增加
- 控制台出现 `EMFILE` 错误

**预防策略**:
1. 使用 `pipeline()` 而非手动 pipe（当前已使用）
2. 在 finally 块中清理所有事件监听器
3. 使用 `destroy()` 方法确保流完全关闭
4. 添加超时机制防止无限等待

**安全的流处理**:
```typescript
try {
  const response = await axios({ ... })
  const writer = fs.createWriteStream(tempPath, { flags: 'a' })

  // 设置超时
  const timeout = setTimeout(() => {
    writer.destroy(new Error('Write timeout'))
  }, 30000)

  try {
    await pipeline(response.data, writer)
  } finally {
    clearTimeout(timeout)
    response.data.destroy()
    writer.destroy()
  }
} catch (error) {
  // 确保清理
  if (response?.data) response.data.destroy()
  if (writer) writer.destroy()
}
```

**应对阶段**: 阶段 1 - 断点续传核心实现

---

### 6.7 应用崩溃时的写入操作（App Crash During Write Operations）

**陷阱描述**: 应用崩溃时，正在进行的写入操作可能导致文件损坏或数据丢失。

**崩溃场景**:
- 用户强制退出应用
- 系统崩溃或断电
- 渲染进程崩溃
- 主进程崩溃

**当前实现风险**:
- 进度数据仅在内存，崩溃后丢失
- 临时文件可能处于不一致状态
- 重启后无法恢复下载

**警告信号**:
- 重启应用后下载任务消失
- 临时文件存在但无法恢复
- 进度显示异常

**预防策略**:
1. 实现定期持久化进度（如每 1MB 或每 5 秒）
2. 使用原子写入模式（先写临时文件，再重命名）
3. 应用启动时检查并恢复未完成任务
4. 实现写前日志（WAL）或检查点机制

**恢复策略**:
```typescript
// 应用启动时
async function recoverDownloads(): Promise<void> {
  const persisted = await loadPersistedDownloads()

  for (const task of persisted.tasks) {
    // 验证临时文件
    if (fs.existsSync(task.tempPath)) {
      const actualSize = fs.statSync(task.tempPath).size
      if (actualSize === task.downloadedBytes) {
        // 恢复下载
        resumeDownload(task)
      } else {
        // 文件不一致，需要重新下载
        task.state = 'failed'
      }
    } else {
      // 临时文件丢失，需要重新下载
      task.state = 'failed'
    }
  }
}
```

**应对阶段**: 阶段 2 - 进度持久化

---

### 断点续传风险矩阵

| 陷阱 | 影响程度 | 发生概率 | 检测难度 | 应对阶段 |
|------|---------|---------|---------|---------|
| 文件损坏 | 高 | 中 | 中 | 阶段 1 |
| 服务器不支持 Range | 中 | 低 | 低 | 阶段 1 |
| 服务器文件变更 | 高 | 低 | 中 | 阶段 2 |
| 临时文件清理 | 低 | 高 | 低 | 阶段 2 |
| 状态竞态条件 | 高 | 低 | 高 | 阶段 2 |
| 流内存泄漏 | 中 | 中 | 高 | 阶段 1 |
| 崩溃写入问题 | 高 | 低 | 中 | 阶段 2 |

---

### 断点续传预防检查清单

#### 阶段 1: 断点续传核心

- [ ] 检查服务器 Range 支持（HEAD 请求）
- [ ] 实现追加写入模式
- [ ] 正确处理 AbortError 清理流
- [ ] 保存和验证 Content-Length
- [ ] 错误处理：不支持续传时提示用户

#### 阶段 2: 进度持久化

- [ ] 设计持久化数据结构
- [ ] 实现定期进度保存
- [ ] 应用启动时恢复未完成任务
- [ ] 清理孤立临时文件
- [ ] 验证临时文件完整性

#### 测试验证

- [ ] 单元测试：Range 请求构建
- [ ] 集成测试：暂停/恢复流程
- [ ] 边界测试：服务器不支持 Range
- [ ] 压力测试：多任务并行下载
- [ ] 恢复测试：应用崩溃后重启

---

### 断点续传参考资料

- [HTTP Range Requests - MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Range_requests)
- [Electron net Module](https://www.electronjs.org/docs/latest/api/net)
- [Node.js Stream Best Practices](https://nodejs.org/api/stream.html)
- [Handling Aborted Requests in Axios](https://axios-http.com/docs/cancellation)

---

## 7. Store-to-Composable 迁移陷阱（v2.2 里程碑）

> 研究：将 views 中直接使用的 store 迁移到 composables 层时可能遇到的问题

### 研究背景

**当前里程碑**: v2.2 Store 分层迁移
**目标**: 将 views 中直接使用的 store 全部迁移到 composables，强化 View → Composable → Store 分层架构

**当前实现状态**:
- 已有部分 composables：`useWallpaperList`, `useDownload`, `useSettings`, `useAlert`
- 但 views 仍存在直接访问 store 的情况
- 需要完成完整的抽象层迁移

---

### 7.1 迁移过程中破坏响应式

**陷阱描述**: 在迁移过程中，computed 属性包装 store 状态时可能丢失响应式。

**当前代码模式**（OnlineWallpaper.vue:38）:
```vue
<div v-if="wallpaperStore.error" class="error-container">
```

**迁移后正确模式**:
```vue
<!-- In composable -->
const error = computed(() => store.error)

<!-- In view -->
<div v-if="error" class="error-container">
```

**常见错误**:
```typescript
// 错误：返回静态值，非响应式
const error = store.error

// 错误：双重 .value 导致响应式丢失
const error = computed(() => store.error.value)
```

**警告信号**:
- UI 不随 store 状态更新
- 需要手动刷新才能看到变化
- Vue DevTools 显示状态但视图不响应

**预防策略**:
1. 始终从 composables 返回 `ComputedRef`，不返回原始值
2. 使用 `computed(() => store.property)` 模式保持一致
3. 迁移后用 Vue DevTools 验证响应式

**应对阶段**: 阶段 2（数据层抽象）— 验证所有 computed 返回值

---

### 7.2 状态访问模式不一致

**陷阱描述**: 部分操作使用 composable，部分直接访问 store，导致状态管理混乱。

**当前不一致模式**（OnlineWallpaper.vue）:
```typescript
// Composable 用于部分操作
const { fetch: fetchWallpapers } = useWallpaperList()

// 直接访问 store 用于其他操作
const wallpaperStore = useWallpaperStore()
const apiKey = computed(() => wallpaperStore.settings.apiKey)
```

**警告信号**:
- 同一 store 的操作来自多个来源
- 调试时难以追踪状态变更来源
- 不同视图的相同功能实现不一致

**预防策略**:
1. 单个 store 的所有访问在单次原子提交中迁移
2. 使用 TypeScript 接口强制 composable 返回类型
3. 添加 ESLint 规则警告视图文件中的直接 store 导入

**应对阶段**: 阶段 3（业务层）— 每个 store 的迁移必须完整

---

### 7.3 Composable 与 Store 重复状态

**陷阱描述**: Composable 引入本地状态复制 store 状态，导致同步问题。

**反模式**:
```typescript
export function useWallpaperList() {
  const store = useWallpaperStore()

  // 错误：重复的本地状态
  const localWallpapers = ref<TotalPageData>({ ... })

  // 同步逻辑变得复杂且容易出错
  watch(() => store.totalPageData, (val) => {
    localWallpapers.value = val
  })
}
```

**正确模式**（已在 useWallpaperList.ts:189 中实现）:
```typescript
export function useWallpaperList(): UseWallpaperListReturn {
  const store = useWallpaperStore()

  // 正确：从 store 计算，单一数据源
  return {
    wallpapers: computed(() => store.totalPageData),
    loading: computed(() => store.loading),
    // ...
  }
}
```

**预防策略**:
1. Composables 不应持有重复状态
2. 使用 computed 属性暴露 store 状态
3. Store 保持单一数据源

**应对阶段**: 阶段 2（数据层）— composable 审查时强制执行

---

### 7.4 生命周期钩子迁移遗漏

**陷阱描述**: 事件监听器和订阅在视图中设置，但未随业务逻辑一起移动到 composables。

**当前模式**（OnlineWallpaper.vue:111-123）:
```typescript
onActivated(() => {
  window.addEventListener('scroll', throttledScrollEvent, { passive: true })
})

onDeactivated(() => {
  window.removeEventListener('scroll', throttledScrollEvent)
})
```

**风险**:
- 如果滚动逻辑移到 composable 但生命周期钩子留在视图中
- 事件监听器可能多次注册或未正确清理

**正确模式**（useDownload.ts:119-130）:
```typescript
export function useDownload(): UseDownloadReturn {
  let unsubscribe: (() => void) | null = null

  // Composable 管理自己的生命周期
  onMounted(() => {
    unsubscribe = downloadService.onProgress(handleProgress)
  })

  onUnmounted(() => {
    if (unsubscribe) {
      unsubscribe()
      unsubscribe = null
    }
  })
}
```

**预防策略**:
1. 迁移前审计视图中的所有生命周期钩子
2. 将相关生命周期逻辑与业务逻辑一起移动
3. 测试组件挂载/卸载周期

**应对阶段**: 阶段 3（业务层）— 每个组件的生命周期审计

---

### 7.5 KeepAlive 缓存状态破坏

**陷阱描述**: 使用 `<KeepAlive>` 的视图在 composable 模式变更时丢失缓存状态。

**当前架构**（router/index.ts）:
```vue
<KeepAlive>
  <router-view />
</KeepAlive>
```

**缓存内容**: `OnlineWallpaper`, `LocalWallpaper`, `DownloadWallpaper` 组件实例

**风险**:
- Composables 在 `setup()` 内创建，是实例级的
- Composable 中的状态不跨 KeepAlive 实例共享
- 如果 store 状态被重置，所有缓存组件都会看到变化

**常见错误**:
```typescript
// 在 composable 中
const localCache = ref<TotalPageData>({ ... })  // 错误：实例级

// Store 状态是共享的，本地 composable 状态不是
```

**预防策略**:
1. 所有共享状态必须保留在 Pinia stores 中
2. Composables 不应本地缓存 store 数据
3. 测试 KeepAlive 行为：导航离开、返回、验证状态保留

**应对阶段**: 阶段 5（表现层）— KeepAlive 集成测试

---

### 7.6 IPC 调用绕过服务层

**陷阱描述**: 视图直接调用 `window.electronAPI` 而非通过 composables。

**当前直接 IPC 调用**（OnlineWallpaper.vue:239, 302）:
```typescript
// 直接 IPC 调用 - 应通过 service/composable
const setResult = await window.electronAPI.setWallpaper(downloadResult.filePath)
return await window.electronAPI.downloadWallpaper({ ... })
```

**风险**:
- IPC 逻辑分散在视图中
- 错误处理不一致
- 无法为测试进行 mock

**目标架构**:
```typescript
// 在 composable 中
const setWallpaper = async (filePath: string): Promise<boolean> => {
  const result = await wallpaperService.setWallpaper(filePath)
  if (!result.success) {
    showError(result.error?.message || '设置壁纸失败')
    return false
  }
  return true
}

// 在视图中
const { setWallpaper } = useWallpaper()
await setWallpaper(filePath)
```

**预防策略**:
1. 为视图中使用的所有 IPC 操作创建 composable 方法
2. 添加 linting 检测视图文件中的 `window.electronAPI`
3. 服务层已存在 — composables 应使用服务

**应对阶段**: 阶段 3 & 4 — 创建缺失的 composable 方法

---

### 7.7 Alert 状态重复

**陷阱描述**: 视图和 composables 之间出现多个 alert 状态实例。

**当前模式**（已提取到 useAlert.ts）:
```typescript
// 在视图中 - 已建立正确模式
const { alert, showSuccess, showError, hideAlert } = useAlert()
```

**当前状态**: 所有视图（LocalWallpaper, SettingPage, DownloadWallpaper, OnlineWallpaper）都正确使用 `useAlert()`

**迁移风险**:
- 如果 composable 创建新的 alert 状态实例
- 来自不同视图的 alert 将相互独立
- 用户可能同时看到多个 alert

**预防策略**:
1. `useAlert` 已使用共享 store — 保持此模式
2. 不要在其他 composables 中创建本地 alert 状态
3. Composables 应调用 `useAlert()` 显示错误，不管理 alert 状态

**应对阶段**: 阶段 2 — 验证 alert 状态共享

---

### 7.8 类型安全退化

**陷阱描述**: 迁移期间 TypeScript 接口变得不够严格。

**当前良好模式**（useWallpaperList.ts:27-42）:
```typescript
export interface UseWallpaperListReturn {
  // 状态（ComputedRef）
  wallpapers: ComputedRef<TotalPageData>
  loading: ComputedRef<boolean>
  // ...显式类型
}
```

**常见错误**:
```typescript
// 错误：隐式 any，丢失类型检查
export function useWallpaperList() {
  return {
    wallpapers: computed(() => store.totalPageData),  // 推断类型
    // ...
  }
}
```

**预防策略**:
1. 为所有 composables 定义显式返回类型接口
2. 启用严格 TypeScript 检查
3. 在 CI 中运行类型检查

**应对阶段**: 阶段 1（类型安全）— 先建立接口

---

## 8. 集成陷阱

### 8.1 组件测试 Mocking 复杂度

**陷阱描述**: 直接访问 store 时测试变得难以编写。

**迁移前（视图直接使用 store）**:
```typescript
// 测试设置 - 必须模拟 Pinia store
const mockStore = {
  totalPageData: { sections: [], totalPage: 0, currentPage: 0 },
  loading: false,
}
vi.mock('@/stores/wallpaper', () => ({
  useWallpaperStore: () => mockStore
}))
```

**迁移后（视图使用 composable）**:
```typescript
// 测试设置 - 模拟 composable
const mockComposable = {
  wallpapers: computed(() => mockData),
  loading: computed(() => false),
}
vi.mock('@/composables', () => ({
  useWallpaperList: () => mockComposable
}))
```

**风险**:
- 现有测试（如有）将失败
- 测试迁移工作量被低估

**预防策略**:
1. 视图迁移同时迁移测试
2. Composables 应更易于测试（单元测试友好）
3. 视图变成薄展示层

**应对阶段**: 阶段 5 — 更新测试文件

---

### 8.2 循环依赖引入

**陷阱描述**: composables 和 stores 之间出现导入循环。

**风险模式**:
```typescript
// 在 store 文件中
import { useAlert } from '@/composables'  // Store 导入 composable

// 在 composable 文件中
import { useWallpaperStore } from '@/stores'  // Composable 导入 store

// 循环依赖！
```

**当前安全模式**:
```typescript
// Stores 不导入 composables
// Composables 导入 stores
// Services 被 composables 导入，不被 stores 导入
```

**预防策略**:
1. 保持单向依赖：View → Composable → Store → Service
2. Stores 永远不应从 composables 导入
3. 如需跨层通信，使用依赖注入

**应对阶段**: 阶段 1 — 验证导入结构

---

## 9. CSS/Vue 动画性能优化陷阱（v2.8 里程碑）

> 研究：优化 ImagePreview 组件动画性能时可能遇到的问题

### 研究背景

**当前里程碑**: v2.8 优化动画性能
**目标**: 优化 ImagePreview 组件的动画性能，确保流畅 60fps 体验

**当前实现状态**:
- 使用 `blur(40px)` 滤镜实现模糊过渡效果
- 复杂的 transform 组合：`translateX + scaleX + scaleY`
- Vue Transition 组件用于图片切换动画
- 所有尺寸图片都使用相同动画

**已识别问题**:
- 所有尺寸图片动画卡顿/延迟
- 动画开始/结束有明显的延迟
- GPU 内存可能存在问题

---

### 9.1 Blur 滤镜性能陷阱

**陷阱描述**: CSS `filter: blur()` 是 GPU 密集型操作，模糊半径越大性能开销越高。

**当前实现**（ImagePreview.vue:483-484, 503-504）:
```css
filter: blur(40px);  /* 40px 模糊半径非常大 */
```

**性能影响**:
- 模糊滤镜需要对每个像素进行采样计算
- 模糊半径每增加 1px，计算复杂度指数增长
- 40px 模糊需要采样 81x81 像素区域（40*2+1）
- 大图片（如 4K 壁纸）计算量极其巨大

**警告信号**:
- 动画帧率从 60fps 降至 30fps 或更低
- 动画开始时有明显延迟（模糊计算初始化）
- CPU/GPU 风扇噪音增加
- 移动设备或低端 GPU 卡顿更严重

**预防策略**:
1. **降低模糊半径**: 使用 8-12px 代替 40px，视觉效果接近但性能提升 10x+
2. **使用 opacity 代替 blur**: 渐变透明度同样能表达"过渡感"
3. **预计算模糊**: 使用静态模糊图片而非实时滤镜
4. **限制应用范围**: 只在小元素上使用模糊，避免全屏大图

**替代方案**:
```css
/* 方案 1：降低模糊半径 */
filter: blur(10px);  /* 性能提升约 16x */

/* 方案 2：使用 opacity */
opacity: 0.3;

/* 方案 3：组合 scale + opacity */
transform: scale(1.05);
opacity: 0;
```

**应对阶段**: 阶段 1 - 动画性能分析

---

### 9.2 Transform 多属性组合陷阱

**陷阱描述**: 同时动画多个 transform 属性可能导致合成层爆炸和 GPU 内存问题。

**当前实现**（ImagePreview.vue:477-489）:
```css
transform: translateX(-1000px) scaleX(2.5) scaleY(0.2);
/* 同时动画 translateX + scaleX + scaleY */
```

**性能影响**:
- 每个 transform 属性变化都需要重新计算合成层
- 组合 transform 会增加 GPU 合成复杂度
- `scaleX/Y` 创建新的合成层，占用额外 GPU 内存
- 动画过程中不断分配/释放 GPU 内存

**警告信号**:
- 动画开始时内存峰值
- 长时间使用后 GPU 内存不足
- Chrome DevTools Layers 面板显示大量临时层
- 动画结束后页面轻微卡顿（GPU 内存回收）

**预防策略**:
1. **简化 transform**: 只使用单一 transform 属性
2. **使用 will-change**: 提前告知浏览器优化
3. **避免 scale 剧烈变化**: 保持 scale 在 0.9-1.1 范围内
4. **使用 translate 替代 translateX/Y**: 减少属性数量

**优化方案**:
```css
/* 当前（复杂） */
transform: translateX(-1000px) scaleX(2.5) scaleY(0.2);

/* 优化（简化） */
transform: translateX(-100%);
will-change: transform;
```

**应对阶段**: 阶段 1 - 动画性能分析

---

### 9.3 GPU 内存溢出陷阱

**陷阱描述**: 大图片动画会占用大量 GPU 内存，可能导致内存溢出或性能下降。

**当前实现问题**:
- 壁纸图片通常很大（1920x1080 到 4K）
- 动画过程中 GPU 需要存储源图 + 目标图 + 合成层
- blur 滤镜需要额外的采样缓冲区
- Electron 渲染进程 GPU 内存有限

**内存估算**:
```
一张 4K 图片 (3840x2160):
- 原始: 3840 * 2160 * 4 bytes (RGBA) = ~33MB
- blur(40px) 额外缓冲: ~33MB * 3 = ~99MB
- 合成层: ~33MB
- 总计: ~165MB GPU 内存 / 张

动画切换时（源图 + 目标图）: ~330MB
```

**警告信号**:
- 动画时 Electron 内存占用飙升
- 长时间使用后页面变慢
- 控制台出现 GPU 进程崩溃警告
- 黑屏或图片显示异常

**预防策略**:
1. **使用缩略图进行动画**: 动画时使用小图，动画结束后替换为大图
2. **限制并发动画**: 避免同时动画多张大图
3. **及时清理 GPU 资源**: 动画结束后强制垃圾回收
4. **使用 CSS containment**: 限制渲染计算范围

**实现示例**:
```typescript
// 动画时使用缩略图
const animatedImage = computed(() => {
  if (isAnimating.value) {
    return thumbnailUrl.value  // 小图
  }
  return fullImageUrl.value    // 大图
})
```

**应对阶段**: 阶段 2 - 动画方案优化

---

### 9.4 Vue Transition 关键帧陷阱

**陷阱描述**: Vue Transition 的 `mode="out-in"` 会导致旧元素完全退出后才播放新元素动画，造成感知延迟。

**当前实现**（ImagePreview.vue:29-32）:
```vue
<Transition :name="slideDirection" mode="out-in">
  <img v-if="imgInfo" :key="imgInfo.id" ...>
</Transition>
```

**问题分析**:
- `mode="out-in"` 串行执行动画
- 退出动画 300ms + 进入动画 300ms = 600ms 总时长
- 用户实际等待时间比预期长一倍

**警告信号**:
- 切换图片感觉"慢"
- 动画之间有明显停顿
- 用户快速点击导航按钮时响应延迟

**预防策略**:
1. **移除 mode="out-in"**: 允许同时执行进出动画
2. **使用绝对定位叠加**: 进出元素重叠，视觉上无缝衔接
3. **调整动画时长**: 缩短到 150-200ms 感觉更流畅
4. **使用 CSS animation 替代 Vue Transition**: 更精细控制

**优化方案**:
```vue
<TransitionGroup :name="slideDirection" tag="div" class="img-container">
  <img :key="imgInfo.id" class="img-class" ...>
</TransitionGroup>

<style>
.img-container {
  position: relative;
}
.img-container img {
  position: absolute;
  top: 0;
  left: 0;
}
</style>
```

**应对阶段**: 阶段 2 - 动画方案优化

---

### 9.5 关键帧动画与 Vue Transition 冲突陷阱

**陷阱描述**: CSS `@keyframes` 动画与 Vue Transition 类可能产生冲突，导致动画异常或失效。

**已解决问题**（记录于 imagepreview-transition-animation.md）:
- `.img-class` 的 `blowUpModal` 动画覆盖了 Vue Transition 类
- 原因：CSS 选择器优先级问题
- 解决：使用条件类 `.initial-anim` 只在初始打开时应用

**警告信号**:
- Vue Transition 动画不播放
- 动画行为不一致
- DevTools 显示动画属性被覆盖

**预防策略**:
1. **隔离动画作用域**: 使用不同的 CSS 类名
2. **明确优先级**: 使用更具体的选择器
3. **条件应用动画**: 通过 Vue 控制何时应用哪个动画
4. **动画命名空间**: 为不同类型的动画添加前缀

**正确模式**:
```css
/* 初始打开动画 - 条件应用 */
.mask .img-view .img-class.initial-anim {
  animation: blowUpModal 0.5s cubic-bezier(0.165, 0.84, 0.44, 1) forwards;
}

/* Vue Transition 动画 - 自动应用 */
.slide-left-enter-active {
  animation: slideIn 0.3s ease-out;
}
```

**应对阶段**: 阶段 1 - 问题诊断

---

### 9.6 帧率下降与卡顿陷阱

**陷阱描述**: 动画帧率不稳定会导致视觉卡顿，用户体验下降。

**常见原因**:
1. **主线程阻塞**: JavaScript 执行阻塞渲染
2. **样式重计算**: 复杂 CSS 选择器导致样式计算慢
3. **布局抖动**: 频繁读取布局属性导致强制同步布局
4. **合成层爆炸**: 过多元素提升为合成层

**当前潜在问题**（ImagePreview.vue:299-303）:
```css
.img-class {
  object-fit: cover;  /* 可能导致额外的布局计算 */
  max-width: 95%;
}
```

**警告信号**:
- Chrome DevTools Performance 显示帧率波动
- 部分帧超过 16.67ms（60fps 标准）
- 出现"Layout Shift"警告
- 动画过程中 CPU 占用高

**预防策略**:
1. **使用 transform 和 opacity**: 这两个属性不触发重排
2. **避免动画过程中读取布局属性**: 使用 requestAnimationFrame
3. **使用 content-visibility**: 延迟计算不可见内容
4. **优化 CSS 选择器**: 减少选择器复杂度

**性能优化**:
```css
/* 优化前 */
.img-class {
  object-fit: cover;
  max-width: 95%;
}

/* 优化后 */
.img-class {
  object-fit: contain;  /* cover 需要额外计算 */
  max-width: 95%;
  will-change: transform, opacity;  /* 提示浏览器优化 */
  contain: layout style paint;  /* 限制重计算范围 */
}
```

**应对阶段**: 阶段 2 - 动画方案优化

---

### 9.7 Reduced Motion 无障碍陷阱

**陷阱描述**: 忽略用户的 `prefers-reduced-motion` 设置会导致无障碍问题和用户体验问题。

**问题描述**:
- 部分用户因眩晕、癫痫等原因需要减少动画
- 前庭功能障碍用户可能因复杂动画感到不适
- 忽略此设置违反 WCAG 2.1 标准（标准 2.3.3）

**当前缺失**: ImagePreview.vue 未检测 `prefers-reduced-motion`

**警告信号**:
- 无障碍测试失败
- 用户投诉动画导致不适
- 辅助技术用户无法正常使用

**预防策略**:
1. **检测媒体查询**: 使用 CSS `@media (prefers-reduced-motion: reduce)`
2. **提供替代方案**: 关闭动画或使用简单的淡入淡出
3. **Vue 响应式检测**: 使用 VueUse 的 `usePreferredReducedMotion`

**实现方案**:
```css
/* CSS 方案 */
@media (prefers-reduced-motion: reduce) {
  .slide-left-enter-active,
  .slide-right-enter-active,
  .slide-left-leave-active,
  .slide-right-leave-active {
    animation: none;
    transition: opacity 0.15s ease;
  }
}
```

```typescript
// Vue 方案
import { usePreferredReducedMotion } from '@vueuse/core'

const reducedMotion = usePreferredReducedMotion()

const animationDuration = computed(() => {
  return reducedMotion.value === 'reduce' ? 0 : 300
})
```

**应对阶段**: 阶段 3 - 无障碍优化

---

### 9.8 Electron 渲染进程限制陷阱

**陷阱描述**: Electron 渲染进程的 GPU 资源限制比浏览器更严格，可能导致动画性能下降。

**Electron 特有问题**:
- 默认 GPU 内存限制较低
- 渲染进程与主进程共享资源
- Chromium GPU 进程可能被终止
- 硬件加速可能被禁用

**当前潜在风险**:
- 大图片动画可能触发 GPU 进程崩溃
- 内存泄漏更容易显现
- 多窗口场景下资源竞争

**警告信号**:
- 控制台出现 "GPU process crashed"
- 图片显示为黑色或损坏
- 动画后页面变得无响应
- Electron 窗口闪烁

**预防策略**:
1. **监控 GPU 内存**: 使用 `app.getGPUFeatureStatus()` 检查 GPU 状态
2. **降低动画复杂度**: Electron 中使用更简单的动画
3. **启用 ANGLE 后端**: 改善 Windows 平台 GPU 兼容性
4. **提供降级方案**: GPU 不可用时使用简单动画

**Electron 配置**:
```typescript
// main/index.ts
const mainWindow = new BrowserWindow({
  webPreferences: {
    // ...
    enablePreferredSizeMode: true,
  },
})

// 检查 GPU 状态
app.whenReady().then(() => {
  const gpuFeatureStatus = app.getGPUFeatureStatus()
  console.log('GPU Feature Status:', gpuFeatureStatus)
})
```

**应对阶段**: 阶段 2 - Electron 适配

---

### 9.9 动画时长感知陷阱

**陷阱描述**: 动画时长设置不当会影响用户感知的流畅度。

**当前实现**:
- 初始打开动画: 500ms
- 切换动画: 300ms
- 关闭动画: 500ms

**用户感知研究**:
- **100ms**: 即时响应感
- **200-300ms**: 流畅、自然
- **400-500ms**: 开始感觉"慢"
- **>1000ms**: 用户失去注意力

**警告信号**:
- 用户频繁点击导航按钮（动画太慢）
- 用户感觉界面"卡顿"
- 用户快速关闭预览（不愿等待动画）

**预防策略**:
1. **响应优先**: 交互响应 < 100ms
2. **动画优化**: 视觉动画 200-300ms
3. **复杂效果**: 分阶段执行，先响应后美化
4. **可中断动画**: 允许用户跳过动画

**时长建议**:
```css
/* 快速响应场景 */
--duration-fast: 150ms;

/* 标准过渡 */
--duration-normal: 250ms;

/* 复杂动画 */
--duration-complex: 400ms;

/* 用户操作后立即开始 */
transition-delay: 0ms;
```

**应对阶段**: 阶段 2 - 动画方案优化

---

### 9.10 CSS will-change 滥用陷阱

**陷阱描述**: 过度使用 `will-change` 属性反而会降低性能。

**常见错误**:
```css
/* 错误：对所有元素使用 will-change */
* {
  will-change: transform, opacity;
}

/* 错误：永久保留 will-change */
.animated-element {
  will-change: transform;
}
```

**性能影响**:
- 每个声明 `will-change` 的元素都会创建新的合成层
- 合成层占用额外 GPU 内存
- 过多合成层导致合成性能下降
- 永久 `will-change` 导致内存无法回收

**警告信号**:
- GPU 内存占用异常高
- Chrome DevTools Layers 面板显示大量层
- 动画性能反而下降

**预防策略**:
1. **仅在动画前设置**: 动画开始前添加，结束后移除
2. **限制使用范围**: 只对真正需要的元素使用
3. **避免通用选择器**: 不要对大量元素使用

**正确使用**:
```css
/* 只在动画类中设置 */
.slide-left-enter-active,
.slide-right-enter-active {
  will-change: transform, opacity;
}

/* 动画结束后移除 */
.slide-left-enter-to,
.slide-right-enter-to {
  will-change: auto;
}
```

**应对阶段**: 阶段 2 - 动画方案优化

---

### 动画性能风险矩阵

| 陷阱 | 影响程度 | 发生概率 | 检测难度 | 应对阶段 |
|------|---------|---------|---------|---------|
| Blur 滤镜性能 | 高 | 高 | 低 | 阶段 1 |
| Transform 组合 | 高 | 中 | 中 | 阶段 1 |
| GPU 内存溢出 | 高 | 中 | 中 | 阶段 2 |
| Transition 模式 | 中 | 高 | 低 | 阶段 2 |
| 关键帧冲突 | 高 | 低 | 中 | 阶段 1 |
| 帧率下降 | 高 | 高 | 中 | 阶段 2 |
| Reduced Motion | 中 | 低 | 低 | 阶段 3 |
| Electron 限制 | 高 | 中 | 高 | 阶段 2 |
| 动画时长感知 | 中 | 高 | 低 | 阶段 2 |
| will-change 滥用 | 中 | 中 | 中 | 阶段 2 |

---

### 动画优化检查清单

#### 阶段 1: 性能分析

- [ ] 使用 Chrome DevTools Performance 分析动画性能
- [ ] 检查帧率是否稳定在 60fps
- [ ] 识别导致帧率下降的具体 CSS 属性
- [ ] 检查 GPU 内存使用情况
- [ ] 验证关键帧动画与 Vue Transition 无冲突

#### 阶段 2: 方案优化

- [ ] 降低 blur 滤镜半径或替换为其他效果
- [ ] 简化 transform 属性组合
- [ ] 评估使用缩略图进行动画的可行性
- [ ] 优化 Vue Transition 模式和时长
- [ ] 正确使用 will-change 属性
- [ ] 测试 Electron 特有的性能限制

#### 阶段 3: 无障碍与体验

- [ ] 实现 prefers-reduced-motion 支持
- [ ] 优化动画时长至用户感知最佳
- [ ] 添加键盘导航支持（已有）
- [ ] 测试各种图片尺寸下的动画表现

#### 测试验证

- [ ] 使用 Chrome DevTools 录制动画性能
- [ ] 测试低端设备/集成显卡性能
- [ ] 测试 4K 大图片动画
- [ ] 测试快速连续切换图片
- [ ] 验证 GPU 进程稳定性
- [ ] 无障碍测试（prefers-reduced-motion）

---

### 动画优化参考资料

- [CSS Triggers - CSS 属性如何影响渲染](https://csstriggers.com/)
- [High Performance Animations - HTML5 Rocks](https://www.html5rocks.com/en/tutorials/speed/high-performance-animations/)
- [Vue Transition Documentation](https://vuejs.org/guide/built-ins/transition.html)
- [MDN: prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion)
- [Electron Performance Guide](https://www.electronjs.org/docs/latest/tutorial/performance)
- [Web Content Accessibility Guidelines (WCAG) 2.1](https://www.w3.org/WAI/WCAG21/quickref/#animation-from-interactions)

---

## 10. Store-to-Composable 迁移检查清单

### 迁移前（阶段 1）

- [ ] 审计所有视图中的直接 store 导入
- [ ] 映射每个视图的当前 store 访问模式
- [ ] 识别需要迁移的生命周期钩子
- [ ] 记录视图中的所有 IPC 调用
- [ ] 验证现有 composable 模式正确工作

### 迁移中（阶段 2-4）

- [ ] 实现前先创建 composable 接口
- [ ] 所有状态属性返回 `ComputedRef`
- [ ] Composables 中不重复本地状态
- [ ] 将生命周期钩子与相关业务逻辑一起移动
- [ ] 每次更改后验证 KeepAlive 状态保留
- [ ] 每次提交后运行类型检查
- [ ] 检查循环依赖

### 迁移后（阶段 5）

- [ ] 视图文件中无直接 `useXxxStore()` 调用
- [ ] 视图文件中无 `window.electronAPI` 调用
- [ ] 所有生命周期钩子正确管理
- [ ] KeepAlive 缓存验证
- [ ] TypeScript 严格模式通过
- [ ] 所有受影响功能的手动测试

---

## 11. 迁移警告信号

### 运行时警告

1. **"Getters should be pure functions"** — Store getter 访问 composable
2. **"Cannot read property of undefined"** — Composable 未正确初始化
3. **响应式不更新 UI** — Computed 未正确包装 store ref
4. **内存泄漏警告** — 生命周期钩子未清理

### 构建时警告

1. **computed 返回的类型错误** — 缺少 `ComputedRef` 类型
2. **循环依赖警告** — 导入方向错误
3. **未使用的导入警告** — 迁移后视图仍有 store 导入

### 测试失败

1. **"Cannot read property of null"** — Mock 未匹配预期形状
2. **测试超时** — 异步操作未正确等待
3. **状态不更新** — Mock store 非响应式

---

## 12. 阶段分配汇总

| 陷阱类别 | 主要阶段 | 预防类型 |
|---------|---------|---------|
| IPC 通信问题 | 阶段 1 | 接口定义 |
| Store 响应式 | 阶段 2 | 代码审查 |
| 类型安全 | 阶段 3 | 接口优先 |
| 向后兼容 | 所有阶段 | 迁移逻辑 |
| 断点续传 | v2.1 | 功能测试 |
| Store 迁移 | v2.2 | 原子迁移 |
| 动画性能 | v2.8 | 性能分析 |

---

## 陷阱检查清单

在重构的每个阶段，使用以下清单检查是否触发了陷阱：

### 阶段 1：IPC 模块化拆分 / 类型安全 / 性能分析

- [ ] 所有 IPC 通道名称是否保持不变
- [ ] 新增的消息字段是否为可选属性
- [ ] 错误返回格式是否统一
- [ ] 类型定义是否在 preload 和 env.d.ts 同步更新
- [ ] 存储键名是否变更
- [ ] 导入结构是否单向（无循环）
- [ ] 使用 Chrome DevTools 分析动画性能
- [ ] 识别高开销 CSS 属性

### 阶段 2：Store 重构 / Composables 抽象 / 数据层 / 方案优化

- [ ] shallowRef 更新是否使用对象替换
- [ ] Store 中的 Electron API 调用是否通过服务层
- [ ] Alert composable 是否在所有视图统一使用
- [ ] 事件监听器是否在组件销毁时移除
- [ ] finishedList 数量限制是否保留
- [ ] Composables 是否返回 `ComputedRef`
- [ ] Composables 是否有重复本地状态
- [ ] 动画方案是否经过性能测试
- [ ] GPU 内存使用是否合理

### 阶段 3：类型安全强化 / 业务层 / 无障碍优化

- [ ] any 替换后是否添加运行时类型检查
- [ ] 类型定义是否集中管理避免重复
- [ ] Props 类型定义是否正确
- [ ] 是否有新增类型测试
- [ ] 每个 store 的迁移是否完整
- [ ] 生命周期钩子是否正确移动
- [ ] prefers-reduced-motion 是否支持

### 阶段 4：IPC 模块化重构

- [ ] IPC 处理器是否按领域拆分
- [ ] 错误处理是否统一
- [ ] 通道白名单是否完整

### 阶段 5：表现层重构与清理

- [ ] 视图中无直接 store 导入
- [ ] 视图中无直接 IPC 调用
- [ ] KeepAlive 行为验证
- [ ] 测试更新完成

### 所有阶段

- [ ] 升级后用户数据是否保留
- [ ] 缩略图缓存路径是否变更
- [ ] 自定义协议格式是否变更
- [ ] API 请求参数格式是否变更

---

## 参考资源

- [Electron IPC 文档](https://www.electronjs.org/docs/latest/tutorial/ipc)
- [Vue 3 响应式 API](https://vuejs.org/api/reactivity-api.html)
- [Vue 3 Composables 最佳实践](https://vuejs.org/guide/reusability/composables.html)
- [Vue Transition 文档](https://vuejs.org/guide/built-ins/transition.html)
- [TypeScript 类型守卫](https://www.typescriptlang.org/docs/handbook/2/narrowing.html)
- [Pinia 最佳实践](https://pinia.vuejs.org/core-concepts/)
- [HTTP Range Requests - MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Range_requests)
- [Node.js Stream Best Practices](https://nodejs.org/api/stream.html)
- [Handling Aborted Requests in Axios](https://axios-http.com/docs/cancellation)
- [CSS Triggers - 渲染性能参考](https://csstriggers.com/)
- [High Performance Animations](https://www.html5rocks.com/en/tutorials/speed/high-performance-animations/)
- [MDN: prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion)
- [Electron Performance Guide](https://www.electronjs.org/docs/latest/tutorial/performance)
- [WCAG 2.1 Animation Guidelines](https://www.w3.org/WAI/WCAG21/quickref/#animation-from-interactions)

---

*创建时间：2025-04-25*
*基于项目代码库分析生成*
*更新时间：2026-04-30 - 新增 CSS/Vue 动画性能优化陷阱（v2.8 里程碑）*
