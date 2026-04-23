import { contextBridge, ipcRenderer } from 'electron'

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
  
  // 窗口控制
  minimizeWindow: () => Promise<void>
  maximizeWindow: () => Promise<void>
  closeWindow: () => Promise<void>
  isMaximized: () => Promise<boolean>
  
  // 通用IPC通信
  send: (channel: string, data: any) => void
  receive: (channel: string, func: (...args: any[]) => void) => void
}

// 暴露安全的API给渲染进程
const electronAPI: ElectronAPI = {
  // 文件夹选择
  selectFolder: () => {
    console.log('[Preload] selectFolder called')
    return ipcRenderer.invoke('select-folder')
  },
  
  // 目录操作
  readDirectory: (dirPath: string) => {
    console.log('[Preload] readDirectory called:', dirPath)
    return ipcRenderer.invoke('read-directory', dirPath)
  },
  openFolder: (folderPath: string) => {
    console.log('[Preload] openFolder called:', folderPath)
    return ipcRenderer.invoke('open-folder', folderPath)
  },
  
  // 文件操作
  deleteFile: (filePath: string) => {
    console.log('[Preload] deleteFile called:', filePath)
    return ipcRenderer.invoke('delete-file', filePath)
  },
  
  // 下载功能
  downloadWallpaper: (params) => {
    console.log('[Preload] downloadWallpaper called:', params)
    return ipcRenderer.invoke('download-wallpaper', params)
  },
  
  // 带进度的下载任务
  startDownloadTask: (params) => {
    console.log('[Preload] startDownloadTask called:', params.taskId)
    return ipcRenderer.invoke('start-download-task', params)
  },
  
  // 监听下载进度
  onDownloadProgress: (callback: (data: any) => void) => {
    console.log('[Preload] onDownloadProgress listener registered')
    ipcRenderer.on('download-progress', (_event, data) => callback(data))
  },
  
  removeDownloadProgressListener: (callback: (data: any) => void) => {
    console.log('[Preload] removeDownloadProgressListener called')
    ipcRenderer.removeListener('download-progress', callback as any)
  },

  // 壁纸设置
  setWallpaper: (imagePath: string) => {
    console.log('[Preload] setWallpaper called:', imagePath)
    return ipcRenderer.invoke('set-wallpaper', imagePath)
  },
  
  // 设置管理
  saveSettings: (settings: any) => {
    console.log('[Preload] saveSettings called')
    return ipcRenderer.invoke('save-settings', settings)
  },
  loadSettings: () => {
    console.log('[Preload] loadSettings called')
    return ipcRenderer.invoke('load-settings')
  },
  
  // 窗口控制
  minimizeWindow: () => {
    console.log('[Preload] minimizeWindow called')
    return ipcRenderer.invoke('window-minimize')
  },
  maximizeWindow: () => {
    console.log('[Preload] maximizeWindow called')
    return ipcRenderer.invoke('window-maximize')
  },
  closeWindow: () => {
    console.log('[Preload] closeWindow called')
    return ipcRenderer.invoke('window-close')
  },
  isMaximized: () => {
    console.log('[Preload] isMaximized called')
    return ipcRenderer.invoke('window-is-maximized')
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
