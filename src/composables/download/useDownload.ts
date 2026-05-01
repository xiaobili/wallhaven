/**
 * 下载管理 Composable
 *
 * 封装下载管理逻辑，协调 DownloadService 和 DownloadStore
 * 管理下载任务生命周期，订阅并处理进度更新
 *
 * @example
 * ```typescript
 * const {
 *   downloadingList,
 *   finishedList,
 *   addTask,
 *   startDownload,
 *   pauseDownload,
 *   isDownloading,
 * } = useDownload()
 *
 * // 添加下载任务
 * const taskId = addTask({
 *   url: 'https://example.com/wallpaper.jpg',
 *   filename: 'wallpaper.jpg',
 *   small: 'https://example.com/thumb.jpg',
 *   resolution: '1920x1080',
 *   size: 1024000,
 *   wallpaperId: 'abc123'
 * })
 *
 * // 启动下载
 * await startDownload(taskId)
 * ```
 */

import { computed, onMounted, onUnmounted, type ComputedRef } from 'vue'
import { useDownloadStore } from '@/stores/modules/download'
import { downloadService, type DownloadProgressData } from '@/services'
import { useAlert } from '@/composables'
import type { DownloadItem, FinishedDownloadItem } from '@/types'

/**
 * useDownload 返回值接口
 */
export interface UseDownloadReturn {
  // 状态（ComputedRef）
  downloadingList: ComputedRef<DownloadItem[]>
  finishedList: ComputedRef<FinishedDownloadItem[]>
  totalActive: ComputedRef<number>
  totalPaused: ComputedRef<number>
  totalFinished: ComputedRef<number>

  // 方法
  addTask: (task: Omit<DownloadItem, 'id' | 'offset' | 'progress' | 'speed' | 'state'>) => string
  startDownload: (id: string) => Promise<boolean>
  pauseDownload: (id: string) => Promise<boolean>
  resumeDownload: (id: string) => Promise<boolean>
  cancelDownload: (id: string) => Promise<boolean>
  removeFinished: (id: string) => Promise<boolean>
  clearFinished: () => Promise<void>
  isDownloading: (wallpaperId: string) => boolean
  loadHistory: () => Promise<void>
  restorePendingDownloads: () => Promise<void>
  cleanupOrphanFiles: () => Promise<void>
}

/**
 * 下载管理 Composable
 *
 * 封装下载管理逻辑，提供统一的下载任务管理接口
 * 自动处理进度订阅的生命周期
 */
export function useDownload(): UseDownloadReturn {
  const store = useDownloadStore()
  const { showError, showWarning } = useAlert()

  // 进度订阅取消函数
  let unsubscribe: (() => void) | null = null

  /**
   * 处理进度更新
   *
   * Main process is source of truth for state transitions.
   * Renderer responds to progress events rather than predicting state.
   */
  const handleProgress = (data: DownloadProgressData): void => {
    const { taskId, progress, offset, speed, state, filePath, error, resumeNotSupported } = data

    // Show notification if server doesn't support Range
    if (resumeNotSupported) {
      showWarning('服务器不支持断点续传，已重新开始下载')
    }

    if (error) {
      const task = store.downloadingList.find((item) => item.id === taskId)
      if (task) {
        task.state = 'failed'
      }
      showError(`下载失败: ${error}`)
      return
    }

    // state === 'completed' — finalize download
    if (state === 'completed' && filePath) {
      store.completeDownload(taskId, filePath)
      const finishedItem = store.finishedList.find((item) => item.id === taskId)
      if (finishedItem) {
        downloadService.saveFinishedRecord(finishedItem).catch((err) => {
          console.error('[useDownload] 保存已完成记录失败:', err)
        })
      }
      return
    }

    // state === 'paused' — set paused state, preserve offset
    if (state === 'paused') {
      const task = store.downloadingList.find((item) => item.id === taskId)
      if (task) {
        task.state = 'paused'
        task.offset = offset
      }
      return
    }

    // state === 'waiting' — task is enqueued but not yet started
    // (DL-02: queue may hold task until a slot frees up)
    if (state === 'waiting') {
      const task = store.downloadingList.find((item) => item.id === taskId)
      if (task) {
        task.state = 'waiting'
        task.offset = offset
      }
      return
    }

    // 'downloading' or any other state — update progress
    // Ensure renderer state matches main process
    const task = store.downloadingList.find((item) => item.id === taskId)
    if (task && state === 'downloading') {
      task.state = 'downloading'
    }

    store.updateProgress(taskId, progress, offset, speed, filePath)
  }

  // 生命周期钩子：订阅进度
  onMounted(() => {
    unsubscribe = downloadService.onProgress(handleProgress)
  })

  // 生命周期钩子：取消订阅
  onUnmounted(() => {
    if (unsubscribe) {
      unsubscribe()
      unsubscribe = null
    }
  })

  /**
   * 添加下载任务
   */
  const addTask = (
    task: Omit<DownloadItem, 'id' | 'offset' | 'progress' | 'speed' | 'state'>,
  ): string => {
    // Store 方法返回 Promise，但这里我们需要同步返回 ID
    // 直接调用 Store 的方法并返回 ID
    const id = `dl_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`

    const downloadItem: DownloadItem = {
      id,
      ...task,
      offset: 0,
      progress: 0,
      speed: 0,
      state: 'waiting',
    }

    store.downloadingList.push(downloadItem)

    return id
  }

  /**
   * 启动下载
   *
   * Main process controls state transitions via download-progress events.
   * This method enqueues the task and returns immediately — the queue
   * determines when the download actually starts.
   */
  const startDownload = async (id: string): Promise<boolean> => {
    const task = store.downloadingList.find((item) => item.id === id)
    if (!task) {
      showError('任务不存在')
      return false
    }

    // Record start time but do NOT set state optimistically —
    // main process controls state (waiting/downloading) via progress events
    task.time = new Date().toISOString()

    const result = await downloadService.startDownload(id, task.url, task.filename)
    console.log('[useDownload] startDownload result:', result)

    if (!result.success) {
      // On IPC failure, reset to 'waiting' (the initial state from addTask)
      task.state = 'waiting'
      showError(result.error?.message || '启动下载失败')
      return false
    }

    return true
  }

  /**
   * 暂停下载
   */
  const pauseDownload = async (id: string): Promise<boolean> => {
    const task = store.downloadingList.find((item) => item.id === id)
    if (!task || task.state !== 'downloading') {
      return false
    }

    // 调用服务层暂停下载
    const result = await downloadService.pauseDownload(id)

    if (result.success) {
      task.state = 'paused'
      return true
    } else {
      showError(result.error?.message || '暂停下载失败')
      return false
    }
  }

  /**
   * 恢复下载（断点续传）
   * 从已下载的 offset 继续下载，而不是重新开始
   */
  const resumeDownload = async (id: string): Promise<boolean> => {
    const task = store.downloadingList.find((item) => item.id === id)
    if (!task || task.state !== 'paused') {
      return false
    }

    // 获取下载目录
    const pathResult = await downloadService.getDownloadPath()
    if (!pathResult.success || !pathResult.data) {
      showError(pathResult.error?.message || '获取下载目录失败')
      return false
    }

    // 构造 PendingDownload 对象
    const pendingDownload = {
      taskId: task.id,
      url: task.url,
      filename: task.filename,
      saveDir: pathResult.data,
      offset: task.offset,
      totalSize: task.size,
      wallpaperId: task.wallpaperId,
      small: task.small,
      resolution: task.resolution,
      size: task.size,
      createdAt: task.time || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    // Do NOT set state here — main process controls state via progress events.
    // The queue may keep the task in 'waiting' until a slot is available.

    // 调用断点续传服务
    const result = await downloadService.resumeDownload(id, pendingDownload)

    if (!result.success) {
      const errorCode = result.error?.code
      const errorMessage = result.error?.message

      // 根据错误类型处理
      switch (errorCode) {
        case 'RESUME_FILE_NOT_FOUND': {
          // 临时文件丢失,从列表移除
          showError(errorMessage || '临时文件不存在')
          const index1 = store.downloadingList.findIndex((item) => item.id === id)
          if (index1 !== -1) {
            store.downloadingList.splice(index1, 1)
          }
          return false
        }

        case 'RESUME_INVALID_OFFSET': {
          // 临时文件损坏,已自动清理
          showWarning(errorMessage || '临时文件已损坏,请重新下载')
          const index2 = store.downloadingList.findIndex((item) => item.id === id)
          if (index2 !== -1) {
            store.downloadingList.splice(index2, 1)
          }
          return false
        }

        case 'RESUME_STATE_CORRUPTED': {
          // 状态文件损坏
          showError(errorMessage || '下载记录已损坏')
          const index3 = store.downloadingList.findIndex((item) => item.id === id)
          if (index3 !== -1) {
            store.downloadingList.splice(index3, 1)
          }
          return false
        }

        default:
          // 其他错误,保持暂停状态允许重试
          task.state = 'paused'
          showError(errorMessage || '恢复下载失败')
          return false
      }
    }

    console.log('[useDownload] 恢复下载成功:', id, '从 offset:', task.offset)
    return true
  }

  /**
   * 取消下载
   */
  const cancelDownload = async (id: string): Promise<boolean> => {
    const task = store.downloadingList.find((item) => item.id === id)
    if (!task) {
      return false
    }

    // If task is downloading or waiting in queue, cancel via main process
    if (task.state === 'downloading' || task.state === 'waiting') {
      const result = await downloadService.cancelDownload(id)
      if (!result.success) {
        showError(result.error?.message || '取消下载失败')
        return false
      }
    }

    // 从列表中移除
    const index = store.downloadingList.findIndex((item) => item.id === id)
    if (index !== -1) {
      store.downloadingList.splice(index, 1)
    }

    return true
  }

  /**
   * 移除已完成记录
   */
  const removeFinished = async (id: string): Promise<boolean> => {
    const result = await downloadService.removeFinishedRecord(id)
    if (result.success) {
      const index = store.finishedList.findIndex((item) => item.id === id)
      if (index !== -1) {
        store.finishedList.splice(index, 1)
      }
      return true
    }
    return false
  }

  /**
   * 清空已完成列表
   */
  const clearFinished = async (): Promise<void> => {
    const result = await downloadService.clearFinishedRecords()
    if (result.success) {
      store.finishedList.length = 0
    }
  }

  /**
   * 检查是否正在下载
   */
  const isDownloading = (wallpaperId: string): boolean => {
    return store.downloadingList.some((item) => item.wallpaperId === wallpaperId)
  }

  /**
   * 加载历史记录
   */
  const loadHistory = async (): Promise<void> => {
    const result = await downloadService.getFinishedRecords()
    if (result.success && result.data) {
      store.finishedList.length = 0
      store.finishedList.push(...result.data)
    }
  }

  /**
   * 恢复待处理的下载任务
   * 在应用启动时调用，将未完成的下载任务恢复到下载列表
   */
  const restorePendingDownloads = async (): Promise<void> => {
    const result = await downloadService.getPendingDownloads()

    if (!result.success || !result.data) {
      console.warn('[useDownload] 获取待恢复下载任务失败:', result.error)
      return
    }

    const pendingDownloads = result.data

    if (pendingDownloads.length === 0) {
      console.log('[useDownload] 没有待恢复的下载任务')
      return
    }

    console.log('[useDownload] 发现待恢复下载任务:', pendingDownloads.length, '个')

    for (const pending of pendingDownloads) {
      // 检查是否已存在相同 taskId（避免重复添加）
      const existingTask = store.downloadingList.find((item) => item.id === pending.taskId)
      if (existingTask) {
        console.log('[useDownload] 任务已存在，跳过:', pending.taskId)
        continue
      }

      // 从 PendingDownload 构造 DownloadItem
      const downloadItem: DownloadItem = {
        id: pending.taskId,
        url: pending.url,
        filename: pending.filename,
        small: pending.small || '',
        resolution: pending.resolution || '',
        size: pending.size || pending.totalSize,
        offset: pending.offset,
        progress:
          pending.totalSize > 0 ? Math.round((pending.offset / pending.totalSize) * 100) : 0,
        speed: 0,
        state: 'paused',
        wallpaperId: pending.wallpaperId,
      }

      // 添加到下载列表
      store.downloadingList.push(downloadItem)
      console.log(
        '[useDownload] 已恢复下载任务:',
        pending.taskId,
        '进度:',
        downloadItem.progress + '%',
      )
    }
  }

  /**
   * 清理孤儿临时文件
   * 删除超过 7 天的临时文件和状态文件
   */
  const cleanupOrphanFiles = async (): Promise<void> => {
    const result = await downloadService.cleanupOrphanFiles()
    if (result.success && result.data) {
      const { filesDeleted, stateFilesDeleted } = result.data
      if (filesDeleted > 0 || stateFilesDeleted > 0) {
        console.log(
          '[useDownload] 已清理孤儿文件:',
          filesDeleted,
          '个临时文件,',
          stateFilesDeleted,
          '个状态文件',
        )
      }
    }
  }

  return {
    // 状态
    downloadingList: computed(() => store.downloadingList),
    finishedList: computed(() => store.finishedList),
    totalActive: computed(() => store.totalActive),
    totalPaused: computed(() => store.totalPaused),
    totalFinished: computed(() => store.totalFinished),

    // 方法
    addTask,
    startDownload,
    pauseDownload,
    resumeDownload,
    cancelDownload,
    removeFinished,
    clearFinished,
    isDownloading,
    loadHistory,
    restorePendingDownloads,
    cleanupOrphanFiles,
  }
}
