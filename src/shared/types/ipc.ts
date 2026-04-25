/**
 * IPC 通道名称常量和共享类型定义
 * 此文件可被主进程和渲染进程共同使用
 *
 * 主进程导入方式：import { IPC_CHANNELS } from '../../src/shared/types/ipc'
 * 渲染进程导入方式：import { IPC_CHANNELS } from '@/shared/types/ipc'
 */

// ==================== IPC 通道名称常量 ====================

/**
 * IPC 通道名称常量
 * 使用常量避免字符串拼写错误
 */
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
} as const

// ==================== IPC 响应类型 ====================

/**
 * 通用 IPC 响应包装类型
 */
export interface IpcResponse<T = unknown> {
  success: boolean
  data?: T
  error?: IpcErrorInfo
}

/**
 * IPC 错误信息
 */
export interface IpcErrorInfo {
  code: string
  message: string
}

// ==================== 各通道的请求/响应类型 ====================

/**
 * 选择文件夹响应
 */
export interface SelectFolderResponse {
  path: string | null
}

/**
 * 本地文件信息
 */
export interface LocalFile {
  name: string
  path: string
  thumbnailPath: string
  size: number
  modifiedAt: number
  width: number
  height: number
}

/**
 * 读取目录响应
 */
export interface ReadDirectoryResponse {
  error: string | null
  files: LocalFile[]
}

/**
 * 打开文件夹响应
 */
export interface OpenFolderResponse {
  success: boolean
  error?: string
}

/**
 * 删除文件响应
 */
export interface DeleteFileResponse {
  success: boolean
  error: string | null
}

/**
 * 下载壁纸请求参数
 */
export interface DownloadWallpaperRequest {
  url: string
  filename: string
  saveDir: string
}

/**
 * 下载壁纸响应
 */
export interface DownloadWallpaperResponse {
  success: boolean
  filePath: string | null
  error: string | null
}

/**
 * 开始下载任务请求参数
 */
export interface StartDownloadTaskRequest {
  taskId: string
  url: string
  filename: string
  saveDir: string
}

/**
 * 下载进度数据
 */
export interface DownloadProgressData {
  taskId: string
  progress: number
  offset: number
  speed: number
  state: 'downloading' | 'paused' | 'waiting' | 'completed' | 'failed'
  filePath?: string
  error?: string
  totalSize?: number
}

/**
 * 设置壁纸响应
 */
export interface SetWallpaperResponse {
  success: boolean
  error: string | null
}

/**
 * 保存设置请求
 */
export interface SaveSettingsRequest {
  settings: Record<string, unknown>
}

/**
 * 保存设置响应
 */
export interface SaveSettingsResponse {
  success: boolean
  error?: string
}

/**
 * 加载设置响应
 */
export interface LoadSettingsResponse {
  success: boolean
  settings: Record<string, unknown> | null
  error?: string
}

/**
 * Wallhaven API 请求参数
 */
export interface WallhavenApiRequest {
  endpoint: string
  params?: Record<string, unknown>
}

/**
 * Wallhaven API 响应
 */
export interface WallhavenApiResponse<T = unknown> {
  success: boolean
  data: T | null
  error?: string
  status?: number
}

/**
 * Store 操作请求
 */
export interface StoreSetRequest {
  key: string
  value: unknown
}

/**
 * Store 获取响应
 */
export interface StoreGetResponse {
  success: boolean
  value: unknown
  error?: string
}

/**
 * Store 操作响应
 */
export interface StoreOperationResponse {
  success: boolean
  error?: string
}

/**
 * 缓存信息
 */
export interface CacheInfo {
  thumbnailsCount: number
  tempFilesCount: number
}

/**
 * 获取缓存信息响应
 */
export interface GetCacheInfoResponse {
  success: boolean
  info: CacheInfo
  error?: string
}

/**
 * 清理缓存响应
 */
export interface ClearCacheResponse {
  success: boolean
  thumbnailsDeleted: number
  tempFilesDeleted: number
  errors?: string[]
  error?: string
}

// ==================== 类型守卫 ====================

/**
 * 检查是否为 IpcErrorInfo
 */
export function isIpcErrorInfo(value: unknown): value is IpcErrorInfo {
  return (
    typeof value === 'object' &&
    value !== null &&
    'code' in value &&
    'message' in value &&
    typeof (value as IpcErrorInfo).code === 'string' &&
    typeof (value as IpcErrorInfo).message === 'string'
  )
}
