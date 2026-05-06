/**
 * 下载服务
 * 封装下载业务逻辑，包括进度订阅、下载目录管理、已完成记录管理
 * ARCH-01: 通过 Repository 层访问 IPC，不再直接使用 Client
 */

import type {
  IpcResponse,
  PendingDownload,
  DownloadProgressData,
} from '@/types/ipc'
import type { FinishedDownloadItem } from '@/types'
import { settingsRepository, downloadRepository, downloadTaskRepository } from '@/repositories'

/**
 * 进度回调函数类型
 */
export type ProgressCallback = (data: DownloadProgressData) => void

/**
 * 下载服务实现类
 * ARCH-01: 无状态服务，通过 Repository 访问 IPC
 */
class DownloadServiceImpl {
  private progressCallbacks = new Set<ProgressCallback>()
  private isListenerRegistered = false

  constructor() {
    // 检查环境是否可用后再注册监听
    if (typeof window !== 'undefined' && window.electronAPI) {
      this.registerProgressListener()
    }
  }

  /**
   * 注册 Electron 进度监听
   * ARCH-01: 通过 Repository 注册监听
   */
  private registerProgressListener(): void {
    if (this.isListenerRegistered) {
      return
    }

    downloadTaskRepository.onDownloadProgress((data) => {
      // 遍历所有回调，使用 try-catch 保护每个回调
      this.progressCallbacks.forEach((callback) => {
        try {
          callback(data)
        } catch (error) {
          console.error('[DownloadService] Progress callback error:', error)
        }
      })
    })

    this.isListenerRegistered = true
  }

  /**
   * 订阅下载进度
   * @param callback - 进度回调函数
   * @returns 取消订阅函数
   */
  onProgress(callback: ProgressCallback): () => void {
    this.progressCallbacks.add(callback)

    // 返回取消订阅函数
    return () => {
      this.progressCallbacks.delete(callback)
    }
  }

  /**
   * 获取下载路径
   * 如果未设置则提示用户选择目录
   */
  async getDownloadPath(): Promise<IpcResponse<string>> {
    // 获取设置中的下载路径
    const settingsResult = await settingsRepository.get()

    if (settingsResult.success && settingsResult.data?.downloadPath) {
      return { success: true, data: settingsResult.data.downloadPath }
    }

    // 未设置下载路径，提示用户选择
    const selectResult = await downloadTaskRepository.selectFolder()

    if (!selectResult.success || !selectResult.data) {
      return {
        success: false,
        error: selectResult.error || {
          code: 'SELECT_FOLDER_CANCELLED',
          message: 'User cancelled folder selection',
        },
      }
    }

    // 保存用户选择的路径到设置
    const saveResult = await settingsRepository.set({
      downloadPath: selectResult.data,
      maxConcurrentDownloads: 3,
      apiKey: '',
      wallpaperFit: 'fill',
    })

    if (!saveResult.success) {
      return {
        success: false,
        error: saveResult.error,
      }
    }

    return { success: true, data: selectResult.data }
  }

  /**
   * 简单下载（不经过下载队列）
   * 路径解析 -> 重复检测 -> 下载执行
   * @param url - 下载 URL
   * @param filename - 保存文件名
   * @returns 下载结果，包含文件路径
   */
  async simpleDownload(url: string, filename: string): Promise<IpcResponse<string>> {
    const pathResult = await this.getDownloadPath()
    if (!pathResult.success || !pathResult.data) {
      return {
        success: false,
        error: pathResult.error || {
          code: 'DOWNLOAD_PATH_NOT_SET',
          message: 'Download path not configured',
        },
      }
    }
    const saveDir = pathResult.data

    const fullPath = `${saveDir}/${filename}`
    const existsResult = await downloadTaskRepository.fileExists(fullPath)
    if (existsResult.success && existsResult.data) {
      return { success: true, data: fullPath }
    }

    return downloadTaskRepository.downloadWallpaper({ url, filename, saveDir })
  }

  /**
   * 启动下载任务
   * @param taskId - 任务 ID
   * @param url - 下载 URL
   * @param filename - 保存文件名
   */
  async startDownload(taskId: string, url: string, filename: string): Promise<IpcResponse<string>> {
    // 获取下载目录
    const pathResult = await this.getDownloadPath()

    if (!pathResult.success || !pathResult.data) {
      return {
        success: false,
        error: pathResult.error || {
          code: 'DOWNLOAD_PATH_NOT_SET',
          message: 'Download path not configured',
        },
      }
    }

    // 启动下载任务
    return downloadTaskRepository.startDownloadTask({
      taskId,
      url,
      filename,
      saveDir: pathResult.data,
    })
  }

  /**
   * 暂停下载任务
   * @param taskId - 任务 ID
   */
  async pauseDownload(taskId: string): Promise<IpcResponse<void>> {
    return downloadTaskRepository.pauseDownloadTask(taskId)
  }

  /**
   * 取消下载任务
   * @param taskId - 任务 ID
   */
  async cancelDownload(taskId: string): Promise<IpcResponse<void>> {
    return downloadTaskRepository.cancelDownloadTask(taskId)
  }

  /**
   * 恢复下载任务（断点续传）
   * @param taskId - 任务 ID
   * @param pendingDownload - 待恢复的下载任务信息
   */
  async resumeDownload(
    taskId: string,
    pendingDownload: PendingDownload,
  ): Promise<IpcResponse<string>> {
    return downloadTaskRepository.resumeDownloadTask({
      taskId,
      url: pendingDownload.url,
      filename: pendingDownload.filename,
      saveDir: pendingDownload.saveDir,
      offset: pendingDownload.offset,
    })
  }

  /**
   * 获取待恢复的下载任务列表
   * 返回所有未完成的下载任务（暂停状态）
   */
  async getPendingDownloads(): Promise<IpcResponse<PendingDownload[]>> {
    return downloadTaskRepository.getPendingDownloads()
  }

  /**
   * 保存已完成下载记录
   * @param item - 已完成下载项
   */
  async saveFinishedRecord(item: FinishedDownloadItem): Promise<IpcResponse<void>> {
    return downloadRepository.add(item)
  }

  /**
   * 获取已完成下载记录列表
   */
  async getFinishedRecords(): Promise<IpcResponse<FinishedDownloadItem[]>> {
    return downloadRepository.get()
  }

  /**
   * 移除已完成下载记录
   * @param id - 记录 ID
   */
  async removeFinishedRecord(id: string): Promise<IpcResponse<void>> {
    return downloadRepository.remove(id)
  }

  /**
   * 清空已完成下载记录
   */
  async clearFinishedRecords(): Promise<IpcResponse<void>> {
    return downloadRepository.clear()
  }

  /**
   * 清理孤儿临时文件
   * 删除超过 7 天的临时文件和状态文件
   */
  async cleanupOrphanFiles(): Promise<
    IpcResponse<{ filesDeleted: number; stateFilesDeleted: number }>
  > {
    // 获取下载目录
    const pathResult = await this.getDownloadPath()

    if (!pathResult.success || !pathResult.data) {
      // No download path configured, nothing to clean
      return { success: true, data: { filesDeleted: 0, stateFilesDeleted: 0 } }
    }

    return downloadTaskRepository.cleanupOrphanFiles(pathResult.data)
  }
}

export const downloadService = new DownloadServiceImpl()
