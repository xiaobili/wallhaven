import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS } from './types'
import type { ResumeDownloadParams, PendingDownload, IpcResponse } from './types'

console.log('[Preload] Script loaded')
console.log('[Preload] ipcRenderer available:', !!ipcRenderer)

// 定义API类型
export interface ElectronAPI {
  // 文件夹选择
  selectFolder: () => Promise<string | null>

  // 目录操作
  readDirectory: (dirPath: string, page?: number, pageSize?: number) => Promise<{ error: string | null; files: any[]; total: number; page: number; pageSize: number }>
  openFolder: (folderPath: string) => Promise<{ success: boolean; error?: string }>

  // 文件操作
  deleteFile: (filePath: string) => Promise<{ success: boolean; error: string | null }>
  checkFileExists: (filePath: string) => Promise<{ success: boolean; exists: boolean; error?: string }>

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
  }) => Promise<{ success: boolean; filePath: string | null; error: string | null }>

  // 暂停下载任务
  pauseDownloadTask: (taskId: string) => Promise<{ success: boolean; error?: string }>

  // 取消下载任务
  cancelDownloadTask: (taskId: string) => Promise<{ success: boolean; error?: string }>

  // 恢复下载任务
  resumeDownloadTask: (params: ResumeDownloadParams) => Promise<IpcResponse<string>>

  // 获取待恢复的下载任务列表
  getPendingDownloads: () => Promise<IpcResponse<PendingDownload[]>>

  // 监听下载进度
  onDownloadProgress: (callback: (data: any) => void) => void
  removeDownloadProgressListener: (callback: (data: any) => void) => void

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
  favoritesGetCollections: () => Promise<IpcResponse<any[]>>
  favoritesCreateCollection: (params: { name: string }) => Promise<IpcResponse<any>>
  favoritesRenameCollection: (params: { id: string; name: string }) => Promise<IpcResponse<any>>
  favoritesDeleteCollection: (params: { id: string }) => Promise<IpcResponse<void>>
  favoritesSetDefaultCollection: (params: { id: string }) => Promise<IpcResponse<any>>
  favoritesGetByCollection: (params: { collectionId?: string }) => Promise<IpcResponse<any[]>>
  favoritesAdd: (params: { wallpaperId: string; collectionId: string; wallpaperData: any }) => Promise<IpcResponse<any>>
  favoritesRemove: (params: { wallpaperId: string; collectionId: string }) => Promise<IpcResponse<void>>
  favoritesMove: (params: { wallpaperId: string; fromCollectionId: string; toCollectionId: string }) => Promise<IpcResponse<any>>
  favoritesIsFavorite: (params: { wallpaperId: string }) => Promise<IpcResponse<boolean>>
  favoritesGetCollectionsForWallpaper: (params: { wallpaperId: string }) => Promise<IpcResponse<any[]>>
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

// 暴露安全的API给渲染进程
const electronAPI: ElectronAPI = {
  // 文件夹选择
  selectFolder: () => {
    console.log('[Preload] selectFolder called')
    return ipcRenderer.invoke(IPC_CHANNELS.SELECT_FOLDER)
  },

  // 目录操作
  readDirectory: (dirPath: string, page?: number, pageSize?: number) => {
    console.log('[Preload] readDirectory called:', dirPath, 'page:', page, 'pageSize:', pageSize)
    return ipcRenderer.invoke(IPC_CHANNELS.READ_DIRECTORY, dirPath, page, pageSize)
  },
  openFolder: (folderPath: string) => {
    console.log('[Preload] openFolder called:', folderPath)
    return ipcRenderer.invoke(IPC_CHANNELS.OPEN_FOLDER, folderPath)
  },

  // 文件操作
  deleteFile: (filePath: string) => {
    console.log('[Preload] deleteFile called:', filePath)
    return ipcRenderer.invoke(IPC_CHANNELS.DELETE_FILE, filePath)
  },
  checkFileExists: (filePath: string) => {
    console.log('[Preload] checkFileExists called:', filePath)
    return ipcRenderer.invoke(IPC_CHANNELS.FILE_EXISTS, filePath)
  },

  // 下载功能
  downloadWallpaper: (params) => {
    console.log('[Preload] downloadWallpaper called:', params)
    return ipcRenderer.invoke(IPC_CHANNELS.DOWNLOAD_WALLPAPER, params)
  },

  // 带进度的下载任务
  startDownloadTask: (params) => {
    console.log('[Preload] startDownloadTask called:', params.taskId)
    return ipcRenderer.invoke(IPC_CHANNELS.START_DOWNLOAD_TASK, params)
  },

  // 暂停下载任务
  pauseDownloadTask: (taskId: string) => {
    console.log('[Preload] pauseDownloadTask called:', taskId)
    return ipcRenderer.invoke(IPC_CHANNELS.PAUSE_DOWNLOAD_TASK, taskId)
  },

  // 取消下载任务
  cancelDownloadTask: (taskId: string) => {
    console.log('[Preload] cancelDownloadTask called:', taskId)
    return ipcRenderer.invoke(IPC_CHANNELS.CANCEL_DOWNLOAD_TASK, taskId)
  },

  // 恢复下载任务
  resumeDownloadTask: (params: ResumeDownloadParams) => {
    console.log('[Preload] resumeDownloadTask called:', params.taskId, 'offset:', params.offset)
    return ipcRenderer.invoke(IPC_CHANNELS.RESUME_DOWNLOAD_TASK, params)
  },

  // 获取待恢复的下载任务列表
  getPendingDownloads: () => {
    console.log('[Preload] getPendingDownloads called')
    return ipcRenderer.invoke(IPC_CHANNELS.GET_PENDING_DOWNLOADS)
  },

  // 监听下载进度
  onDownloadProgress: (callback: (data: any) => void) => {
    console.log('[Preload] onDownloadProgress listener registered')
    ipcRenderer.on(IPC_CHANNELS.DOWNLOAD_PROGRESS, (_event, data) => callback(data))
  },

  removeDownloadProgressListener: (callback: (data: any) => void) => {
    console.log('[Preload] removeDownloadProgressListener called')
    ipcRenderer.removeListener(IPC_CHANNELS.DOWNLOAD_PROGRESS, callback as any)
  },

  // 壁纸设置
  setWallpaper: (imagePath: string) => {
    console.log('[Preload] setWallpaper called:', imagePath)
    return ipcRenderer.invoke(IPC_CHANNELS.SET_WALLPAPER, imagePath)
  },

  // Wallhaven API 代理
  wallhavenApiRequest: (params) => {
    console.log(
      '[Preload] wallhavenApiRequest called:',
      params.endpoint,
      'apiKey:',
      params.apiKey ? '[provided]' : '[not provided]',
    )
    return ipcRenderer.invoke(IPC_CHANNELS.WALLHAVEN_API_REQUEST, params)
  },

  // 窗口控制
  minimizeWindow: () => {
    console.log('[Preload] minimizeWindow called')
    return ipcRenderer.invoke(IPC_CHANNELS.WINDOW_MINIMIZE)
  },
  maximizeWindow: () => {
    console.log('[Preload] maximizeWindow called')
    return ipcRenderer.invoke(IPC_CHANNELS.WINDOW_MAXIMIZE)
  },
  closeWindow: () => {
    console.log('[Preload] closeWindow called')
    return ipcRenderer.invoke(IPC_CHANNELS.WINDOW_CLOSE)
  },
  isMaximized: () => {
    console.log('[Preload] isMaximized called')
    return ipcRenderer.invoke(IPC_CHANNELS.WINDOW_IS_MAXIMIZED)
  },

  // Electron Store 操作
  storeGet: (key: string) => {
    console.log('[Preload] storeGet called:', key)
    return ipcRenderer.invoke(IPC_CHANNELS.STORE_GET, key)
  },
  storeSet: (params: { key: string; value: any }) => {
    console.log('[Preload] storeSet called:', params.key)
    return ipcRenderer.invoke(IPC_CHANNELS.STORE_SET, params)
  },
  storeDelete: (key: string) => {
    console.log('[Preload] storeDelete called:', key)
    return ipcRenderer.invoke(IPC_CHANNELS.STORE_DELETE, key)
  },
  storeClear: () => {
    console.log('[Preload] storeClear called')
    return ipcRenderer.invoke(IPC_CHANNELS.STORE_CLEAR)
  },

  // 缓存管理
  clearAppCache: (downloadPath?: string) => {
    console.log('[Preload] clearAppCache called, downloadPath:', downloadPath)
    return ipcRenderer.invoke(IPC_CHANNELS.CLEAR_APP_CACHE, downloadPath)
  },
  getCacheInfo: (downloadPath?: string) => {
    console.log('[Preload] getCacheInfo called, downloadPath:', downloadPath)
    return ipcRenderer.invoke(IPC_CHANNELS.GET_CACHE_INFO, downloadPath)
  },

  // 孤儿文件清理
  cleanupOrphanFiles: (downloadPath: string) => {
    console.log('[Preload] cleanupOrphanFiles called, downloadPath:', downloadPath)
    return ipcRenderer.invoke(IPC_CHANNELS.CLEANUP_ORPHAN_FILES, downloadPath)
  },

  // Favorites & Collections
  favoritesGetCollections: () => {
    console.log('[Preload] favoritesGetCollections called')
    return ipcRenderer.invoke(IPC_CHANNELS.FAVORITES_GET_COLLECTIONS)
  },
  favoritesCreateCollection: (params) => {
    console.log('[Preload] favoritesCreateCollection called:', params.name)
    return ipcRenderer.invoke(IPC_CHANNELS.FAVORITES_CREATE_COLLECTION, params)
  },
  favoritesRenameCollection: (params) => {
    console.log('[Preload] favoritesRenameCollection called:', params.id, params.name)
    return ipcRenderer.invoke(IPC_CHANNELS.FAVORITES_RENAME_COLLECTION, params)
  },
  favoritesDeleteCollection: (params) => {
    console.log('[Preload] favoritesDeleteCollection called:', params.id)
    return ipcRenderer.invoke(IPC_CHANNELS.FAVORITES_DELETE_COLLECTION, params)
  },
  favoritesSetDefaultCollection: (params) => {
    console.log('[Preload] favoritesSetDefaultCollection called:', params.id)
    return ipcRenderer.invoke(IPC_CHANNELS.FAVORITES_SET_DEFAULT_COLLECTION, params)
  },
  favoritesGetByCollection: (params) => {
    console.log('[Preload] favoritesGetByCollection called:', params.collectionId)
    return ipcRenderer.invoke(IPC_CHANNELS.FAVORITES_GET_BY_COLLECTION, params)
  },
  favoritesAdd: (params) => {
    console.log('[Preload] favoritesAdd called:', params.wallpaperId)
    return ipcRenderer.invoke(IPC_CHANNELS.FAVORITES_ADD, params)
  },
  favoritesRemove: (params) => {
    console.log('[Preload] favoritesRemove called:', params.wallpaperId)
    return ipcRenderer.invoke(IPC_CHANNELS.FAVORITES_REMOVE, params)
  },
  favoritesMove: (params) => {
    console.log('[Preload] favoritesMove called:', params.wallpaperId)
    return ipcRenderer.invoke(IPC_CHANNELS.FAVORITES_MOVE, params)
  },
  favoritesIsFavorite: (params) => {
    console.log('[Preload] favoritesIsFavorite called:', params.wallpaperId)
    return ipcRenderer.invoke(IPC_CHANNELS.FAVORITES_IS_FAVORITE, params)
  },
  favoritesGetCollectionsForWallpaper: (params) => {
    console.log('[Preload] favoritesGetCollectionsForWallpaper called:', params.wallpaperId)
    return ipcRenderer.invoke(IPC_CHANNELS.FAVORITES_GET_COLLECTIONS_FOR_WALLPAPER, params)
  },
  favoritesGetPaginated: (params) => {
    console.log('[Preload] favoritesGetPaginated called:', params)
    return ipcRenderer.invoke(IPC_CHANNELS.FAVORITES_GET_PAGINATED, params)
  },
  favoritesGetCounts: () => {
    console.log('[Preload] favoritesGetCounts called')
    return ipcRenderer.invoke(IPC_CHANNELS.FAVORITES_GET_COUNTS)
  },
  favoritesGetStatusMap: (params) => {
    console.log('[Preload] favoritesGetStatusMap called:', params.wallpaperIds.length, 'ids')
    return ipcRenderer.invoke(IPC_CHANNELS.FAVORITES_GET_STATUS_MAP, params)
  },

  // 通用IPC通信（保留示例功能）
  send: (channel: string, data: any) => {
    const validChannels = ['toMain']
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data)
    }
  },
  receive: (channel: string, func: (...args: any[]) => void) => {
    const validChannels = ['fromMain']
    if (validChannels.includes(channel)) {
      // Deliberately strip event as it includes `sender`
      ipcRenderer.on(channel, (_event: any, ...args: any[]) => func(...args))
    }
  },
}

console.log('[Preload] Exposing electronAPI to window')
console.log('[Preload] electronAPI methods:', Object.keys(electronAPI))

// 将API暴露给渲染进程
contextBridge.exposeInMainWorld('electronAPI', electronAPI)

console.log('[Preload] Done')
