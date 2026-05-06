/**
 * 下载任务仓储
 * 封装下载任务相关的 IPC 调用（ARCH-01）
 */

import type {
  IpcResponse,
  PendingDownload,
  ResumeDownloadParams,
  DownloadProgressData,
} from '@/types/ipc'
import { downloadClient, fileClient } from '@/clients'

/**
 * 下载任务仓储
 * ARCH-01: 封装所有下载任务相关的 IPC 调用，Service 层不再直接使用 Client
 */
export const downloadTaskRepository = {
  /**
   * 选择文件夹
   */
  async selectFolder(): Promise<IpcResponse<string | null>> {
    return fileClient.selectFolder()
  },

  /**
   * 检查文件是否存在
   */
  async fileExists(path: string): Promise<IpcResponse<boolean>> {
    return fileClient.fileExists(path)
  },

  /**
   * 下载壁纸（同步模式）
   */
  async downloadWallpaper(params: {
    url: string
    filename: string
    saveDir: string
  }): Promise<IpcResponse<string>> {
    return downloadClient.downloadWallpaper(params)
  },

  /**
   * 启动下载任务
   */
  async startDownloadTask(params: {
    taskId: string
    url: string
    filename: string
    saveDir: string
  }): Promise<IpcResponse<string>> {
    return downloadClient.startTask(params)
  },

  /**
   * 暂停下载任务
   */
  async pauseDownloadTask(taskId: string): Promise<IpcResponse<void>> {
    return downloadClient.pauseTask(taskId)
  },

  /**
   * 取消下载任务
   */
  async cancelDownloadTask(taskId: string): Promise<IpcResponse<void>> {
    return downloadClient.cancelTask(taskId)
  },

  /**
   * 恢复下载任务
   */
  async resumeDownloadTask(params: ResumeDownloadParams): Promise<IpcResponse<string>> {
    return downloadClient.resumeTask(params)
  },

  /**
   * 获取待恢复的下载任务列表
   */
  async getPendingDownloads(): Promise<IpcResponse<PendingDownload[]>> {
    return downloadClient.getPendingDownloads()
  },

  /**
   * 清理孤儿临时文件
   */
  async cleanupOrphanFiles(saveDir: string): Promise<
    IpcResponse<{ filesDeleted: number; stateFilesDeleted: number }>
  > {
    const { cacheClient } = await import('@/clients')
    return cacheClient.cleanupOrphanFiles(saveDir)
  },

  /**
   * 注册下载进度监听器
   */
  onDownloadProgress(callback: (data: DownloadProgressData) => void): void {
    downloadClient.onProgress(callback)
  },

  /**
   * 移除下载进度监听器
   */
  removeDownloadProgressListener(callback: (data: DownloadProgressData) => void): void {
    downloadClient.removeProgressListener(callback)
  },
}
