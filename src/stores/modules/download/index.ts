import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { DownloadItem, FinishedDownloadItem } from '@/types'
import { downloadService } from '@/services'

export const useDownloadStore = defineStore('download', () => {
  // ==================== 状态 ====================

  const downloadingList = ref<DownloadItem[]>([])
  const finishedList = ref<FinishedDownloadItem[]>([])

  // ==================== 计算属性 ====================

  const activeDownloads = computed(() =>
    downloadingList.value.filter(
      (item) => item.state === 'downloading' || item.state === 'retrying',
    ),
  )

  const pausedDownloads = computed(() =>
    downloadingList.value.filter((item) => item.state === 'paused'),
  )

  const totalActive = computed(() => activeDownloads.value.length)
  const totalPaused = computed(() => pausedDownloads.value.length)
  const totalFinished = computed(() => finishedList.value.length)

  // ==================== 方法 ====================

  function generateId(): string {
    return `dl_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
  }

  /**
   * 从持久化存储加载已完成下载记录
   */
  async function loadDownloadHistory(): Promise<void> {
    const result = await downloadService.getFinishedRecords()
    if (result.success && result.data) {
      finishedList.value = result.data
      console.log('[DownloadStore] 已从存储加载下载记录:', result.data.length, '条')
    } else {
      console.warn('[DownloadStore] 加载下载记录失败:', result.error)
    }
  }

  function addDownloadTask(
    task: Omit<DownloadItem, 'id' | 'offset' | 'progress' | 'speed' | 'state'>,
  ): string {
    const id = generateId()

    const downloadItem: DownloadItem = {
      id,
      ...task,
      offset: 0,
      progress: 0,
      speed: 0,
      state: 'waiting',
    }

    downloadingList.value.push(downloadItem)
    console.log('[DownloadStore] 添加下载任务:', id)

    return id
  }

  function updateProgress(
    id: string,
    progress: number,
    offset: number,
    speed: number,
    filePath?: string,
  ): void {
    const task = downloadingList.value.find((item) => item.id === id)
    if (task) {
      task.progress = progress
      task.offset = offset
      task.speed = speed

      if (progress >= 100 && filePath) {
        completeDownload(id, filePath)
      }
    }
  }

  function completeDownload(id: string, filePath?: string): void {
    const index = downloadingList.value.findIndex((item) => item.id === id)
    if (index === -1) return

    const task = downloadingList.value[index]
    if (!task) return

    const finishedItem: FinishedDownloadItem = {
      id: task.id,
      url: task.url,
      filename: task.filename,
      small: task.small,
      resolution: task.resolution,
      size: task.size,
      offset: task.offset,
      progress: 100,
      speed: task.speed,
      state: 'completed',
      path: filePath || task.path || '',
      time: new Date().toISOString(),
      wallpaperId: task.wallpaperId,
    }

    finishedList.value.unshift(finishedItem)
    downloadingList.value.splice(index, 1)

    console.log('[DownloadStore] 下载完成:', id)
  }

  function pauseDownload(id: string): void {
    const task = downloadingList.value.find((item) => item.id === id)
    if (task && task.state === 'downloading') {
      task.state = 'paused'
    }
  }

  function resumeDownload(id: string): void {
    const task = downloadingList.value.find((item) => item.id === id)
    if (task && task.state === 'paused') {
      task.state = 'downloading'
    }
  }

  function cancelDownload(id: string): boolean {
    const index = downloadingList.value.findIndex((item) => item.id === id)
    if (index !== -1) {
      downloadingList.value.splice(index, 1)
      return true
    }
    return false
  }

  function isDownloading(wallpaperId: string): boolean {
    return downloadingList.value.some((item) => item.wallpaperId === wallpaperId)
  }

  return {
    // 状态
    downloadingList,
    finishedList,

    // 计算属性
    activeDownloads,
    pausedDownloads,
    totalActive,
    totalPaused,
    totalFinished,

    // 方法
    loadDownloadHistory,
    addDownloadTask,
    updateProgress,
    completeDownload,
    pauseDownload,
    resumeDownload,
    cancelDownload,
    isDownloading,
  }
})
