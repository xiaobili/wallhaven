/**
 * 下载管理客户端
 * 封装壁纸下载、任务管理、进度监听
 */

import type {
  IpcResponse,
  DownloadProgressData,
  ResumeDownloadParams,
  PendingDownload,
} from '@/types/ipc'
import { BaseClient } from './base.client'

/**
 * 下载客户端实现类
 */
class DownloadClientImpl extends BaseClient {
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
  async startTask(params: {
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
      if (result.success && result.taskId) {
        return { success: true, data: result.taskId }
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
   * 暂停下载任务
   */
  async pauseTask(taskId: string): Promise<IpcResponse<void>> {
    if (!this.isAvailable()) {
      return this.createUnavailableResponse<void>()
    }

    try {
      const result = await window.electronAPI.pauseDownloadTask(taskId)
      if (result.success) {
        return { success: true }
      }
      return {
        success: false,
        error: { code: 'DOWNLOAD_PAUSE_ERROR', message: result.error || 'Pause download failed' },
      }
    } catch (error) {
      return {
        success: false,
        error: { code: 'DOWNLOAD_PAUSE_ERROR', message: String(error) },
      }
    }
  }

  /**
   * 取消下载任务
   */
  async cancelTask(taskId: string): Promise<IpcResponse<void>> {
    if (!this.isAvailable()) {
      return this.createUnavailableResponse<void>()
    }

    try {
      const result = await window.electronAPI.cancelDownloadTask(taskId)
      if (result.success) {
        return { success: true }
      }
      return {
        success: false,
        error: { code: 'DOWNLOAD_CANCEL_ERROR', message: result.error || 'Cancel download failed' },
      }
    } catch (error) {
      return {
        success: false,
        error: { code: 'DOWNLOAD_CANCEL_ERROR', message: String(error) },
      }
    }
  }

  /**
   * 恢复下载任务
   */
  async resumeTask(params: ResumeDownloadParams): Promise<IpcResponse<string>> {
    if (!this.isAvailable()) {
      return this.createUnavailableResponse<string>()
    }

    try {
      const result = await window.electronAPI.resumeDownloadTask(params)
      if (result.success && result.data) {
        return { success: true, data: result.data }
      }
      return {
        success: false,
        error: {
          code: result.error?.code || 'DOWNLOAD_RESUME_ERROR',
          message: result.error?.message || 'Resume download failed',
        },
      }
    } catch (error) {
      return {
        success: false,
        error: { code: 'DOWNLOAD_RESUME_ERROR', message: String(error) },
      }
    }
  }

  /**
   * 获取待恢复的下载任务列表
   */
  async getPendingDownloads(): Promise<IpcResponse<PendingDownload[]>> {
    if (!this.isAvailable()) {
      return this.createUnavailableResponse<PendingDownload[]>()
    }

    try {
      const result = await window.electronAPI.getPendingDownloads()
      if (result.success) {
        return { success: true, data: result.data || [] }
      }
      return {
        success: false,
        data: [],
        error: {
          code: result.error?.code || 'GET_PENDING_DOWNLOADS_ERROR',
          message: result.error?.message || 'Get pending downloads failed',
        },
      }
    } catch (error) {
      return {
        success: false,
        data: [],
        error: { code: 'GET_PENDING_DOWNLOADS_ERROR', message: String(error) },
      }
    }
  }

  /**
   * 监听下载进度
   */
  onProgress(callback: (data: DownloadProgressData) => void): void {
    if (this.isAvailable()) {
      window.electronAPI.onDownloadProgress(callback as (data: unknown) => void)
    }
  }

  /**
   * 移除下载进度监听器
   */
  removeProgressListener(callback: (data: DownloadProgressData) => void): void {
    if (this.isAvailable()) {
      window.electronAPI.removeDownloadProgressListener(callback as (data: unknown) => void)
    }
  }
}

/** 下载客户端单例 */
export const downloadClient = new DownloadClientImpl()
