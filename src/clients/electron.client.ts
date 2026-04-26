/**
 * Electron IPC 客户端
 * 封装所有 window.electronAPI 方法，统一返回 IpcResponse<T> 格式
 */

import type {
  IpcResponse,
  DownloadProgressData,
  LocalFile,
  CacheInfo,
} from '@/shared/types/ipc'
import { ErrorCodes } from '@/errors'

/**
 * ElectronClient 实现类
 */
class ElectronClientImpl {
  // ==================== 私有辅助方法 ====================

  /**
   * 检查 Electron API 是否可用
   */
  private isAvailable(): boolean {
    return typeof window !== 'undefined' && !!window.electronAPI
  }

  /**
   * 创建错误响应
   */
  private createErrorResponse<T>(code: string, message: string): IpcResponse<T> {
    return {
      success: false,
      error: { code, message },
    }
  }

  /**
   * 创建 Electron 不可用错误响应
   */
  private createUnavailableResponse<T>(): IpcResponse<T> {
    return this.createErrorResponse<T>(
      'ELECTRON_UNAVAILABLE',
      'Electron API is not available'
    )
  }

  // ==================== Store 操作 ====================

  /**
   * 从 electron-store 获取数据
   */
  async storeGet<T>(key: string): Promise<IpcResponse<T | null>> {
    if (!this.isAvailable()) {
      return this.createUnavailableResponse<T | null>()
    }

    try {
      const result = await window.electronAPI.storeGet(key)
      if (result.success) {
        return { success: true, data: result.value as T }
      }
      return {
        success: false,
        data: null,
        error: {
          code: ErrorCodes.STORE_READ_ERROR,
          message: result.error || 'Store get failed',
        },
      }
    } catch (error) {
      return {
        success: false,
        data: null,
        error: { code: ErrorCodes.STORE_ERROR, message: String(error) },
      }
    }
  }

  /**
   * 向 electron-store 保存数据
   */
  async storeSet(key: string, value: unknown): Promise<IpcResponse<void>> {
    if (!this.isAvailable()) {
      return this.createUnavailableResponse<void>()
    }

    try {
      // 深度克隆对象，移除 Vue reactive proxy，避免 IPC 克隆错误
      const plainValue = JSON.parse(JSON.stringify(value))
      const result = await window.electronAPI.storeSet({ key, value: plainValue })
      if (result.success) {
        return { success: true }
      }
      return {
        success: false,
        error: {
          code: ErrorCodes.STORE_WRITE_ERROR,
          message: result.error || 'Store set failed',
        },
      }
    } catch (error) {
      return {
        success: false,
        error: { code: ErrorCodes.STORE_ERROR, message: String(error) },
      }
    }
  }

  /**
   * 从 electron-store 删除数据
   */
  async storeDelete(key: string): Promise<IpcResponse<void>> {
    if (!this.isAvailable()) {
      return this.createUnavailableResponse<void>()
    }

    try {
      const result = await window.electronAPI.storeDelete(key)
      if (result.success) {
        return { success: true }
      }
      return {
        success: false,
        error: {
          code: ErrorCodes.STORE_DELETE_ERROR,
          message: result.error || 'Store delete failed',
        },
      }
    } catch (error) {
      return {
        success: false,
        error: { code: ErrorCodes.STORE_ERROR, message: String(error) },
      }
    }
  }

  /**
   * 清空 electron-store 所有数据
   */
  async storeClear(): Promise<IpcResponse<void>> {
    if (!this.isAvailable()) {
      return this.createUnavailableResponse<void>()
    }

    try {
      const result = await window.electronAPI.storeClear()
      if (result.success) {
        return { success: true }
      }
      return {
        success: false,
        error: { code: ErrorCodes.STORE_ERROR, message: result.error || 'Store clear failed' },
      }
    } catch (error) {
      return {
        success: false,
        error: { code: ErrorCodes.STORE_ERROR, message: String(error) },
      }
    }
  }

  // ==================== 文件操作 ====================

  /**
   * 选择文件夹
   */
  async selectFolder(): Promise<IpcResponse<string | null>> {
    if (!this.isAvailable()) {
      return this.createUnavailableResponse<string | null>()
    }

    try {
      const path = await window.electronAPI.selectFolder()
      return { success: true, data: path }
    } catch (error) {
      return {
        success: false,
        data: null,
        error: { code: 'SELECT_FOLDER_ERROR', message: String(error) },
      }
    }
  }

  /**
   * 读取目录
   */
  async readDirectory(dirPath: string): Promise<IpcResponse<LocalFile[]>> {
    if (!this.isAvailable()) {
      return this.createUnavailableResponse<LocalFile[]>()
    }

    try {
      const result = await window.electronAPI.readDirectory(dirPath)
      if (result.error) {
        return {
          success: false,
          data: [],
          error: { code: 'READ_DIRECTORY_ERROR', message: result.error },
        }
      }
      return { success: true, data: result.files as LocalFile[] }
    } catch (error) {
      return {
        success: false,
        data: [],
        error: { code: 'READ_DIRECTORY_ERROR', message: String(error) },
      }
    }
  }

  /**
   * 打开文件夹
   */
  async openFolder(folderPath: string): Promise<IpcResponse<void>> {
    if (!this.isAvailable()) {
      return this.createUnavailableResponse<void>()
    }

    try {
      const result = await window.electronAPI.openFolder(folderPath)
      if (result.success) {
        return { success: true }
      }
      return {
        success: false,
        error: { code: 'OPEN_FOLDER_ERROR', message: result.error || 'Open folder failed' },
      }
    } catch (error) {
      return {
        success: false,
        error: { code: 'OPEN_FOLDER_ERROR', message: String(error) },
      }
    }
  }

  /**
   * 删除文件
   */
  async deleteFile(filePath: string): Promise<IpcResponse<void>> {
    if (!this.isAvailable()) {
      return this.createUnavailableResponse<void>()
    }

    try {
      const result = await window.electronAPI.deleteFile(filePath)
      if (result.success) {
        return { success: true }
      }
      return {
        success: false,
        error: { code: 'DELETE_FILE_ERROR', message: result.error || 'Delete file failed' },
      }
    } catch (error) {
      return {
        success: false,
        error: { code: 'DELETE_FILE_ERROR', message: String(error) },
      }
    }
  }

  // ==================== 下载管理 ====================

  /**
   * 下载壁纸（同步模式）
   */
  async downloadWallpaper(params: {
    url: string
    filename: string
    saveDir: string
  }): Promise<IpcResponse<string>> {
    if (!this.isAvailable()) {
      return this.createUnavailableResponse<string>()
    }

    try {
      const result = await window.electronAPI.downloadWallpaper(params)
      if (result.success && result.filePath) {
        return { success: true, data: result.filePath }
      }
      return {
        success: false,
        error: { code: 'DOWNLOAD_ERROR', message: result.error || 'Download failed' },
      }
    } catch (error) {
      return {
        success: false,
        error: { code: 'DOWNLOAD_ERROR', message: String(error) },
      }
    }
  }

  /**
   * 开始下载任务（带进度）
   */
  async startDownloadTask(params: {
    taskId: string
    url: string
    filename: string
    saveDir: string
  }): Promise<IpcResponse<string>> {
    if (!this.isAvailable()) {
      return this.createUnavailableResponse<string>()
    }

    try {
      const result = await window.electronAPI.startDownloadTask(params)
      if (result.success && result.filePath) {
        return { success: true, data: result.filePath }
      }
      return {
        success: false,
        error: { code: 'DOWNLOAD_ERROR', message: result.error || 'Download task failed' },
      }
    } catch (error) {
      return {
        success: false,
        error: { code: 'DOWNLOAD_ERROR', message: String(error) },
      }
    }
  }

  /**
   * 监听下载进度
   */
  onDownloadProgress(callback: (data: DownloadProgressData) => void): void {
    if (this.isAvailable()) {
      window.electronAPI.onDownloadProgress(callback as (data: unknown) => void)
    }
  }

  /**
   * 移除下载进度监听器
   */
  removeDownloadProgressListener(callback: (data: DownloadProgressData) => void): void {
    if (this.isAvailable()) {
      window.electronAPI.removeDownloadProgressListener(callback as (data: unknown) => void)
    }
  }

  // ==================== 壁纸设置 ====================

  /**
   * 设置壁纸
   */
  async setWallpaper(imagePath: string): Promise<IpcResponse<void>> {
    if (!this.isAvailable()) {
      return this.createUnavailableResponse<void>()
    }

    try {
      const result = await window.electronAPI.setWallpaper(imagePath)
      if (result.success) {
        return { success: true }
      }
      return {
        success: false,
        error: {
          code: 'SET_WALLPAPER_ERROR',
          message: result.error || 'Set wallpaper failed',
        },
      }
    } catch (error) {
      return {
        success: false,
        error: { code: 'SET_WALLPAPER_ERROR', message: String(error) },
      }
    }
  }

  // ==================== 设置管理 ====================

  /**
   * 保存设置
   */
  async saveSettings(settings: Record<string, unknown>): Promise<IpcResponse<void>> {
    if (!this.isAvailable()) {
      return this.createUnavailableResponse<void>()
    }

    try {
      const result = await window.electronAPI.saveSettings(settings)
      if (result.success) {
        return { success: true }
      }
      return {
        success: false,
        error: {
          code: 'SAVE_SETTINGS_ERROR',
          message: result.error || 'Save settings failed',
        },
      }
    } catch (error) {
      return {
        success: false,
        error: { code: 'SAVE_SETTINGS_ERROR', message: String(error) },
      }
    }
  }

  /**
   * 加载设置
   */
  async loadSettings(): Promise<IpcResponse<Record<string, unknown> | null>> {
    if (!this.isAvailable()) {
      return this.createUnavailableResponse<Record<string, unknown> | null>()
    }

    try {
      const result = await window.electronAPI.loadSettings()
      if (result.success) {
        return { success: true, data: result.settings }
      }
      return {
        success: false,
        data: null,
        error: {
          code: 'LOAD_SETTINGS_ERROR',
          message: result.error || 'Load settings failed',
        },
      }
    } catch (error) {
      return {
        success: false,
        data: null,
        error: { code: 'LOAD_SETTINGS_ERROR', message: String(error) },
      }
    }
  }

  // ==================== API 代理 ====================

  /**
   * Wallhaven API 代理请求
   */
  async wallhavenApiRequest<T = unknown>(params: {
    endpoint: string
    params?: Record<string, unknown>
    apiKey?: string
  }): Promise<IpcResponse<T>> {
    if (!this.isAvailable()) {
      return this.createUnavailableResponse<T>()
    }

    try {
      const result = await window.electronAPI.wallhavenApiRequest(params)
      if (result.success && result.data !== null) {
        return { success: true, data: result.data as T }
      }
      return {
        success: false,
        error: { code: 'API_ERROR', message: result.error || 'API request failed' },
      }
    } catch (error) {
      return {
        success: false,
        error: { code: 'API_ERROR', message: String(error) },
      }
    }
  }

  // ==================== 窗口控制 ====================

  /**
   * 最小化窗口
   */
  async minimizeWindow(): Promise<IpcResponse<void>> {
    if (!this.isAvailable()) {
      return this.createUnavailableResponse<void>()
    }

    try {
      await window.electronAPI.minimizeWindow()
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: { code: 'WINDOW_CONTROL_ERROR', message: String(error) },
      }
    }
  }

  /**
   * 最大化窗口
   */
  async maximizeWindow(): Promise<IpcResponse<void>> {
    if (!this.isAvailable()) {
      return this.createUnavailableResponse<void>()
    }

    try {
      await window.electronAPI.maximizeWindow()
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: { code: 'WINDOW_CONTROL_ERROR', message: String(error) },
      }
    }
  }

  /**
   * 关闭窗口
   */
  async closeWindow(): Promise<IpcResponse<void>> {
    if (!this.isAvailable()) {
      return this.createUnavailableResponse<void>()
    }

    try {
      await window.electronAPI.closeWindow()
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: { code: 'WINDOW_CONTROL_ERROR', message: String(error) },
      }
    }
  }

  /**
   * 检查窗口是否最大化
   */
  async isMaximized(): Promise<IpcResponse<boolean>> {
    if (!this.isAvailable()) {
      return this.createUnavailableResponse<boolean>()
    }

    try {
      const maximized = await window.electronAPI.isMaximized()
      return { success: true, data: maximized }
    } catch (error) {
      return {
        success: false,
        data: false,
        error: { code: 'WINDOW_CONTROL_ERROR', message: String(error) },
      }
    }
  }

  // ==================== 缓存管理 ====================

  /**
   * 清理应用缓存
   */
  async clearAppCache(downloadPath?: string): Promise<
    IpcResponse<{
      thumbnailsDeleted: number
      tempFilesDeleted: number
    }>
  > {
    if (!this.isAvailable()) {
      return this.createUnavailableResponse<{
        thumbnailsDeleted: number
        tempFilesDeleted: number
      }>()
    }

    try {
      const result = await window.electronAPI.clearAppCache(downloadPath)
      if (result.success) {
        return {
          success: true,
          data: {
            thumbnailsDeleted: result.thumbnailsDeleted,
            tempFilesDeleted: result.tempFilesDeleted,
          },
        }
      }
      return {
        success: false,
        error: { code: 'CACHE_ERROR', message: result.error || 'Clear cache failed' },
      }
    } catch (error) {
      return {
        success: false,
        error: { code: 'CACHE_ERROR', message: String(error) },
      }
    }
  }

  /**
   * 获取缓存信息
   */
  async getCacheInfo(downloadPath?: string): Promise<IpcResponse<CacheInfo>> {
    if (!this.isAvailable()) {
      return this.createUnavailableResponse<CacheInfo>()
    }

    try {
      const result = await window.electronAPI.getCacheInfo(downloadPath)
      if (result.success) {
        return { success: true, data: result.info }
      }
      return {
        success: false,
        error: { code: 'CACHE_ERROR', message: result.error || 'Get cache info failed' },
      }
    } catch (error) {
      return {
        success: false,
        error: { code: 'CACHE_ERROR', message: String(error) },
      }
    }
  }
}

export const electronClient = new ElectronClientImpl()
