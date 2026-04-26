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
}

/**
 * 下载管理 Composable
 *
 * 封装下载管理逻辑，提供统一的下载任务管理接口
 * 自动处理进度订阅的生命周期
 */
export function useDownload(): UseDownloadReturn {
  const store = useDownloadStore()
  const { showError } = useAlert()

  // 进度订阅取消函数
  let unsubscribe: (() => void) | null = null

  /**
   * 处理进度更新
   */
  const handleProgress = (data: DownloadProgressData): void => {
    const { taskId, progress, offset, speed, state, filePath, error } = data

    if (error) {
      const task = store.downloadingList.find((item) => item.id === taskId)
      if (task) {
        task.state = 'failed'
        // 保留 offset，不重置 progress，便于用户恢复下载
      }
      showError(`下载失败: ${error}`)
      return
    }

    if (state === 'completed' && filePath) {
      store.completeDownload(taskId, filePath)
      // 持久化已完成记录到 storage
      const finishedItem = store.finishedList.find((item) => item.id === taskId)
      if (finishedItem) {
        downloadService.saveFinishedRecord(finishedItem).catch((err) => {
          console.error('[useDownload] 保存已完成记录失败:', err)
        })
      }
    } else if (state === 'paused') {
      // 更新为暂停状态
      const task = store.downloadingList.find((item) => item.id === taskId)
      if (task) {
        task.state = 'paused'
        task.offset = offset
      }
    } else {
      store.updateProgress(taskId, progress, offset, speed, filePath)
    }
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
   */
  const startDownload = async (id: string): Promise<boolean> => {
    const task = store.downloadingList.find((item) => item.id === id)
    if (!task) {
      showError('任务不存在')
      return false
    }

    task.state = 'downloading'
    task.time = new Date().toISOString()

    const result = await downloadService.startDownload(id, task.url, task.filename)
    console.log('[useDownload] startDownload result:', result)

    if (!result.success) {
      // // 检查任务是否已被用户暂停 - 如果是，不要覆盖 paused 状态
      // if (task.state === 'paused') {
      //   console.log('[useDownload] startDownload failed but task is paused - keeping paused state')
      //   return false
      // }
      // console.log('[useDownload] startDownload FAILED - setting state to waiting')
      // task.state = 'waiting'
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

    // 更新任务状态为下载中
    task.state = 'downloading'

    // 调用断点续传服务
    const result = await downloadService.resumeDownload(id, pendingDownload)

    if (!result.success) {
      task.state = 'paused'
      showError(result.error?.message || '恢复下载失败')
      return false
    }

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

    // 如果任务正在下载中，需要调用服务层取消
    if (task.state === 'downloading') {
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
  }
}
