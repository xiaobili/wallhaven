import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS, isValidInvokeChannel } from './types'

console.log('[Preload] Script loaded')
console.log('[Preload] ipcRenderer available:', !!ipcRenderer)

// 定义API类型
export interface ElectronAPI {
  // 文件夹选择
  selectFolder: () => Promise<string | null>

  // 目录操作
  readDirectory: (dirPath: string) => Promise<{ error: string | null; files: any[] }>
  openFolder: (folderPath: string) => Promise<{ success: boolean; error?: string }>

  // 文件操作
  deleteFile: (filePath: string) => Promise<{ success: boolean; error: string | null }>

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

  // 监听下载进度
  onDownloadProgress: (callback: (data: any) => void) => void
  removeDownloadProgressListener: (callback: (data: any) => void) => void

  // 壁纸设置
  setWallpaper: (imagePath: string) => Promise<{ success: boolean; error: string | null }>

  // 设置管理
  saveSettings: (settings: any) => Promise<{ success: boolean; error?: string }>
  loadSettings: () => Promise<{ success: boolean; settings: any | null; error?: string }>

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
  readDirectory: (dirPath: string) => {
    console.log('[Preload] readDirectory called:', dirPath)
    return ipcRenderer.invoke(IPC_CHANNELS.READ_DIRECTORY, dirPath)
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

  // 设置管理
  saveSettings: (settings: any) => {
    console.log('[Preload] saveSettings called')
    return ipcRenderer.invoke(IPC_CHANNELS.SAVE_SETTINGS, settings)
  },
  loadSettings: () => {
    console.log('[Preload] loadSettings called')
    return ipcRenderer.invoke(IPC_CHANNELS.LOAD_SETTINGS)
  },

  // Wallhaven API 代理
  wallhavenApiRequest: (params) => {
    console.log('[Preload] wallhavenApiRequest called:', params.endpoint, 'apiKey:', params.apiKey ? '[provided]' : '[not provided]')
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
  }
}

console.log('[Preload] Exposing electronAPI to window')
console.log('[Preload] electronAPI methods:', Object.keys(electronAPI))

// 将API暴露给渲染进程
contextBridge.exposeInMainWorld('electronAPI', electronAPI)

console.log('[Preload] Done')
