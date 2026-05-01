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
import { DownloadQueue, setQueueInstance, type QueuedDownload } from './download-queue'
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
  retryCount?: number  // How many retries have been attempted (Phase 34)
}

// Store active downloads with their AbortControllers
const activeDownloads = new Map<string, ActiveDownload>()

/**
 * Retry timer references for backoff scheduling.
 * Each entry maps taskId → setTimeout handle, enabling PAUSE/CANCEL
 * to clear pending retry timers and prevent zombie downloads (Pitfall 3).
 */
const retryTimers = new Map<string, ReturnType<typeof setTimeout>>()

/** Retry backoff configuration constants */
const BACKOFF_BASE_MS = 2000   // 2 seconds — base delay for first retry
const BACKOFF_MAX_MS  = 30000  // 30 seconds — absolute ceiling
const MAX_RETRIES     = 3      // Max retry attempts before permanent failure

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

/**
 * Execute a single download from start to finish.
 * Extracted from the START_DOWNLOAD_TASK handler so both
 * the direct IPC path and the queue can use it.
 *
 * Sets up AbortController, activeDownloads entry, performs HTTP GET with axios,
 * streams response to temp file, emits progress events, handles completion/error.
 *
 * Does NOT handle IPC response format — the caller wraps return/throw.
 * Does NOT handle queue processing — processQueue() is the queue's responsibility.
 *
 * @returns The final file path and size on success
 * @throws On any error — CanceledError re-thrown for external abort without side effects;
 *         other errors trigger cleanup and failed progress event before re-throw
 */
export async function executeDownload(
  taskId: string,
  url: string,
  filename: string,
  saveDir: string,
  offset?: number,
): Promise<{ filePath: string; size: number }> {
  // Ensure directory exists
  if (!fs.existsSync(saveDir)) {
    fs.mkdirSync(saveDir, { recursive: true })
  }

  const filePath = path.join(saveDir, filename)

  // If file already exists, complete immediately
  if (fs.existsSync(filePath)) {
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
    return { filePath, size: fs.statSync(filePath).size }
  }

  // Create temp file
  const tempPath = filePath + '.download'

  // Create AbortController for pause/cancel
  const abortController = new AbortController()

  // Store active download
  activeDownloads.set(taskId, {
    abortController,
    tempPath,
    saveDir,
    filename,
    totalSize: 0, // Will be updated after response
    downloadedSize: offset ?? 0,
    lastPersistTime: Date.now(),
    lastPersistOffset: offset ?? 0,
  })

  try {
    // Build headers with optional Range for resume support
    const headers: Record<string, string> = {}
    if (offset && offset > 0) {
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

    // Determine effective offset and total size based on server response
    let effectiveOffset = offset ?? 0
    let totalSize: number

    if (offset && offset > 0) {
      if (response.status === 206) {
        // Server supports Range — append to existing partial file
        const contentLength = parseInt(String(response.headers['content-length'] || '0'), 10)
        totalSize = offset + contentLength
      } else if (response.status === 200) {
        // Server doesn't support Range — restart from 0
        if (fs.existsSync(tempPath)) {
          fs.unlinkSync(tempPath)
        }
        effectiveOffset = 0
        totalSize = parseInt(String(response.headers['content-length'] || '0'), 10)

        // Notify renderer that full restart is required
        const windows = BrowserWindow.getAllWindows()
        if (windows.length > 0) {
          windows[0].webContents.send('download-progress', {
            taskId,
            state: 'downloading',
            offset: 0,
            progress: 0,
            totalSize,
            resumeNotSupported: true,
          })
        }

        logHandler(
          'executeDownload',
          `Server doesn't support Range, restarting from 0: ${taskId}`,
          'info',
        )
      } else {
        throw new Error(`Unexpected status code: ${response.status}`)
      }
    } else {
      totalSize = parseInt(String(response.headers['content-length'] || '0'), 10)
    }

    // Update totalSize in activeDownloads
    const downloadTracker = activeDownloads.get(taskId)
    if (downloadTracker) {
      downloadTracker.totalSize = totalSize
    }

    // Sync offset tracking for resume
    if (downloadTracker && offset && offset > 0) {
      downloadTracker.lastPersistOffset = effectiveOffset
      downloadTracker.downloadedSize = effectiveOffset
    }

    let downloadedSize = effectiveOffset
    let lastTime = Date.now()
    let lastSize = effectiveOffset

    // Create write stream — append mode for 206 resume, write mode otherwise
    const writer = fs.createWriteStream(
      tempPath,
      offset && offset > 0 && response.status === 206 ? { flags: 'a' } : undefined,
    )

    response.data.on('data', (chunk: Buffer) => {
      downloadedSize += chunk.length

      // Update ActiveDownload tracking
      const activeDownload = activeDownloads.get(taskId)
      if (activeDownload) {
        activeDownload.downloadedSize = downloadedSize
      }

      // Every 100ms update progress
      const now = Date.now()
      if (now - lastTime >= 100) {
        const speed = (downloadedSize - lastSize) / ((now - lastTime) / 1000)
        const progress = totalSize > 0 ? (downloadedSize / totalSize) * 100 : 0

        // Send progress to renderer
        const windows = BrowserWindow.getAllWindows()
        if (windows.length > 0) {
          windows[0].webContents.send('download-progress', {
            taskId,
            progress: Math.min(progress, 99), // Max 99%, 100% when complete
            offset: downloadedSize,
            speed,
            state: 'downloading',
            totalSize,
          })
        }

        // Check if we should persist state (throttled at 5s or 10MB)
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

    // Use pipeline to ensure proper stream closure
    await streamPipeline(response.data, writer)

    // Check if interrupted (pause/cancel)
    if (abortController.signal.aborted) {
      // Pause/cancel handler manages cleanup and state notification
      throw new Error('Download paused or cancelled')
    }

    // Rename temp file to final file
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

    // Clean up active download record
    activeDownloads.delete(taskId)

    // Notify renderer of completion
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

    return { filePath, size: finalSize }
  } catch (error: any) {
    // If user-initiated cancel via axios CanceledError, re-throw without side effects
    if (error.name === 'CanceledError' || error.code === 'ERR_CANCELED') {
      throw error
    }

    // Non-cancel error: cleanup and notify
    logHandler('executeDownload', `Download failed: ${taskId}: ${error.message}`, 'error')
    cleanupDownload(taskId)

    // Notify renderer of failure
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

    throw error
  }
}

/** Singleton download queue instance */
const downloadQueue = new DownloadQueue(
  () => activeDownloads.size,
  async (item: QueuedDownload) => {
    try {
      await executeDownload(item.taskId, item.url, item.filename, item.saveDir, item.offset)
    } finally {
      downloadQueue.processQueue()
    }
  },
)

// Register singleton for cross-module access (DL-03 settings propagation)
setQueueInstance(downloadQueue)

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
      // 入队而非直接启动 — 队列管理并发（DL-01、DL-02）
      downloadQueue.enqueue({ taskId, url, filename, saveDir })

      // 立即返回 — 下载进度事件更新渲染进程
      return { success: true, taskId }
    },
  )

  /**
   * 暂停下载任务
   */
  ipcMain.handle(IPC_CHANNELS.PAUSE_DOWNLOAD_TASK, async (_event, taskId: string) => {
    // 如果任务在队列中等待，直接移除（无需实际暂停操作）
    if (downloadQueue.remove(taskId)) {
      return { success: true, state: 'removed_from_queue' }
    }

    // 不在队列中 — 必须是正在下载的任务
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

      // 释放槽位 — 启动下一个排队任务
      downloadQueue.processQueue()

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
    // 如果任务在队列中等待，直接移除
    if (downloadQueue.remove(taskId)) {
      return { success: true }
    }

    // 不在队列中 — 取消正在下载的任务
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

      // 释放槽位 — 启动下一个排队任务
      downloadQueue.processQueue()

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

      // 4. Enqueue resume task — queue manages concurrency gating
      downloadQueue.enqueue({ taskId, url, filename, saveDir, offset })

      return { success: true, taskId }
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
