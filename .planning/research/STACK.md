# 断点续传技术栈研究

> 研究时间：2026-04-26
> 目标：为现有下载功能添加断点续传能力

---

## 1. 现有技术栈分析

### 1.1 当前下载实现

基于代码分析 (`electron/main/ipc/handlers/download.handler.ts`)，现有实现：

| 组件 | 技术 | 用途 |
|------|------|------|
| HTTP 客户端 | Axios 1.15.0 | 流式下载 |
| 流处理 | Node.js stream.pipeline | 数据写入 |
| 取消机制 | AbortController | 暂停/取消下载 |
| 临时文件 | `.download` 后缀 | 下载中文件存储 |
| 状态管理 | Pinia Store + IPC | 进度同步 |

### 1.2 当前暂停机制的问题

```typescript
// 现有暂停实现（download.handler.ts:303-346）
download.abortController.abort()  // 中断请求
// 问题：临时文件保留，但无法恢复下载
```

**问题**：
- 暂停后无法从断点继续，只能重新下载
- 应用重启后丢失所有下载状态
- 临时文件被清理，无法恢复

---

## 2. 断点续传所需技术

### 2.1 HTTP Range 请求（核心）

**不需要新增依赖**，Axios 1.15.0 原生支持 Range 请求：

```typescript
// Range 请求示例
const response = await axios({
  method: 'GET',
  url,
  headers: {
    Range: `bytes=${startPosition}-`  // 从指定位置开始下载
  },
  responseType: 'stream'
})

// 服务器必须返回 206 Partial Content
// 响应头包含: Content-Range: bytes 0-1023/10240
```

**关键点**：
- Wallhaven CDN 支持 Range 请求（需验证）
- 需要先 HEAD 请求检查 `Accept-Ranges: bytes` 头
- 使用 `fs.createWriteStream(path, { start, flags: 'r+' })` 追加写入

### 2.2 持久化存储方案

**推荐：继续使用 electron-store 11.0.2**

| 方案 | 优点 | 缺点 | 结论 |
|------|------|------|------|
| **electron-store** | 已集成、简单可靠、JSON 存储 | 大量数据性能一般 | ✅ 推荐 |
| SQLite | 查询性能好、结构化 | 需引入新依赖、过度工程 | ❌ 过度设计 |
| 低db | 轻量、嵌入式 | 新依赖、学习成本 | ❌ 不必要 |
| 文件系统 JSON | 无依赖 | 需自己实现读写逻辑 | ❌ 重复造轮 |

**存储数据结构**：

```typescript
// 存储键: 'download-tasks'
interface PersistedDownloadTask {
  taskId: string
  url: string
  filename: string
  saveDir: string

  // 断点续传关键字段
  downloadedBytes: number      // 已下载字节数
  totalBytes: number           // 总字节数（首次下载获取）
  tempFilePath: string         // 临时文件完整路径

  // 状态
  state: 'paused' | 'downloading' | 'waiting'
  createdAt: number
  updatedAt: number
}
```

**集成方式**：
- 利用现有 `storeGet`/`storeSet` IPC 通道
- 存储键使用 `STORAGE_KEYS.DOWNLOAD_TASKS` 常量

### 2.3 文件追加写入

**不需要新增依赖**，Node.js fs 模块原生支持：

```typescript
import * as fs from 'fs'

// 检查临时文件是否存在
const tempPath = filePath + '.download'
let startPosition = 0

if (fs.existsSync(tempPath)) {
  const stats = fs.statSync(tempPath)
  startPosition = stats.size  // 从当前位置继续
}

// 创建可写流，追加模式
const writer = fs.createWriteStream(tempPath, {
  start: startPosition,
  flags: 'r+'  // 读写模式，不覆盖现有内容
})

// 发起 Range 请求
const response = await axios({
  method: 'GET',
  url,
  headers: {
    Range: `bytes=${startPosition}-`
  },
  responseType: 'stream'
})

// 流式追加写入
await streamPipeline(response.data, writer)
```

---

## 3. 需要新增的依赖

### 3.1 结论：无需新增依赖

经过分析，断点续传功能**不需要新增任何 npm 依赖**：

| 功能 | 现有能力 | 方案 |
|------|----------|------|
| HTTP Range 请求 | Axios 1.15.0 | 设置 `Range` header |
| 持久化存储 | electron-store 11.0.2 | 已集成，直接使用 |
| 文件追加写入 | Node.js fs | `createWriteStream({ start, flags: 'r+' })` |
| 进度管理 | 现有 IPC + Pinia | 扩展现有结构 |

### 3.2 可选增强（非必需）

如果需要更强大的功能，可考虑：

| 库 | 版本 | 用途 | 是否必需 |
|-----|------|------|----------|
| 无 | - | 当前技术栈已足够 | ✅ |

---

## 4. 实现方案

### 4.1 架构变更

```
┌─────────────────────────────────────────────────────────────┐
│                   Download Handler                           │
├─────────────────────────────────────────────────────────────┤
│  新增功能：                                                  │
│  1. RESUME_DOWNLOAD_TASK IPC 通道                           │
│  2. Range 请求支持                                          │
│  3. 临时文件追加写入                                         │
│  4. 下载状态持久化                                           │
└─────────────────────────────────────────────────────────────┘
         │                              │
         ▼                              ▼
┌─────────────────┐          ┌─────────────────────────────┐
│ electron-store  │          │   File System               │
│ (持久化状态)    │          │   (临时文件保留)            │
│                 │          │                             │
│ download-tasks  │          │   file.jpg.download         │
│ {               │          │   (保留已下载部分)          │
│   taskId,       │          │                             │
│   downloadedBytes,│        └─────────────────────────────┘
│   totalBytes,   │
│   ...           │
│ }               │
└─────────────────┘
```

### 4.2 IPC 通道变更

| 通道 | 变更 | 说明 |
|------|------|------|
| `START_DOWNLOAD_TASK` | 修改 | 支持 Range 请求、保留临时文件 |
| `RESUME_DOWNLOAD_TASK` | **新增** | 恢复暂停的下载 |
| `PAUSE_DOWNLOAD_TASK` | 修改 | 保留临时文件、持久化状态 |
| `CANCEL_DOWNLOAD_TASK` | 修改 | 清理持久化数据 |

### 4.3 关键代码变更

#### 4.3.1 暂停时持久化状态

```typescript
// electron/main/ipc/handlers/download.handler.ts

ipcMain.handle(IPC_CHANNELS.PAUSE_DOWNLOAD_TASK, async (_event, taskId: string) => {
  const download = activeDownloads.get(taskId)
  if (!download) return { success: false, error: 'Task not found' }

  download.abortController.abort()

  // 获取已下载大小
  const downloadedBytes = fs.existsSync(download.tempPath)
    ? fs.statSync(download.tempPath).size
    : 0

  // 持久化任务状态
  const { store } = await import('../../index')
  const tasks = store.get('download-tasks') || {}
  tasks[taskId] = {
    ...tasks[taskId],
    downloadedBytes,
    state: 'paused',
    updatedAt: Date.now()
  }
  store.set('download-tasks', tasks)

  return { success: true }
})
```

#### 4.3.2 Range 请求恢复下载

```typescript
async function resumeDownload(taskId: string): Promise<DownloadResult> {
  const { store } = await import('../../index')
  const tasks = store.get('download-tasks') || {}
  const task = tasks[taskId]

  if (!task || !fs.existsSync(task.tempFilePath)) {
    return { success: false, error: 'Task or temp file not found' }
  }

  const startPosition = fs.statSync(task.tempFilePath).size

  // 验证服务器支持 Range
  const headResponse = await axios.head(task.url)
  if (headResponse.headers['accept-ranges'] !== 'bytes') {
    return { success: false, error: 'Server does not support Range requests' }
  }

  // 发起 Range 请求
  const response = await axios({
    method: 'GET',
    url: task.url,
    headers: { Range: `bytes=${startPosition}-` },
    responseType: 'stream'
  })

  // 追加写入临时文件
  const writer = fs.createWriteStream(task.tempFilePath, {
    start: startPosition,
    flags: 'r+'
  })

  // ... 流式下载和进度回调
}
```

---

## 5. 集成点分析

### 5.1 与现有 Axios 流式下载的集成

现有代码 (`download.handler.ts:180-226`)：

```typescript
const response = await axios({
  method: 'GET',
  url,
  responseType: 'stream',
  timeout: 60000,
  signal: abortController.signal,
})
```

**集成方式**：添加 `headers` 参数支持 Range

```typescript
const headers: Record<string, string> = {}
if (startPosition > 0) {
  headers.Range = `bytes=${startPosition}-`
}

const response = await axios({
  method: 'GET',
  url,
  headers,  // 新增
  responseType: 'stream',
  timeout: 60000,
  signal: abortController.signal,
})
```

### 5.2 与现有 electron-store 的集成

现有代码 (`electron/main/index.ts`)：

```typescript
import Store from 'electron-store'
export const store = new Store()
```

**集成方式**：直接使用现有 store 实例

```typescript
// 在 download.handler.ts 中
import { store } from '../../index'

// 存储
store.set('download-tasks', tasks)

// 读取
const tasks = store.get('download-tasks') as Record<string, PersistedDownloadTask>
```

### 5.3 与现有 Pinia Store 的集成

需要修改 `src/stores/modules/download/`：

```typescript
// 新增 actions
async loadPersistedTasks() {
  const response = await electronClient.storeGet<PersistedDownloadTask[]>('download-tasks')
  if (response.success && response.data) {
    // 恢复到 downloadingList
  }
}

async resumeDownload(taskId: string) {
  await electronClient.resumeDownloadTask(taskId)
}
```

---

## 6. 不需要添加的内容

### 6.1 避免过度工程

| 方案 | 原因 |
|------|------|
| 多线程下载 | 复杂度高，单线程流式下载足够 |
| 下载队列管理 | 当前聚焦断点续传，队列管理可后续迭代 |
| SQLite / LowDB | electron-store 已足够，无需引入新依赖 |
| 专用下载库 (turbodownload 等) | Axios 流式下载已满足需求 |
| 文件校验 (MD5/SHA) | 增加复杂度，当前非必要 |

### 6.2 保持最小变更原则

- 不改变用户操作逻辑
- 不改变界面布局
- 不新增 UI 组件
- 不新增 npm 依赖

---

## 7. 置信度评估

| 评估项 | 置信度 | 理由 |
|--------|--------|------|
| Axios Range 支持 | 高 | Axios 官方支持，HTTP 标准功能 |
| electron-store 适用性 | 高 | 已集成，存储少量任务状态足够 |
| Node.js fs 追加写入 | 高 | Node.js 原生支持，稳定可靠 |
| Wallhaven CDN Range 支持 | 中 | 需实际测试验证 |
| 整体方案可行性 | 高 | 技术栈成熟，无新增依赖 |

---

## 8. 验证清单

### 8.1 实施前验证

- [ ] 测试 Wallhaven CDN 是否支持 Range 请求
- [ ] 验证临时文件追加写入的正确性
- [ ] 测试应用重启后状态恢复

### 8.2 验证代码

```typescript
// 验证 Range 支持
async function checkRangeSupport(url: string): Promise<boolean> {
  try {
    const response = await axios.head(url)
    return response.headers['accept-ranges'] === 'bytes'
  } catch {
    return false
  }
}
```

---

## 9. 版本兼容性

| 技术 | 当前版本 | 最新版本 | 兼容性 |
|------|----------|----------|--------|
| Axios | 1.15.0 | 1.15.2 | ✅ 兼容，Range 支持稳定 |
| electron-store | 11.0.2 | 11.0.2 | ✅ 最新版 |
| Node.js fs | - | - | ✅ 稳定 API |

---

*文档版本：v1.0*
*创建时间：2026-04-26*
