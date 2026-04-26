# Architecture: 断点续传功能集成方案

## 研究目标

为 Wallhaven 壁纸浏览器添加断点续传功能，确保与现有分层架构无缝集成。

---

## 1. 现有架构分析

### 1.1 下载流程现状

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        当前下载流程（无断点续传）                              │
└─────────────────────────────────────────────────────────────────────────────┘

用户点击下载
    │
    ▼
DownloadWallpaper.vue (View Layer)
    │ useDownload().addTask()
    ▼
useDownload() (Composable Layer)
    │ downloadService.startDownload()
    ▼
DownloadService (Service Layer)
    │ electronClient.startDownloadTask()
    ▼
ElectronClient (Client Layer)
    │ IPC: 'start-download-task'
    ▼
DownloadHandler (Main Process)
    │ axios stream download
    │ → 创建 .download 临时文件
    │ → 定期发送 'download-progress' IPC
    │ → 完成时 rename .download → 最终文件
    ▼
响应返回 Renderer
    │ download-progress 事件
    ▼
DownloadService.onProgress()
    │ useDownload().handleProgress()
    ▼
DownloadStore.updateProgress()
    │
    ▼
UI 更新
```

### 1.2 关键数据结构

**现有 DownloadItem（渲染进程）:**
```typescript
interface DownloadItem {
  id: string                    // 任务唯一标识
  url: string                   // 下载 URL
  filename: string              // 目标文件名
  small: string                 // 缩略图 URL
  resolution: string            // 分辨率
  size: number                  // 总大小（预估）
  offset: number                // 已下载字节数
  progress: number              // 进度百分比
  speed: number                 // 下载速度
  state: 'downloading' | 'paused' | 'waiting' | 'completed'  // 状态
  path?: string                 // 本地路径
  time?: string                 // 时间戳
  wallpaperId?: string          // Wallhaven ID
}
```

**现有 ActiveDownload（主进程）:**
```typescript
interface ActiveDownload {
  abortController: AbortController  // 用于中断下载
  tempPath: string                  // 临时文件路径 (.download)
  saveDir: string                   // 保存目录
  filename: string                  // 目标文件名
}
```

### 1.3 现有问题

1. **暂停后恢复会重新开始**：`resumeDownload()` 重置 offset=0，从头下载
2. **应用重启丢失进度**：downloadingList 仅在内存中，未持久化
3. **临时文件被删除**：取消/失败时 `cleanupDownload()` 删除 .download 文件

---

## 2. 断点续传集成方案

### 2.1 架构设计原则

遵循现有分层架构：
- **Client Layer**: 扩展 ElectronClient，添加 resume IPC 方法
- **Service Layer**: 扩展 DownloadService，添加 resume 逻辑
- **Repository Layer**: 新增 DownloadStateRepository，持久化下载状态
- **Composable Layer**: 扩展 useDownload，协调恢复逻辑
- **Main Process**: 修改 DownloadHandler，支持 Range 请求

### 2.2 数据流设计

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        断点续传完整数据流                                     │
└─────────────────────────────────────────────────────────────────────────────┘

[恢复下载流程]

useDownload().resumeDownload(id)
    │ 1. 获取任务状态
    ▼
DownloadStateRepository.get(id)
    │ 2. 从持久化存储读取
    │    - url, offset, tempPath, totalSize
    ▼
DownloadService.resumeDownload(id, url, offset, saveDir)
    │ 3. 调用 Electron IPC
    ▼
ElectronClient.resumeDownloadTask({ taskId, url, offset, saveDir })
    │ 4. IPC: 'resume-download-task'
    ▼
DownloadHandler (Main Process)
    │ 5. 检查临时文件存在性
    │ 6. 发起 Range 请求
    │    axios({ headers: { Range: `bytes=${offset}-` } })
    │ 7. 追加写入临时文件
    │ 8. 发送进度事件
    ▼
响应返回 Renderer
    │ download-progress 事件
    ▼
UI 更新
```

### 2.3 持久化策略

**方案选择：主进程持久化（推荐）**

理由：
1. 主进程可直接访问文件系统，无需 IPC 往返
2. 应用重启时主进程先于渲染进程启动，可提前恢复
3. 临时文件和状态文件在同一位置，原子性更好

**数据存储位置：**
```
{downloadPath}/
├── wallpaper.jpg              # 完成的文件
├── wallpaper.jpg.download     # 临时下载文件
└── wallpaper.jpg.download.json # 状态文件（新增）
```

**状态文件内容：**
```typescript
interface DownloadStateFile {
  taskId: string
  url: string
  filename: string
  totalSize: number
  downloadedSize: number
  createdAt: string
  updatedAt: string
  wallpaperId?: string
  resolution?: string
  small?: string  // 缩略图 URL
}
```

---

## 3. 集成点详解

### 3.1 IPC 通道扩展

**新增通道：**

| 通道名称 | 方向 | 用途 |
|---------|------|------|
| `resume-download-task` | Renderer → Main | 恢复下载，携带 offset |
| `get-pending-downloads` | Renderer → Main | 获取未完成下载列表 |

**修改通道：**

| 通道名称 | 修改内容 |
|---------|---------|
| `start-download-task` | 添加参数 `resumeFrom?: number`，可选支持断点续传 |
| `pause-download-task` | 返回 `tempPath` 和 `downloadedSize`，用于持久化 |

### 3.2 类型定义扩展

**新增类型 (shared/types/ipc.ts):**

```typescript
// 恢复下载请求
export interface ResumeDownloadTaskRequest {
  taskId: string
  url: string
  offset: number      // 从哪个字节开始
  saveDir: string
  filename: string
}

// 暂停响应扩展
export interface PauseDownloadTaskResponse {
  success: boolean
  error?: string
  tempPath?: string      // 新增：临时文件路径
  downloadedSize?: number // 新增：已下载大小
}

// 未完成下载项
export interface PendingDownloadItem {
  taskId: string
  url: string
  filename: string
  totalSize: number
  downloadedSize: number
  tempPath: string
  state: 'paused' | 'failed'
  createdAt: string
  updatedAt: string
}
```

### 3.3 Repository Layer 扩展

**新增 DownloadStateRepository:**

```typescript
// src/repositories/download-state.repository.ts

export const downloadStateRepository = {
  /**
   * 保存下载状态到主进程
   * 通过 IPC 调用主进程写入状态文件
   */
  async save(state: DownloadStateFile): Promise<IpcResponse<void>> {
    return electronClient.saveDownloadState(state)
  },

  /**
   * 获取单个下载状态
   */
  async get(taskId: string): Promise<IpcResponse<DownloadStateFile | null>> {
    return electronClient.getDownloadState(taskId)
  },

  /**
   * 获取所有未完成的下载
   */
  async getPending(): Promise<IpcResponse<PendingDownloadItem[]>> {
    return electronClient.getPendingDownloads()
  },

  /**
   * 删除下载状态
   */
  async delete(taskId: string): Promise<IpcResponse<void>> {
    return electronClient.deleteDownloadState(taskId)
  },
}
```

### 3.4 Service Layer 扩展

**扩展 DownloadService:**

```typescript
// src/services/download.service.ts

class DownloadServiceImpl {
  // ... 现有方法 ...

  /**
   * 恢复下载
   * @param taskId - 任务 ID
   * @param url - 下载 URL
   * @param offset - 已下载字节数
   * @param filename - 目标文件名
   */
  async resumeDownload(
    taskId: string,
    url: string,
    offset: number,
    filename: string
  ): Promise<IpcResponse<string>> {
    const pathResult = await this.getDownloadPath()
    if (!pathResult.success || !pathResult.data) {
      return {
        success: false,
        error: { code: 'DOWNLOAD_PATH_NOT_SET', message: 'Download path not configured' },
      }
    }

    return electronClient.resumeDownloadTask({
      taskId,
      url,
      offset,
      saveDir: pathResult.data,
      filename,
    })
  }

  /**
   * 获取未完成的下载任务
   * 应用启动时调用
   */
  async getPendingDownloads(): Promise<IpcResponse<PendingDownloadItem[]>> {
    return electronClient.getPendingDownloads()
  }
}
```

### 3.5 Composable Layer 扩展

**修改 useDownload:**

```typescript
// src/composables/download/useDownload.ts

export function useDownload(): UseDownloadReturn {
  // ... 现有代码 ...

  /**
   * 恢复下载（断点续传）
   * 修改：保留 offset，不重置进度
   */
  const resumeDownload = async (id: string): Promise<boolean> => {
    const task = store.downloadingList.find((item) => item.id === id)
    if (!task || task.state !== 'paused') {
      return false
    }

    // 关键修改：使用现有 offset 进行断点续传
    const result = await downloadService.resumeDownload(
      id,
      task.url,
      task.offset,  // 保留已下载字节数
      task.filename
    )

    if (result.success) {
      task.state = 'downloading'
      return true
    } else {
      showError(result.error?.message || '恢复下载失败')
      return false
    }
  }

  /**
   * 应用启动时恢复未完成的下载
   */
  const restorePendingDownloads = async (): Promise<void> => {
    const result = await downloadService.getPendingDownloads()
    if (result.success && result.data) {
      // 将未完成的任务添加到 downloadingList
      for (const pending of result.data) {
        const exists = store.downloadingList.some(item => item.id === pending.taskId)
        if (!exists) {
          store.downloadingList.push({
            id: pending.taskId,
            url: pending.url,
            filename: pending.filename,
            small: pending.small || '',
            resolution: pending.resolution || '',
            size: pending.totalSize,
            offset: pending.downloadedSize,
            progress: pending.totalSize > 0
              ? (pending.downloadedSize / pending.totalSize) * 100
              : 0,
            speed: 0,
            state: 'waiting',
          })
        }
      }
    }
  }

  return {
    // ... 现有返回值 ...
    resumeDownload,         // 修改：支持断点续传
    restorePendingDownloads, // 新增
  }
}
```

### 3.6 Main Process 修改

**修改 DownloadHandler:**

```typescript
// electron/main/ipc/handlers/download.handler.ts

interface ActiveDownload {
  abortController: AbortController
  tempPath: string
  saveDir: string
  filename: string
  totalSize: number      // 新增：记录总大小
  downloadedSize: number // 新增：已下载大小
}

// 状态文件路径
function getStateFilePath(tempPath: string): string {
  return tempPath + '.json'
}

// 保存状态到文件
function saveDownloadState(tempPath: string, state: DownloadStateFile): void {
  const statePath = getStateFilePath(tempPath)
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2))
}

// 读取状态文件
function readDownloadState(tempPath: string): DownloadStateFile | null {
  const statePath = getStateFilePath(tempPath)
  if (fs.existsSync(statePath)) {
    try {
      return JSON.parse(fs.readFileSync(statePath, 'utf-8'))
    } catch {
      return null
    }
  }
  return null
}

// 修改 start-download-task：支持从 offset 开始
ipcMain.handle(IPC_CHANNELS.START_DOWNLOAD_TASK, async (_event, params) => {
  const { taskId, url, filename, saveDir, resumeFrom } = params

  const filePath = path.join(saveDir, filename)
  const tempPath = filePath + '.download'

  // 如果是恢复下载，检查临时文件
  let startOffset = 0
  if (resumeFrom && fs.existsSync(tempPath)) {
    startOffset = fs.statSync(tempPath).size
  }

  // 创建 AbortController
  const abortController = new AbortController()

  // 发起请求（带 Range header）
  const headers: Record<string, string> = {}
  if (startOffset > 0) {
    headers['Range'] = `bytes=${startOffset}-`
  }

  const response = await axios({
    method: 'GET',
    url,
    responseType: 'stream',
    headers,
    signal: abortController.signal,
  })

  const totalSize = parseInt(response.headers['content-length'] || '0', 10)
  const actualTotalSize = startOffset > 0 ? startOffset + totalSize : totalSize

  // 追加模式打开文件
  const writer = fs.createWriteStream(tempPath, { flags: startOffset > 0 ? 'a' : 'w' })

  // 存储活跃下载
  activeDownloads.set(taskId, {
    abortController,
    tempPath,
    saveDir,
    filename,
    totalSize: actualTotalSize,
    downloadedSize: startOffset,
  })

  // 保存状态文件
  saveDownloadState(tempPath, {
    taskId,
    url,
    filename,
    totalSize: actualTotalSize,
    downloadedSize: startOffset,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })

  // 流式下载...
})

// 修改 pause-download-task：返回下载状态
ipcMain.handle(IPC_CHANNELS.PAUSE_DOWNLOAD_TASK, async (_event, taskId: string) => {
  const download = activeDownloads.get(taskId)
  if (!download) {
    return { success: false, error: 'Task not found' }
  }

  download.abortController.abort()

  // 获取当前下载大小
  const downloadedSize = fs.existsSync(download.tempPath)
    ? fs.statSync(download.tempPath).size
    : 0

  // 更新状态文件
  const state = readDownloadState(download.tempPath)
  if (state) {
    state.downloadedSize = downloadedSize
    state.updatedAt = new Date().toISOString()
    saveDownloadState(download.tempPath, state)
  }

  return {
    success: true,
    tempPath: download.tempPath,
    downloadedSize,
  }
})

// 新增：恢复下载
ipcMain.handle('resume-download-task', async (_event, params: ResumeDownloadTaskRequest) => {
  const { taskId, url, offset, saveDir, filename } = params

  // 复用 start-download-task 逻辑，传入 resumeFrom
  return startDownloadWithResume({
    taskId,
    url,
    filename,
    saveDir,
    resumeFrom: offset,
  })
})

// 新增：获取未完成下载列表
ipcMain.handle('get-pending-downloads', async () => {
  // 扫描下载目录，查找 .download 文件
  // 返回未完成的下载列表
})
```

---

## 4. 应用启动恢复流程

### 4.1 主进程初始化

```typescript
// electron/main/index.ts

async function scanPendingDownloads(downloadPath: string): Promise<PendingDownloadItem[]> {
  const pending: PendingDownloadItem[] = []

  if (!fs.existsSync(downloadPath)) {
    return pending
  }

  const files = fs.readdirSync(downloadPath)
  const downloadFiles = files.filter(f => f.endsWith('.download'))

  for (const downloadFile of downloadFiles) {
    const tempPath = path.join(downloadPath, downloadFile)
    const statePath = tempPath + '.json'

    if (fs.existsSync(statePath)) {
      try {
        const state = JSON.parse(fs.readFileSync(statePath, 'utf-8'))
        const downloadedSize = fs.statSync(tempPath).size

        pending.push({
          taskId: state.taskId,
          url: state.url,
          filename: state.filename,
          totalSize: state.totalSize,
          downloadedSize,
          tempPath,
          state: 'paused',
          createdAt: state.createdAt,
          updatedAt: state.updatedAt,
        })
      } catch {
        // 无效的状态文件，删除
        fs.unlinkSync(tempPath)
        fs.unlinkSync(statePath)
      }
    }
  }

  return pending
}

// 应用启动时
app.whenReady().then(async () => {
  // 读取下载路径设置
  const downloadPath = store.get('appSettings')?.downloadPath

  if (downloadPath) {
    // 扫描未完成的下载
    const pendingDownloads = await scanPendingDownloads(downloadPath)
    // 存储供渲染进程查询
    global.pendingDownloads = pendingDownloads
  }

  createWindow()
})
```

### 4.2 渲染进程初始化

```typescript
// src/main.ts

async function initializeApp(): Promise<void> {
  // ... 现有初始化 ...

  // 恢复未完成的下载
  const { restorePendingDownloads } = useDownload()
  await restorePendingDownloads()
}
```

---

## 5. 组件边界与依赖

### 5.1 层级依赖图

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              表现层 (View)                                   │
│  DownloadWallpaper.vue                                                      │
│  └── 调用 useDownload()                                                     │
│      └── 不直接访问 Service/Repository                                      │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              组合层 (Composable)                             │
│  useDownload()                                                              │
│  ├── 调用 downloadService.resumeDownload()                                  │
│  ├── 调用 downloadService.getPendingDownloads()                             │
│  └── 更新 downloadStore                                                     │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              业务层 (Service)                                │
│  DownloadService                                                            │
│  ├── resumeDownload() → electronClient.resumeDownloadTask()                 │
│  ├── getPendingDownloads() → electronClient.getPendingDownloads()           │
│  └── onProgress() 订阅进度                                                  │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              客户端层 (Client)                               │
│  ElectronClient                                                             │
│  ├── resumeDownloadTask() → IPC: 'resume-download-task'                     │
│  ├── getPendingDownloads() → IPC: 'get-pending-downloads'                   │
│  └── onDownloadProgress() → 监听 'download-progress'                        │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              主进程 (Main Process)                           │
│  DownloadHandler                                                            │
│  ├── 处理 'resume-download-task' → Range 请求                               │
│  ├── 处理 'get-pending-downloads' → 扫描 .download 文件                     │
│  ├── 状态持久化 → .download.json 文件                                       │
│  └── 发送 'download-progress' 事件                                          │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.2 新增组件清单

| 层级 | 组件 | 类型 | 说明 |
|------|------|------|------|
| Client | `resumeDownloadTask()` | 新增 | ElectronClient 方法 |
| Client | `getPendingDownloads()` | 新增 | ElectronClient 方法 |
| Client | `saveDownloadState()` | 新增 | ElectronClient 方法（可选） |
| Service | `resumeDownload()` | 新增 | DownloadService 方法 |
| Service | `getPendingDownloads()` | 新增 | DownloadService 方法 |
| Composable | `restorePendingDownloads()` | 新增 | useDownload 方法 |
| Main | `resume-download-task` handler | 新增 | IPC 处理器 |
| Main | `get-pending-downloads` handler | 新增 | IPC 处理器 |
| Main | 状态文件读写 | 新增 | 辅助函数 |

### 5.3 修改组件清单

| 层级 | 组件 | 修改内容 |
|------|------|---------|
| Client | `startDownloadTask()` | 添加 `resumeFrom` 参数 |
| Service | `startDownload()` | 透传 `resumeFrom` 参数 |
| Composable | `resumeDownload()` | 使用现有 offset，不重置 |
| Composable | `pauseDownload()` | 保存 offset 到 store |
| Main | `start-download-task` | 支持 Range 请求 |
| Main | `pause-download-task` | 返回 tempPath 和 downloadedSize |
| Main | `cleanupDownload()` | 区分取消和暂停，暂停不删除临时文件 |
| Types | `DownloadProgressData` | 添加 `totalSize` 字段 |
| Types | 新增类型 | `ResumeDownloadTaskRequest`, `PendingDownloadItem` |

---

## 6. 构建顺序

### 6.1 推荐实现顺序

```
Phase 1: 基础设施 (Types + IPC 通道)
├── 1.1 扩展 shared/types/ipc.ts
│   ├── ResumeDownloadTaskRequest
│   ├── PauseDownloadTaskResponse
│   └── PendingDownloadItem
├── 1.2 添加 IPC 通道常量
│   ├── RESUME_DOWNLOAD_TASK
│   └── GET_PENDING_DOWNLOADS
└── 1.3 扩展 IPC_CHANNELS

Phase 2: 主进程实现
├── 2.1 添加状态文件辅助函数
│   ├── saveDownloadState()
│   ├── readDownloadState()
│   └── getStateFilePath()
├── 2.2 修改 start-download-task
│   ├── 支持 resumeFrom 参数
│   └── Range 请求处理
├── 2.3 修改 pause-download-task
│   ├── 返回 tempPath 和 downloadedSize
│   └── 更新状态文件
├── 2.4 实现 resume-download-task
├── 2.5 实现 get-pending-downloads
└── 2.6 修改 cleanupDownload 逻辑

Phase 3: 客户端层扩展
├── 3.1 ElectronClient.resumeDownloadTask()
├── 3.2 ElectronClient.getPendingDownloads()
└── 3.3 修改 ElectronClient.startDownloadTask()

Phase 4: 业务层扩展
├── 4.1 DownloadService.resumeDownload()
├── 4.2 DownloadService.getPendingDownloads()
└── 4.3 修改 DownloadService.startDownload()

Phase 5: 组合层扩展
├── 5.1 修改 useDownload.resumeDownload()
├── 5.2 添加 useDownload.restorePendingDownloads()
└── 5.3 应用启动调用恢复逻辑

Phase 6: 测试与验证
├── 6.1 手动测试暂停/恢复
├── 6.2 测试应用重启恢复
├── 6.3 测试网络中断恢复
└── 6.4 边界情况测试
```

### 6.2 依赖关系图

```
Phase 1 (Types)
    │
    ▼
Phase 2 (Main Process) ←── 无依赖，可独立测试
    │
    ▼
Phase 3 (Client) ←── 依赖 Main Process IPC
    │
    ▼
Phase 4 (Service) ←── 依赖 Client
    │
    ▼
Phase 5 (Composable) ←── 依赖 Service
    │
    ▼
Phase 6 (Testing)
```

---

## 7. 风险与缓解

### 7.1 技术风险

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| 服务器不支持 Range 请求 | 无法断点续传 | 检测响应头，不支持时重新下载 |
| 状态文件损坏 | 恢复失败 | 添加校验，损坏时清理并重新下载 |
| 临时文件被用户删除 | 恢复失败 | 检测文件存在性，不存在时重新下载 |
| 并发写入冲突 | 数据损坏 | 使用文件锁或原子写入 |

### 7.2 兼容性考虑

| 场景 | 处理方式 |
|------|---------|
| 旧版本临时文件（无状态文件） | 仅保留临时文件大小，重新获取 URL |
| 服务器文件已变更 | 对比文件大小，不匹配时重新下载 |
| 下载路径变更 | 提示用户旧下载无法恢复 |

---

## 8. 总结

### 8.1 关键集成点

1. **IPC 通道**：新增 `resume-download-task` 和 `get-pending-downloads`
2. **Range 请求**：主进程支持 `Range: bytes=offset-` 请求头
3. **状态持久化**：`.download.json` 文件记录下载元数据
4. **应用启动恢复**：主进程扫描 + 渲染进程恢复

### 8.2 架构符合性

本方案完全遵循现有分层架构：
- **不跳层访问**：View → Composable → Service → Client → Main
- **职责清晰**：每层只处理自己的职责
- **类型安全**：所有新增接口都有类型定义
- **向后兼容**：现有下载流程不受影响

### 8.3 下一步

1. 确认方案细节
2. 创建详细任务清单
3. 按 Phase 顺序实现
4. 逐步验证功能

---

*研究完成时间：2026-04-26*
*适用版本：v2.1 断点续传里程碑*
