/**
 * Download Management IPC Handlers
 * Handles wallpaper downloads with progress tracking and pause/cancel support
 */

import { ipcMain, BrowserWindow } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import axios from 'axios'
import { streamPipeline, logHandler } from './base'
import { IPC_CHANNELS, type ResumeDownloadParams, type PendingDownload } from '../../../../src/shared/types/ipc'

// /**
//  * IPC Channel names (duplicated from shared/types/ipc.ts to avoid cross-directory imports)
//  */
// const IPC_CHANNELS = {
//   START_DOWNLOAD_TASK: 'start-download-task',
//   PAUSE_DOWNLOAD_TASK: 'pause-download-task',
//   CANCEL_DOWNLOAD_TASK: 'cancel-download-task',
//   DOWNLOAD_PROGRESS: 'download-progress',
// } as const

/**
 * Active download task info
 */
interface ActiveDownload {
  abortController: AbortController
  tempPath: string
  saveDir: string
  filename: string
}

// Store active downloads with their AbortControllers
const activeDownloads = new Map<string, ActiveDownload>()

/**
 * Clean up a download task
 */
function cleanupDownload(taskId: string): void {
  const download = activeDownloads.get(taskId)
  if (download) {
    // Delete temp file if exists
    if (fs.existsSync(download.tempPath)) {
      try {
        fs.unlinkSync(download.tempPath)
      } catch {
        // Ignore cleanup errors
      }
    }
    activeDownloads.delete(taskId)
  }
}

export function registerDownloadHandlers(): void {
  /**
   * 下载壁纸
   */
  ipcMain.handle(
    'download-wallpaper',
    async (
      _event,
      {
        url,
        filename,
        saveDir,
      }: {
        url: string
        filename: string
        saveDir: string
      },
    ) => {
      try {
        // 确保目录存在
        if (!fs.existsSync(saveDir)) {
          fs.mkdirSync(saveDir, { recursive: true })
        }

        const filePath = path.join(saveDir, filename)

        // 如果文件已存在，添加序号
        let finalPath = filePath
        let counter = 1
        while (fs.existsSync(finalPath)) {
          const ext = path.extname(filename)
          const nameWithoutExt = filename.replace(ext, '')
          finalPath = path.join(saveDir, `${nameWithoutExt}_${counter}${ext}`)
          counter++
        }

        // 下载文件
        const response = await axios({
          method: 'GET',
          url: url,
          responseType: 'stream',
          timeout: 60000, // 60秒超时
        })

        await streamPipeline(response.data, fs.createWriteStream(finalPath))

        return {
          success: true,
          filePath: finalPath,
          error: null,
        }
      } catch (error: any) {
        logHandler('download-wallpaper', `Error: ${error.message}`, 'error')
        return {
          success: false,
          filePath: null,
          error: error.message,
        }
      }
    },
  )

  /**
   * 开始下载任务（带进度回调）
   */
  ipcMain.handle(
    IPC_CHANNELS.START_DOWNLOAD_TASK,
    async (
      _event,
      {
        taskId,
        url,
        filename,
        saveDir,
      }: {
        taskId: string
        url: string
        filename: string
        saveDir: string
      },
    ) => {
      try {
        // 确保目录存在
        if (!fs.existsSync(saveDir)) {
          fs.mkdirSync(saveDir, { recursive: true })
        }

        const filePath = path.join(saveDir, filename)

        // 如果文件已存在，直接完成
        if (fs.existsSync(filePath)) {
          // 通知渲染进程任务完成
          const windows = BrowserWindow.getAllWindows()
          if (windows.length > 0) {
            windows[0].webContents.send('download-progress', {
              taskId,
              progress: 100,
              offset: fs.statSync(filePath).size,
              speed: 0,
              state: 'completed',
              filePath,
            })
          }

          return {
            success: true,
            filePath,
            message: '文件已存在',
          }
        }

        // 创建临时文件
        const tempPath = filePath + '.download'

        // 创建 AbortController 用于暂停/取消
        const abortController = new AbortController()

        // 存储活跃下载
        activeDownloads.set(taskId, {
          abortController,
          tempPath,
          saveDir,
          filename,
        })

        // 下载文件并跟踪进度
        const response = await axios({
          method: 'GET',
          url,
          responseType: 'stream',
          timeout: 60000,
          signal: abortController.signal,
        })

        const totalSize = parseInt(String(response.headers['content-length'] || '0'), 10)

        let downloadedSize = 0
        let lastTime = Date.now()
        let lastSize = 0

        const writer = fs.createWriteStream(tempPath)

        response.data.on('data', (chunk: Buffer) => {
          downloadedSize += chunk.length

          // 每100ms更新一次进度
          const now = Date.now()
          if (now - lastTime >= 100) {
            const speed = (downloadedSize - lastSize) / ((now - lastTime) / 1000)
            const progress = totalSize > 0 ? (downloadedSize / totalSize) * 100 : 0

            // 发送进度到渲染进程
            const windows = BrowserWindow.getAllWindows()
            if (windows.length > 0) {
              const progressData = {
                taskId,
                progress: Math.min(progress, 99), // 最多99%，完成时设为100%
                offset: downloadedSize,
                speed,
                state: 'downloading',
                totalSize,
              }
              windows[0].webContents.send('download-progress', progressData)
            }

            lastTime = now
            lastSize = downloadedSize
          }
        })

        // 使用pipeline确保流正确关闭
        await streamPipeline(response.data, writer)

        // 检查是否被中断
        if (abortController.signal.aborted) {
          // 被暂停或取消，不完成下载
          return {
            success: false,
            error: 'Download paused or cancelled',
          }
        }

        // 重命名临时文件为正式文件
        fs.renameSync(tempPath, filePath)

        const finalSize = fs.statSync(filePath).size

        // 清理活跃下载记录
        activeDownloads.delete(taskId)

        // 通知渲染进程任务完成
        const windows = BrowserWindow.getAllWindows()
        if (windows.length > 0) {
          const completeData = {
            taskId,
            progress: 100,
            offset: finalSize,
            speed: 0,
            state: 'completed',
            filePath,
          }
          windows[0].webContents.send('download-progress', completeData)
        }

        return {
          success: true,
          filePath,
          size: finalSize,
        }
      } catch (error: any) {
        // 检查是否是用户主动取消
        if (error.name === 'CanceledError' || error.code === 'ERR_CANCELED') {
          logHandler('start-download-task', `Download cancelled: ${taskId}`, 'info')
          return {
            success: false,
            error: 'Download cancelled',
            cancelled: true,
          }
        }

        logHandler('start-download-task', `Error: ${error.message}`, 'error')

        // 清理临时文件
        cleanupDownload(taskId)

        // 通知渲染进程下载失败
        const windows = BrowserWindow.getAllWindows()
        if (windows.length > 0) {
          windows[0].webContents.send('download-progress', {
            taskId,
            progress: 0,
            offset: 0,
            speed: 0,
            state: 'failed',
            error: error.message || '下载失败',
          })
        }

        return {
          success: false,
          error: error.message || '下载失败',
        }
      }
    },
  )

  /**
   * 暂停下载任务
   */
  ipcMain.handle(IPC_CHANNELS.PAUSE_DOWNLOAD_TASK, async (_event, taskId: string) => {
    const download = activeDownloads.get(taskId)
    if (!download) {
      return {
        success: false,
        error: 'Download task not found or already completed',
      }
    }

    try {
      // 中止下载
      download.abortController.abort()

      // 通知渲染进程任务已暂停
      const windows = BrowserWindow.getAllWindows()
      if (windows.length > 0) {
        // 获取当前下载大小
        let currentSize = 0
        if (fs.existsSync(download.tempPath)) {
          try {
            currentSize = fs.statSync(download.tempPath).size
          } catch {
            // 忽略读取错误
          }
        }

        windows[0].webContents.send('download-progress', {
          taskId,
          state: 'paused',
          offset: currentSize,
        })
      }

      return {
        success: true,
      }
    } catch (error: any) {
      logHandler('pause-download-task', `Error: ${error.message}`, 'error')
      return {
        success: false,
        error: error.message,
      }
    }
  })

  /**
   * 取消下载任务
   */
  ipcMain.handle(IPC_CHANNELS.CANCEL_DOWNLOAD_TASK, async (_event, taskId: string) => {
    const download = activeDownloads.get(taskId)
    if (!download) {
      return {
        success: false,
        error: 'Download task not found or already completed',
      }
    }

    try {
      // 中止下载
      download.abortController.abort()

      // 清理临时文件和记录
      cleanupDownload(taskId)

      // 通知渲染进程任务已取消
      const windows = BrowserWindow.getAllWindows()
      if (windows.length > 0) {
        windows[0].webContents.send('download-progress', {
          taskId,
          state: 'waiting',
          progress: 0,
          offset: 0,
          speed: 0,
        })
      }

      return {
        success: true,
      }
    } catch (error: any) {
      logHandler('cancel-download-task', `Error: ${error.message}`, 'error')
      return {
        success: false,
        error: error.message,
      }
    }
  })

  /**
   * 恢复下载任务（占位实现）
   * Phase 7 将实现完整逻辑
   */
  ipcMain.handle(
    IPC_CHANNELS.RESUME_DOWNLOAD_TASK,
    async (_event, params: ResumeDownloadParams) => {
      logHandler('resume-download-task', `Placeholder called for task: ${params.taskId}`)
      return {
        success: false,
        error: {
          code: 'NOT_IMPLEMENTED',
          message: 'Resume download - Phase 7',
        },
      }
    },
  )

  /**
   * 获取待恢复的下载任务列表（占位实现）
   * Phase 7 将实现完整逻辑
   */
  ipcMain.handle(IPC_CHANNELS.GET_PENDING_DOWNLOADS, async () => {
    logHandler('get-pending-downloads', 'Placeholder called')
    return {
      success: true,
      data: [] as PendingDownload[],
    }
  })
}
