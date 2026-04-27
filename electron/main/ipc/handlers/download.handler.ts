/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * Download Management IPC Handlers
 * Handles wallpaper downloads with progress tracking and pause/cancel support
 */

import { ipcMain, BrowserWindow } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import axios from 'axios'
import { streamPipeline, logHandler } from './base'
import {
  IPC_CHANNELS,
  type ResumeDownloadParams,
  type PendingDownload,
  isResumeDownloadParams,
  isPendingDownload,
} from '../../../../src/shared/types/ipc'

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
  totalSize: number
  downloadedSize: number
  lastPersistTime: number
  lastPersistOffset: number
}

// Store active downloads with their AbortControllers
const activeDownloads = new Map<string, ActiveDownload>()

/**
 * Get state file path from temp file path
 */
function getStateFilePath(tempPath: string): string {
  return tempPath + '.json'
}

/**
 * State file read result type
 */
type StateFileResult =
  | { success: true; data: PendingDownload }
  | { success: false; error: 'NOT_FOUND' | 'PARSE_ERROR' | 'VALIDATION_ERROR' }

/**
 * Error codes with Chinese messages for resume failures
 */
const RESUME_ERRORS = {
  FILE_NOT_FOUND: {
    code: 'RESUME_FILE_NOT_FOUND',
    message: '临时文件不存在，无法恢复下载',
  },
  INVALID_OFFSET: {
    code: 'RESUME_INVALID_OFFSET',
    message: '临时文件已损坏，已自动清理',
  },
  STATE_CORRUPTED: {
    code: 'RESUME_STATE_CORRUPTED',
    message: '下载记录已损坏，无法恢复',
  },
  FAILED: {
    code: 'RESUME_FAILED',
    message: '恢复下载失败',
  },
} as const

/**
 * Write state file atomically (write to temp, then rename)
 */
function writeStateFile(statePath: string, state: PendingDownload): void {
  const tempStatePath = statePath + '.tmp'
  fs.writeFileSync(tempStatePath, JSON.stringify(state, null, 2), 'utf-8')
  fs.renameSync(tempStatePath, statePath)
}

/**
 * Read and parse state file with detailed error info
 */
function readStateFile(statePath: string): StateFileResult {
  try {
    if (!fs.existsSync(statePath)) {
      return { success: false, error: 'NOT_FOUND' }
    }

    const content = fs.readFileSync(statePath, 'utf-8')
    const state = JSON.parse(content)

    if (!isPendingDownload(state)) {
      return { success: false, error: 'VALIDATION_ERROR' }
    }

    return { success: true, data: state }
  } catch {
    return { success: false, error: 'PARSE_ERROR' }
  }
}

/**
 * Check if state should be persisted based on throttling rules
 * Persists every 5 seconds OR every 10MB, whichever comes first
 */
function shouldPersistState(
  lastPersistTime: number,
  lastPersistOffset: number,
  currentOffset: number,
): boolean {
  const now = Date.now()
  const timeElapsed = now - lastPersistTime
  const bytesDownloaded = currentOffset - lastPersistOffset
  const MIN_INTERVAL = 5000 // 5 seconds
  const MIN_BYTES = 10 * 1024 * 1024 // 10MB

  return timeElapsed >= MIN_INTERVAL || bytesDownloaded >= MIN_BYTES
}

/**
 * Clean up download task
 * @param taskId - Task ID
 * @param preserveTempFile - If true (pause), keep temp and state files
 *                           If false (cancel), delete both
 */
function cleanupDownload(taskId: string, preserveTempFile: boolean = false): void {
  const download = activeDownloads.get(taskId)
  if (!download) return

  if (!preserveTempFile) {
    // Cancel: delete temp file
    if (fs.existsSync(download.tempPath)) {
      try {
        fs.unlinkSync(download.tempPath)
      } catch {
        // Ignore cleanup errors
      }
    }
    // Also delete state file
    const statePath = getStateFilePath(download.tempPath)
    if (fs.existsSync(statePath)) {
      try {
        fs.unlinkSync(statePath)
      } catch {
        // Ignore cleanup errors
      }
    }
  }
  // Pause: preserve temp file, state file should already be written

  activeDownloads.delete(taskId)
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
          totalSize: 0, // Will be updated after response
          downloadedSize: 0,
          lastPersistTime: Date.now(),
          lastPersistOffset: 0,
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

        // Update totalSize in activeDownloads
        const downloadTracker = activeDownloads.get(taskId)
        if (downloadTracker) {
          downloadTracker.totalSize = totalSize
        }

        let downloadedSize = 0
        let lastTime = Date.now()
        let lastSize = 0

        const writer = fs.createWriteStream(tempPath)

        response.data.on('data', (chunk: Buffer) => {
          downloadedSize += chunk.length

          // Update ActiveDownload tracking
          const activeDownload = activeDownloads.get(taskId)
          if (activeDownload) {
            activeDownload.downloadedSize = downloadedSize
          }

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

            // Check if we should persist state (throttled)
            const download = activeDownloads.get(taskId)
            if (
              download &&
              shouldPersistState(
                download.lastPersistTime,
                download.lastPersistOffset,
                downloadedSize,
              )
            ) {
              const statePath = getStateFilePath(tempPath)
              const state: PendingDownload = {
                taskId,
                url,
                filename,
                saveDir,
                offset: downloadedSize,
                totalSize,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              }
              writeStateFile(statePath, state)
              download.lastPersistTime = Date.now()
              download.lastPersistOffset = downloadedSize
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

        // Delete state file on completion
        const statePath = getStateFilePath(tempPath)
        if (fs.existsSync(statePath)) {
          try {
            fs.unlinkSync(statePath)
          } catch {
            // Ignore cleanup errors
          }
        }

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

      // Get current downloaded size
      let currentSize = download.downloadedSize || 0
      if (fs.existsSync(download.tempPath)) {
        try {
          currentSize = fs.statSync(download.tempPath).size
        } catch {
          // Use tracked value if file read fails
          currentSize = download.downloadedSize || 0
        }
      }

      // Write state file before cleanup
      const statePath = getStateFilePath(download.tempPath)
      const state: PendingDownload = {
        taskId,
        url: '', // URL not stored in ActiveDownload, will be enriched by renderer
        filename: download.filename,
        saveDir: download.saveDir,
        offset: currentSize,
        totalSize: download.totalSize,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      writeStateFile(statePath, state)

      // Notify renderer of paused state
      const windows = BrowserWindow.getAllWindows()
      if (windows.length > 0) {
        windows[0].webContents.send('download-progress', {
          taskId,
          state: 'paused',
          offset: currentSize,
          totalSize: download.totalSize,
        })
      }

      // Cleanup but preserve temp file
      cleanupDownload(taskId, true)

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
   * 恢复下载任务
   */
  ipcMain.handle(
    IPC_CHANNELS.RESUME_DOWNLOAD_TASK,
    async (_event, params: ResumeDownloadParams) => {
      // 1. Validate parameters
      if (!isResumeDownloadParams(params)) {
        return {
          success: false,
          error: {
            code: 'INVALID_PARAMS',
            message: 'Invalid resume parameters',
          },
        }
      }

      const { taskId, url, filename, saveDir, offset } = params
      const tempPath = path.join(saveDir, filename + '.download')
      const statePath = getStateFilePath(tempPath)

      // 2. Check temp file exists
      if (!fs.existsSync(tempPath)) {
        return {
          success: false,
          error: RESUME_ERRORS.FILE_NOT_FOUND,
        }
      }

      // 3. Validate temp file size >= offset
      const actualSize = fs.statSync(tempPath).size
      if (actualSize < offset) {
        // D-08: Validation failed, delete and restart
        try {
          fs.unlinkSync(tempPath)
          if (fs.existsSync(statePath)) {
            fs.unlinkSync(statePath)
          }
        } catch {
          // Ignore cleanup errors
        }
        return {
          success: false,
          error: RESUME_ERRORS.INVALID_OFFSET,
        }
      }

      // 4. Create AbortController
      const abortController = new AbortController()

      // 5. Store active download
      activeDownloads.set(taskId, {
        abortController,
        tempPath,
        saveDir,
        filename,
        totalSize: 0, // Will be updated from response
        downloadedSize: offset,
        lastPersistTime: Date.now(),
        lastPersistOffset: offset,
      })

      try {
        // 6. Send Range request
        const headers: Record<string, string> = {}
        if (offset > 0) {
          headers['Range'] = `bytes=${offset}-`
        }

        const response = await axios({
          method: 'GET',
          url,
          headers,
          responseType: 'stream',
          timeout: 60000,
          signal: abortController.signal,
        })

        // 7. Handle server response status
        let writer: fs.WriteStream
        let effectiveOffset = offset
        let effectiveTotalSize: number
        const download = activeDownloads.get(taskId)!

        if (response.status === 206) {
          // Server supports Range - append mode
          writer = fs.createWriteStream(tempPath, { flags: 'a' })
          const contentLength = parseInt(String(response.headers['content-length'] || '0'), 10)
          effectiveTotalSize = offset + contentLength
          download.totalSize = effectiveTotalSize
        } else if (response.status === 200) {
          // D-02: Server doesn't support Range - restart from 0
          fs.unlinkSync(tempPath)
          writer = fs.createWriteStream(tempPath, { flags: 'w' })
          effectiveOffset = 0
          effectiveTotalSize = parseInt(String(response.headers['content-length'] || '0'), 10)
          download.totalSize = effectiveTotalSize
          download.downloadedSize = 0
          download.lastPersistOffset = 0

          // Notify renderer about restart with flag
          const windows = BrowserWindow.getAllWindows()
          if (windows.length > 0) {
            windows[0].webContents.send('download-progress', {
              taskId,
              state: 'downloading',
              offset: 0,
              progress: 0,
              totalSize: effectiveTotalSize,
              resumeNotSupported: true,
            })
          }

          logHandler(
            'resume-download-task',
            `Server doesn't support Range, restarting from 0: ${taskId}`,
            'info',
          )
        } else {
          throw new Error(`Unexpected status code: ${response.status}`)
        }

        // 8. Stream download with progress
        let downloadedSize = effectiveOffset
        let lastTime = Date.now()
        let lastSize = effectiveOffset

        response.data.on('data', (chunk: Buffer) => {
          downloadedSize += chunk.length
          download.downloadedSize = downloadedSize

          // Every 100ms update progress
          const now = Date.now()
          if (now - lastTime >= 100) {
            const speed = (downloadedSize - lastSize) / ((now - lastTime) / 1000)
            const progress =
              effectiveTotalSize > 0 ? (downloadedSize / effectiveTotalSize) * 100 : 0

            const windows = BrowserWindow.getAllWindows()
            if (windows.length > 0) {
              windows[0].webContents.send('download-progress', {
                taskId,
                progress: Math.min(progress, 99),
                offset: downloadedSize,
                speed,
                state: 'downloading',
                totalSize: effectiveTotalSize,
              })
            }

            // Check throttled state persistence
            if (
              shouldPersistState(
                download.lastPersistTime,
                download.lastPersistOffset,
                downloadedSize,
              )
            ) {
              const state: PendingDownload = {
                taskId,
                url,
                filename,
                saveDir,
                offset: downloadedSize,
                totalSize: effectiveTotalSize,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              }
              writeStateFile(statePath, state)
              download.lastPersistTime = Date.now()
              download.lastPersistOffset = downloadedSize
            }

            lastTime = now
            lastSize = downloadedSize
          }
        })

        // 9. Use pipeline for proper stream handling
        await streamPipeline(response.data, writer)

        // 10. Check for abort
        if (abortController.signal.aborted) {
          return { success: false, error: 'Download paused or cancelled' }
        }

        // 11. Complete: rename temp file, delete state file
        const filePath = path.join(saveDir, filename)
        fs.renameSync(tempPath, filePath)
        if (fs.existsSync(statePath)) {
          try {
            fs.unlinkSync(statePath)
          } catch {
            // Ignore cleanup errors
          }
        }

        const finalSize = fs.statSync(filePath).size
        activeDownloads.delete(taskId)

        // 12. Notify completion
        const windows = BrowserWindow.getAllWindows()
        if (windows.length > 0) {
          windows[0].webContents.send('download-progress', {
            taskId,
            progress: 100,
            offset: finalSize,
            speed: 0,
            state: 'completed',
            filePath,
          })
        }

        return { success: true, filePath, size: finalSize }
      } catch (error: any) {
        // Check if user-initiated cancel
        if (error.name === 'CanceledError' || error.code === 'ERR_CANCELED') {
          logHandler('resume-download-task', `Download cancelled: ${taskId}`, 'info')
          return { success: false, error: 'Download cancelled', cancelled: true }
        }

        logHandler('resume-download-task', `Error: ${error.message}`, 'error')

        // Keep temp file for retry on network errors
        activeDownloads.delete(taskId)

        // Notify renderer of failure
        const windows = BrowserWindow.getAllWindows()
        if (windows.length > 0) {
          windows[0].webContents.send('download-progress', {
            taskId,
            progress: 0,
            offset: 0,
            speed: 0,
            state: 'failed',
            error: error.message || 'Resume failed',
          })
        }

        return {
          success: false,
          error: { code: 'RESUME_FAILED', message: error.message || 'Resume failed' },
        }
      }
    },
  )

  /**
   * 获取待恢复的下载任务列表
   */
  ipcMain.handle(IPC_CHANNELS.GET_PENDING_DOWNLOADS, async () => {
    try {
      // 1. Get download directory from settings
      const { store } = await import('../../index')
      const downloadPath = store?.get('appSettings.downloadPath') as string | undefined

      if (!downloadPath || !fs.existsSync(downloadPath)) {
        return { success: true, data: [] as PendingDownload[] }
      }

      // 2. Scan for .download.json files
      let files: string[]
      try {
        files = fs.readdirSync(downloadPath)
      } catch {
        return { success: true, data: [] as PendingDownload[] }
      }

      const stateFiles = files.filter((f) => f.endsWith('.download.json'))
      const pendingDownloads: PendingDownload[] = []

      for (const stateFile of stateFiles) {
        const statePath = path.join(downloadPath, stateFile)
        const tempPath = statePath.replace('.json', '') // Remove .json to get .download path

        try {
          // 3. Parse JSON and validate
          const result = readStateFile(statePath)
          if (!result.success) {
            // Log specific error
            if (result.error === 'PARSE_ERROR') {
              logHandler('get-pending-downloads', `Corrupted state file: ${stateFile}`, 'warn')
            }
            // Delete invalid state file
            try {
              fs.unlinkSync(statePath)
            } catch {
              // Ignore cleanup errors
            }
            continue
          }

          // 4. Check corresponding .download file exists
          if (!fs.existsSync(tempPath)) {
            // Temp file missing, delete state file
            try {
              fs.unlinkSync(statePath)
            } catch {
              // Ignore cleanup errors
            }
            continue
          }

          // 5. Update offset from actual temp file size
          const actualSize = fs.statSync(tempPath).size
          result.data.offset = actualSize
          result.data.updatedAt = new Date().toISOString()

          pendingDownloads.push(result.data)
        } catch (parseError) {
          // Corrupted state file, delete it
          try {
            fs.unlinkSync(statePath)
          } catch {
            // Ignore cleanup errors
          }
        }
      }

      return { success: true, data: pendingDownloads }
    } catch (error: any) {
      logHandler('get-pending-downloads', `Error: ${error.message}`, 'error')
      return {
        success: false,
        error: { code: 'SCAN_ERROR', message: error.message },
      }
    }
  })
}
