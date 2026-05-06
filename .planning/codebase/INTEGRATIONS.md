# 外部集成文档

> 最后更新: 2026-05-06

## 概述

本文档记录 Wallhaven 壁纸浏览器的所有外部集成点，包括 API、数据库、文件系统和桌面系统集成。

---

## 1. Wallhaven API

### 基础信息

| 属性 | 值 |
|------|-----|
| **API 基础 URL** | `https://wallhaven.cc/api/v1` |
| **认证方式** | API Key (请求头 `X-API-Key`) |
| **请求超时** | 15 秒 |

### API 端点

#### 搜索壁纸
```
GET /search
```

**查询参数** (`GetParams`):
| 参数 | 类型 | 描述 |
|------|------|------|
| `q` | string | 搜索关键词 |
| `categories` | string | 分类 (如 "111" 表示全部) |
| `purity` | string | 纯度过滤 |
| `sorting` | string | 排序方式 (relevance, random, views, favorites, toplist) |
| `topRange` | string | 热门时间范围 |
| `order` | string | 排序方向 |
| `colors` | string | 颜色过滤 |
| `ratios` | string | 宽高比过滤 |
| `atleast` | string | 最小分辨率 |
| `resolutions` | string | 精确分辨率 |
| `page` | number | 页码 |
| `seed` | string | 随机种子 |
| `ai_art_filter` | number | AI 艺术过滤 |

#### 获取壁纸详情
```
GET /w/{id}
```

### 认证机制

API Key 通过以下方式传递：

1. **请求头**:
   ```http
   X-API-Key: <your-api-key>
   ```

2. **存储位置**: 用户设置中保存 (`appSettings.apiKey`)

3. **使用场景**:
   - 访问用户收藏
   - 解锁 NSFW 内容
   - 获取更高 API 限额

### 请求代理机制

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  渲染进程        │     │  主进程          │     │  Wallhaven API  │
│                 │     │                 │     │                 │
│  开发环境:       │     │                 │     │                 │
│  axios → /api   │────→│  Vite Proxy     │────→│  Direct Request │
│                 │     │                 │     │                 │
│  生产环境:       │     │                 │     │                 │
│  window.        │────→│  IPC Handler    │────→│  axios Request  │
│  electronAPI    │     │  (api.handler)  │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### 错误处理

| HTTP 状态码 | 错误码 | 描述 |
|------------|--------|------|
| 401 | `NETWORK_UNAUTHORIZED` | API Key 无效或过期 |
| 403 | `NETWORK_FORBIDDEN` | 访问被拒绝 |
| 404 | `NETWORK_NOT_FOUND` | 资源不存在 |
| 5xx | `NETWORK_SERVER_ERROR` | 服务器错误 |
| Timeout | `NETWORK_TIMEOUT` | 请求超时 |
| Network | `NETWORK_ERROR` | 网络错误 |

### 重试策略

API 请求实现自动重试：

```typescript
const maxRetries = 2  // 总共尝试 3 次

// 可重试的错误类型
const isRetryableError =
  error.code === 'ECONNRESET' ||
  error.code === 'ETIMEDOUT' ||
  error.code === 'ECONNABORTED' ||
  error.message.includes('socket disconnected') ||
  error.message.includes('TLS') ||
  !error.response

// 指数退避: 1s, 2s
const delay = Math.pow(2, attempt) * 500
```

---

## 2. SQLite 数据库

### 数据库配置

| 属性 | 值 |
|------|-----|
| **文件名** | `wallhaven-data.db` |
| **位置** | `{userData}/wallhaven-data.db` |
| **日志模式** | WAL (Write-Ahead Logging) |
| **外键约束** | 启用 |
| **超时** | 5000ms |

### 数据表结构

#### settings 表
```sql
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
```
存储应用配置 (JSON 序列化)

#### search_params 表
```sql
CREATE TABLE search_params (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  value TEXT
);
```
存储搜索参数

#### download_history 表
```sql
CREATE TABLE download_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  wallpaper_id TEXT,
  url TEXT,
  filename TEXT,
  file_path TEXT,
  file_size INTEGER,
  thumbnail_path TEXT,
  resolution TEXT,
  data TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);
```
下载历史记录

#### collections 表
```sql
CREATE TABLE collections (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  is_default INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```
收藏夹

#### favorites 表
```sql
CREATE TABLE favorites (
  collection_id TEXT NOT NULL,
  wallpaper_id TEXT NOT NULL,
  wallpaper_data TEXT NOT NULL,
  added_at TEXT NOT NULL,
  PRIMARY KEY (collection_id, wallpaper_id),
  FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE
);

CREATE INDEX idx_favorites_wallpaper ON favorites(wallpaper_id);
```
收藏项

### WAL 管理

```typescript
const CHECKPOINT_INTERVAL_MS = 5 * 60 * 1000  // 5 分钟
const WAL_SIZE_THRESHOLD_BYTES = 10 * 1024 * 1024  // 10 MB

// 定期检查点
setInterval(() => {
  db.exec('PRAGMA wal_checkpoint(PASSIVE)')
}, CHECKPOINT_INTERVAL_MS)

// WAL 文件大小监控
setInterval(() => {
  if (statSync(walPath).size > WAL_SIZE_THRESHOLD_BYTES) {
    db.exec('PRAGMA wal_checkpoint(TRUNCATE)')
  }
}, WAL_MONITOR_INTERVAL_MS)
```

---

## 3. 文件系统集成

### 自定义协议

应用注册了 `wallhaven://` 自定义协议用于加载本地文件：

```typescript
protocol.handle('wallhaven', (request) => {
  const filePath = decodeURIComponent(request.url.replace(/^wallhaven:\/\//, ''))
  // ...读取文件并返回 Response
})
```

**支持的 MIME 类型**:
- `image/jpeg` (.jpg, .jpeg)
- `image/png` (.png)
- `image/gif` (.gif)
- `image/webp` (.webp)
- `image/svg+xml` (.svg)
- `image/bmp` (.bmp)
- `image/x-icon` (.ico)

### 下载文件结构

```
{downloadPath}/
├── wallpaper.jpg           # 已完成的下载
├── wallpaper.jpg.download  # 临时下载文件
├── wallpaper.jpg.download.json  # 下载状态文件 (用于断点续传)
└── thumbnails/             # 缩略图缓存
    └── {wallpaper_id}.jpg
```

### 断点续传状态文件

```typescript
interface PendingDownload {
  taskId: string
  url: string
  filename: string
  saveDir: string
  offset: number       // 已下载字节数
  totalSize: number    // 总大小
  createdAt: string
  updatedAt: string
}
```

---

## 4. 桌面系统集成

### 壁纸设置

使用 `wallpaper` npm 包设置桌面壁纸：

```typescript
import { setWallpaper } from 'wallpaper'

await setWallpaper(imagePath)
```

支持跨平台：
- **Windows**: 使用 SystemParametersInfo API
- **macOS**: 使用 AppleScript
- **Linux**: 支持多种桌面环境 (GNOME, KDE, XFCE 等)

### 窗口控制

| 功能 | IPC 通道 | 描述 |
|------|----------|------|
| 最小化 | `window-minimize` | 最小化窗口 |
| 最大化 | `window-maximize` | 最大化/还原窗口 |
| 关闭 | `window-close` | 关闭窗口 |
| 最大化状态 | `window-is-maximized` | 查询最大化状态 |

### 应用生命周期

```typescript
// 启动流程
app.whenReady().then(() => {
  registerLocalFileProtocol()  // 注册自定义协议
  electronApp.setAppUserModelId('com.wallhaven')
  createSplashWindow()         // 显示启动画面
  createWindow()               // 创建主窗口
  registerAllHandlers()        // 注册 IPC 处理器
})

// 关闭流程
app.on('before-quit', () => {
  closeDatabase()  // 关闭数据库连接
})
```

---

## 5. IPC 通信

### IPC 通道定义

| 通道名称 | 方向 | 描述 |
|----------|------|------|
| `wallhaven-api-request` | 双向 | API 代理请求 |
| `download-wallpaper` | 双向 | 简单下载 |
| `start-download-task` | 双向 | 开始下载任务 |
| `pause-download-task` | 双向 | 暂停下载 |
| `cancel-download-task` | 双向 | 取消下载 |
| `resume-download-task` | 双向 | 恢复下载 |
| `get-pending-downloads` | 双向 | 获取待恢复下载 |
| `download-progress` | 主进程→渲染 | 下载进度事件 |
| `set-wallpaper` | 双向 | 设置壁纸 |
| `select-folder` | 双向 | 选择文件夹 |
| `read-directory` | 双向 | 读取目录 |
| `open-folder` | 双向 | 打开文件夹 |
| `delete-file` | 双向 | 删除文件 |
| `file-exists` | 双向 | 检查文件存在 |
| `clear-app-cache` | 双向 | 清除缓存 |
| `get-cache-info` | 双向 | 获取缓存信息 |
| `cleanup-orphan-files` | 双向 | 清理孤儿文件 |
| `store-get` | 双向 | 获取设置 |
| `store-set` | 双向 | 保存设置 |
| `store-delete` | 双向 | 删除设置 |
| `store-clear` | 双向 | 清除设置 |
| `favorites-*` | 双向 | 收藏相关操作 |

### 收藏 IPC 通道

| 通道名称 | 描述 |
|----------|------|
| `favorites-get-collections` | 获取所有收藏夹 |
| `favorites-create-collection` | 创建收藏夹 |
| `favorites-rename-collection` | 重命名收藏夹 |
| `favorites-delete-collection` | 删除收藏夹 |
| `favorites-set-default-collection` | 设为默认收藏夹 |
| `favorites-get-by-collection` | 按收藏夹获取收藏 |
| `favorites-add` | 添加收藏 |
| `favorites-remove` | 移除收藏 |
| `favorites-move` | 移动收藏 |
| `favorites-is-favorite` | 检查是否收藏 |
| `favorites-get-collections-for-wallpaper` | 获取壁纸所在收藏夹 |
| `favorites-get-paginated` | 分页获取收藏 |
| `favorites-get-counts` | 获取收藏计数 |
| `favorites-get-status-map` | 批量获取收藏状态 |

---

## 6. 缓存策略

### API 响应缓存

```typescript
const apiCache = new Map<string, CacheItem>()
const CACHE_TTL = 5 * 60 * 1000  // 5 分钟

// 缓存限制
if (apiCache.size > 50) {
  const firstKey = apiCache.keys().next().value
  apiCache.delete(firstKey)
}
```

### 下载状态持久化

```typescript
// 每 5 秒或每 10MB 持久化一次
const MIN_INTERVAL = 5000  // 5 秒
const MIN_BYTES = 10 * 1024 * 1024  // 10MB

function shouldPersistState(
  lastPersistTime: number,
  lastPersistOffset: number,
  currentOffset: number
): boolean {
  const timeElapsed = Date.now() - lastPersistTime
  const bytesDownloaded = currentOffset - lastPersistOffset
  return timeElapsed >= MIN_INTERVAL || bytesDownloaded >= MIN_BYTES
}
```

---

## 7. 错误处理体系

### 错误码定义

```typescript
export const ErrorCodes = {
  // 网络错误
  NETWORK_ERROR: 'NETWORK_ERROR',
  NETWORK_TIMEOUT: 'NETWORK_TIMEOUT',
  NETWORK_UNAUTHORIZED: 'NETWORK_UNAUTHORIZED',
  NETWORK_FORBIDDEN: 'NETWORK_FORBIDDEN',
  NETWORK_NOT_FOUND: 'NETWORK_NOT_FOUND',
  NETWORK_SERVER_ERROR: 'NETWORK_SERVER_ERROR',

  // 存储错误
  STORE_GET_ERROR: 'STORE_GET_ERROR',
  STORE_SET_ERROR: 'STORE_SET_ERROR',

  // IPC 错误
  IPC_INVOKE_ERROR: 'IPC_INVOKE_ERROR',

  // 应用错误
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
}
```

### IPC 响应格式

```typescript
interface IpcResponse<T> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
  }
}
```

---

## 8. 图像处理

### Sharp 模块

用于图像处理，需要特殊处理原生模块：

```yaml
# electron-builder.yml
asarUnpack:
  - '**/node_modules/sharp/**/*'
  - '**/node_modules/@img/**/*'
```

跨平台构建脚本：
```json
{
  "prebuild:mac": "npm rebuild sharp --platform=darwin --arch=x64",
  "prebuild:linux": "npm rebuild sharp --platform=linux --arch=x64"
}
```

---

## 9. 自动更新

### 配置

```yaml
# electron-builder.yml
publish:
  provider: generic
  url: https://example.com/auto-updates
```

当前为占位配置，实际部署需要配置正确的更新服务器 URL。
