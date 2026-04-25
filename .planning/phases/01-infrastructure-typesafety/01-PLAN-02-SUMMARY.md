---
phase: 1
plan: 2
status: complete
completed: 2025-04-25
---

# Plan 02: 创建 IPC 类型定义

## 完成的工作

创建了 `src/shared/types/ipc.ts`，定义所有 IPC 通道名称常量和共享类型。

### 创建的文件

| 文件 | 用途 |
|------|------|
| `src/shared/types/ipc.ts` | IPC 通道常量和共享类型定义 |

### 定义的内容

#### IPC_CHANNELS 常量

```typescript
export const IPC_CHANNELS = {
  // 文件操作
  SELECT_FOLDER: 'select-folder',
  READ_DIRECTORY: 'read-directory',
  OPEN_FOLDER: 'open-folder',
  DELETE_FILE: 'delete-file',
  
  // 下载
  DOWNLOAD_WALLPAPER: 'download-wallpaper',
  START_DOWNLOAD_TASK: 'start-download-task',
  DOWNLOAD_PROGRESS: 'download-progress',
  
  // 壁纸设置
  SET_WALLPAPER: 'set-wallpaper',
  
  // 设置管理
  SAVE_SETTINGS: 'save-settings',
  LOAD_SETTINGS: 'load-settings',
  
  // API 代理
  WALLHAVEN_API_REQUEST: 'wallhaven-api-request',
  
  // 窗口控制
  WINDOW_MINIMIZE: 'window-minimize',
  WINDOW_MAXIMIZE: 'window-maximize',
  WINDOW_CLOSE: 'window-close',
  WINDOW_IS_MAXIMIZED: 'window-is-maximized',
  
  // Store 操作
  STORE_GET: 'store-get',
  STORE_SET: 'store-set',
  STORE_DELETE: 'store-delete',
  STORE_CLEAR: 'store-clear',
  
  // 缓存管理
  CLEAR_APP_CACHE: 'clear-app-cache',
  GET_CACHE_INFO: 'get-cache-info',
}
```

#### 类型定义

- `IpcResponse<T>` - 通用 IPC 响应包装类型
- `IpcErrorInfo` - IPC 错误信息
- `SelectFolderResponse` - 选择文件夹响应
- `LocalFile` - 本地文件信息
- `ReadDirectoryResponse` - 读取目录响应
- `DownloadWallpaperRequest/Response` - 下载壁纸请求/响应
- `StartDownloadTaskRequest` - 开始下载任务请求
- `DownloadProgressData` - 下载进度数据
- `SetWallpaperResponse` - 设置壁纸响应
- `SaveSettingsRequest/Response` - 保存设置请求/响应
- `LoadSettingsResponse` - 加载设置响应
- `WallhavenApiRequest/Response` - Wallhaven API 请求/响应
- `StoreSetRequest/GetResponse/OperationResponse` - Store 操作类型
- `CacheInfo/GetCacheInfoResponse/ClearCacheResponse` - 缓存管理类型

#### 类型守卫

- `isIpcErrorInfo(value)` - 检查是否为 IpcErrorInfo

## 验证结果

- [x] 文件创建成功
- [x] IPC_CHANNELS 包含所有现有通道名称
- [x] 类型定义完整，覆盖所有现有 IPC 操作
- [x] TypeScript 编译无错误
- [x] 可被渲染进程通过 `@/shared/types/ipc` 导入

## 使用方式

```typescript
// 渲染进程
import { IPC_CHANNELS, IpcResponse } from '@/shared/types/ipc'

// 主进程
import { IPC_CHANNELS } from '../../src/shared/types/ipc'
```

## 注意事项

- 通道名称与现有实现完全一致，保持向后兼容
- 主进程和渲染进程都可以导入此文件
