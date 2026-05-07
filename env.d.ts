/// <reference types="vite/client" />

import type { Collection, FavoriteItem } from '@/types/domain/favorite'
import type { WallpaperItem } from '@/types/index'
import type {
  DownloadProgressData,
  IpcResponse,
  PendingDownload,
  ResumeDownloadParams,
} from '@/types/ipc'

// Electron API 类型声明
interface ElectronAPI {
  // 文件夹选择
  selectFolder: () => Promise<string | null>

  // 目录操作
  readDirectory: (dirPath: string, page?: number, pageSize?: number) => Promise<{ error: string | null; files: any[]; total: number; page: number; pageSize: number }>
  openFolder: (folderPath: string) => Promise<{ success: boolean; error?: string }>

  // 文件操作
  deleteFile: (filePath: string) => Promise<{ success: boolean; error: string | null }>
  checkFileExists: (
    filePath: string,
  ) => Promise<{ success: boolean; exists: boolean; error?: string }>

  // 下载功能
  downloadWallpaper: (params: {
    url: string
    filename: string
    saveDir: string
  }) => Promise<{ success: boolean; filePath: string | null; error: string | null }>

  // 带进度的下载任务
  startDownloadTask: (params: {
    taskId: string
    url: string
    filename: string
    saveDir: string
  }) => Promise<{
    success: boolean
    filePath: string | null
    error: string | null
    taskId?: string | null
  }>

  // 暂停下载任务
  pauseDownloadTask: (taskId: string) => Promise<{ success: boolean; error?: string }>

  // 取消下载任务
  cancelDownloadTask: (taskId: string) => Promise<{ success: boolean; error?: string }>

  // 恢复下载任务
  resumeDownloadTask: (params: ResumeDownloadParams) => Promise<IpcResponse<string>>

  // 获取待恢复的下载任务列表
  getPendingDownloads: () => Promise<IpcResponse<PendingDownload[]>>

  // 监听下载进度
  onDownloadProgress: (callback: (data: DownloadProgressData) => void) => void
  removeDownloadProgressListener: (callback: (data: DownloadProgressData) => void) => void

  // 壁纸设置
  setWallpaper: (imagePath: string) => Promise<{ success: boolean; error: string | null }>

  // Wallhaven API 代理
  wallhavenApiRequest: (params: { endpoint: string; params?: any; apiKey?: string }) => Promise<{
    success: boolean
    data: any | null
    error?: string
    status?: number
  }>

  // 窗口控制
  minimizeWindow: () => Promise<void>
  maximizeWindow: () => Promise<void>
  closeWindow: () => Promise<void>
  isMaximized: () => Promise<boolean>

  // Electron Store 操作
  storeGet: (key: string) => Promise<{ success: boolean; value: any; error?: string }>
  storeSet: (params: { key: string; value: any }) => Promise<{ success: boolean; error?: string }>
  storeDelete: (key: string) => Promise<{ success: boolean; error?: string }>
  storeClear: () => Promise<{ success: boolean; error?: string }>

  // 缓存管理
  clearAppCache: (downloadPath?: string) => Promise<{
    success: boolean
    thumbnailsDeleted: number
    tempFilesDeleted: number
    errors?: string[]
    error?: string
  }>
  getCacheInfo: (downloadPath?: string) => Promise<{
    success: boolean
    info: {
      thumbnailsCount: number
      tempFilesCount: number
    }
    error?: string
  }>

  // 孤儿文件清理
  cleanupOrphanFiles: (downloadPath: string) => Promise<{
    success: boolean
    filesDeleted: number
    stateFilesDeleted: number
    errors?: string[]
  }>

  // Favorites & Collections
  favoritesGetCollections: () => Promise<IpcResponse<Collection[]>>
  favoritesCreateCollection: (params: { name: string }) => Promise<IpcResponse<Collection>>
  favoritesRenameCollection: (params: { id: string; name: string }) => Promise<IpcResponse<Collection>>
  favoritesDeleteCollection: (params: { id: string }) => Promise<IpcResponse<void>>
  favoritesSetDefaultCollection: (params: { id: string }) => Promise<IpcResponse<Collection>>
  favoritesGetByCollection: (params: { collectionId?: string }) => Promise<IpcResponse<FavoriteItem[]>>
  favoritesAdd: (params: { wallpaperId: string; collectionId: string; wallpaperData: WallpaperItem }) => Promise<IpcResponse<FavoriteItem>>
  favoritesRemove: (params: { wallpaperId: string; collectionId: string }) => Promise<IpcResponse<void>>
  favoritesMove: (params: { wallpaperId: string; fromCollectionId: string; toCollectionId: string }) => Promise<IpcResponse<FavoriteItem>>
  favoritesIsFavorite: (params: { wallpaperId: string }) => Promise<IpcResponse<boolean>>
  favoritesGetCollectionsForWallpaper: (params: { wallpaperId: string }) => Promise<IpcResponse<Collection[]>>
  favoritesGetPaginated: (params: {
    collectionId?: string
    limit: number
    offset: number
  }) => Promise<IpcResponse<any>>
  favoritesGetCounts: () => Promise<IpcResponse<Record<string, number>>>
  favoritesGetStatusMap: (params: { wallpaperIds: string[] }) => Promise<IpcResponse<Record<string, 0 | 1 | 2>>>

  // 通用IPC通信
  send: (channel: string, data: any) => void
  receive: (channel: string, func: (...args: any[]) => void) => void
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

export {}
