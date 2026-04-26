/// <reference types="vite/client" />

// 下载进度数据类型
interface DownloadProgressData {
  taskId: string
  progress: number
  offset: number
  speed: number
  state: 'downloading' | 'paused' | 'waiting' | 'completed'
  filePath?: string
  totalSize?: number
  error?: string
}

// Electron API 类型声明
interface ElectronAPI {
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
  onDownloadProgress: (callback: (data: DownloadProgressData) => void) => void
  removeDownloadProgressListener: (callback: (data: DownloadProgressData) => void) => void

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

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

export {}
