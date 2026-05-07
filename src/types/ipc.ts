/**
 * IPC 通道名称常量和共享类型定义
 * 此文件可被主进程和渲染进程共同使用
 *
 * 主进程导入方式：import { IPC_CHANNELS } from '../../src/types/ipc'
 * 渲染进程导入方式：import { IPC_CHANNELS } from '@/types/ipc'
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
  FILE_EXISTS: 'file-exists',

  // 下载
  DOWNLOAD_WALLPAPER: 'download-wallpaper',
  START_DOWNLOAD_TASK: 'start-download-task',
  PAUSE_DOWNLOAD_TASK: 'pause-download-task',
  RESUME_DOWNLOAD_TASK: 'resume-download-task',
  CANCEL_DOWNLOAD_TASK: 'cancel-download-task',
  GET_PENDING_DOWNLOADS: 'get-pending-downloads',
  DOWNLOAD_PROGRESS: 'download-progress',

  // 壁纸设置
  SET_WALLPAPER: 'set-wallpaper',

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

  // 孤儿文件清理
  CLEANUP_ORPHAN_FILES: 'cleanup-orphan-files',

  // Favorites & Collections
  FAVORITES_GET_COLLECTIONS: 'favorites-get-collections',
  FAVORITES_CREATE_COLLECTION: 'favorites-create-collection',
  FAVORITES_RENAME_COLLECTION: 'favorites-rename-collection',
  FAVORITES_DELETE_COLLECTION: 'favorites-delete-collection',
  FAVORITES_SET_DEFAULT_COLLECTION: 'favorites-set-default-collection',
  FAVORITES_GET_BY_COLLECTION: 'favorites-get-by-collection',
  FAVORITES_ADD: 'favorites-add',
  FAVORITES_REMOVE: 'favorites-remove',
  FAVORITES_MOVE: 'favorites-move',
  FAVORITES_IS_FAVORITE: 'favorites-is-favorite',
  FAVORITES_GET_COLLECTIONS_FOR_WALLPAPER: 'favorites-get-collections-for-wallpaper',
  FAVORITES_GET_PAGINATED: 'favorites-get-paginated',
  FAVORITES_GET_COUNTS: 'favorites-get-counts',
  FAVORITES_GET_STATUS_MAP: 'favorites-get-status-map',
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
 * 读取目录请求参数
 */
export interface ReadDirectoryParams {
  /** 页码，从 1 开始，默认 1 */
  page?: number
  /** 每页数量，默认 50 */
  pageSize?: number
}

/**
 * 读取目录响应
 */
export interface ReadDirectoryResponse {
  error: string | null
  files: LocalFile[]
  /** 符合条件的文件总数 */
  total: number
  /** 当前页码 */
  page: number
  /** 每页数量 */
  pageSize: number
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
 * 文件存在检查请求
 */
export interface FileExistsRequest {
  filePath: string
}

/**
 * 文件存在检查响应
 */
export interface FileExistsResponse {
  success: boolean
  exists: boolean
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
 * 下载任务操作请求参数（暂停/取消）
 */
export interface DownloadTaskOperationRequest {
  taskId: string
}

/**
 * 下载任务操作响应
 */
export interface DownloadTaskOperationResponse {
  success: boolean
  error?: string
}

/**
 * 下载进度数据
 */
export interface DownloadProgressData {
  taskId: string
  progress: number
  offset: number
  speed: number
  state: 'downloading' | 'paused' | 'waiting' | 'completed' | 'failed' | 'retrying'
  filePath?: string
  error?: string
  totalSize?: number
  /** 服务器不支持断点续传，已重新开始下载 */
  resumeNotSupported?: boolean
  /** Current retry attempt (1-based). Present when state='retrying' */
  retryCount?: number
  /** Backoff delay in ms for current retry attempt. Present when state='retrying' */
  retryDelay?: number
}

/**
 * 恢复下载任务请求参数
 * 继承 StartDownloadTaskRequest 并添加 offset 字段
 */
export interface ResumeDownloadParams extends StartDownloadTaskRequest {
  /** 已下载的字节数 */
  offset: number
}

/**
 * 待恢复的下载任务信息
 * 包含恢复下载所需的所有状态信息
 */
export interface PendingDownload {
  /** 任务 ID */
  taskId: string
  /** 下载 URL */
  url: string
  /** 文件名 */
  filename: string
  /** 保存目录 */
  saveDir: string
  /** 已下载字节数 */
  offset: number
  /** 文件总大小 */
  totalSize: number
  /** Wallhaven 壁纸 ID */
  wallpaperId?: string
  /** 缩略图 URL */
  small?: string
  /** 分辨率信息 */
  resolution?: string
  /** 文件大小 */
  size?: number
  /** 创建时间 ISO 字符串 */
  createdAt: string
  /** 更新时间 ISO 字符串 */
  updatedAt: string
}

/**
 * 设置壁纸响应
 */
export interface SetWallpaperResponse {
  success: boolean
  error: string | null
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

/**
 * 清理孤儿文件响应
 */
export interface CleanupOrphanFilesResponse {
  success: boolean
  filesDeleted: number
  stateFilesDeleted: number
  errors?: string[]
}

/**
 * 分页获取收藏请求参数
 */
export interface FavoritesGetPaginatedRequest {
  collectionId?: string
  limit: number
  offset: number
}

/**
 * 收藏计数响应
 * key: collectionId 或 '_total'（表示全部收藏的唯一壁纸数）
 * value: 计数
 */
export type FavoritesCountsResponse = Record<string, number>

/**
 * 批量获取收藏状态请求参数
 */
export interface FavoritesGetStatusMapRequest {
  wallpaperIds: string[]
}

/**
 * 收藏状态映射响应
 * key: wallpaperId
 * value: 0=未收藏, 1=收藏到默认收藏夹, 2=收藏到其他收藏夹
 */
export type FavoritesStatusMapResponse = Record<string, 0 | 1 | 2>

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

/**
 * 检查是否为 ResumeDownloadParams
 */
export function isResumeDownloadParams(value: unknown): value is ResumeDownloadParams {
  if (typeof value !== 'object' || value === null) return false

  const v = value as ResumeDownloadParams
  return (
    typeof v.taskId === 'string' &&
    typeof v.url === 'string' &&
    typeof v.filename === 'string' &&
    typeof v.saveDir === 'string' &&
    typeof v.offset === 'number' &&
    v.offset >= 0
  )
}

/**
 * 检查是否为 PendingDownload
 */
export function isPendingDownload(value: unknown): value is PendingDownload {
  if (typeof value !== 'object' || value === null) return false

  const v = value as PendingDownload
  return (
    typeof v.taskId === 'string' &&
    typeof v.url === 'string' &&
    typeof v.filename === 'string' &&
    typeof v.saveDir === 'string' &&
    typeof v.offset === 'number' &&
    typeof v.totalSize === 'number' &&
    typeof v.createdAt === 'string' &&
    typeof v.updatedAt === 'string'
  )
}
