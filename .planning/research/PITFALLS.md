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

## 陷阱检查清单

在重构的每个阶段，使用以下清单检查是否触发了陷阱：

### 阶段 1：IPC 模块化拆分
- [ ] 所有 IPC 通道名称是否保持不变
- [ ] 新增的消息字段是否为可选属性
- [ ] 错误返回格式是否统一
- [ ] 类型定义是否在 preload 和 env.d.ts 同步更新
- [ ] 存储键名是否变更

### 阶段 2：Store 重构 / Composables 抽象
- [ ] shallowRef 更新是否使用对象替换
- [ ] Store 中的 Electron API 调用是否通过服务层
- [ ] Alert composable 是否在所有视图统一使用
- [ ] 事件监听器是否在组件销毁时移除
- [ ] finishedList 数量限制是否保留

### 阶段 3：类型安全强化
- [ ] any 替换后是否添加运行时类型检查
- [ ] 类型定义是否集中管理避免重复
- [ ] Props 类型定义是否正确
- [ ] 是否有新增类型测试

### 所有阶段
- [ ] 升级后用户数据是否保留
- [ ] 缩略图缓存路径是否变更
- [ ] 自定义协议格式是否变更
- [ ] API 请求参数格式是否变更

---

## 参考资源

- [Electron IPC 文档](https://www.electronjs.org/docs/latest/tutorial/ipc)
- [Vue 3 响应式 API](https://vuejs.org/api/reactivity-api.html)
- [TypeScript 类型守卫](https://www.typescriptlang.org/docs/handbook/2/narrowing.html)
- [Pinia 最佳实践](https://pinia.vuejs.org/core-concepts/)

---

*创建时间：2025-04-25*
*基于项目代码库分析生成*
*更新时间：2026-04-26 - 新增断点续传陷阱（v2.1 里程碑）*
