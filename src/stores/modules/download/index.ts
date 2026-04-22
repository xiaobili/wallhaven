import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { DownloadItem, FinishedDownloadItem } from '@/types'

/**
 * 下载管理 Store
 * 管理所有下载任务的状态和逻辑
 */
export const useDownloadStore = defineStore('download', () => {
  // 状态
  const downloadingList = ref<DownloadItem[]>([])
  const finishedList = ref<FinishedDownloadItem[]>([])
  
  // 计算属性
  const activeDownloads = computed(() => 
    downloadingList.value.filter(item => item.state === 'downloading')
  )
  
  const pausedDownloads = computed(() => 
    downloadingList.value.filter(item => item.state === 'paused')
  )
  
  const totalActive = computed(() => activeDownloads.value.length)
  const totalPaused = computed(() => pausedDownloads.value.length)
  const totalFinished = computed(() => finishedList.value.length)
  
  /**
   * 生成唯一ID
   */
  const generateId = (): string => {
    return `dl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
  
  /**
   * 添加下载任务
   */
  const addDownloadTask = (task: Omit<DownloadItem, 'id' | 'offset' | 'progress' | 'speed' | 'state'>): string => {
    const id = generateId()
    
    const downloadItem: DownloadItem = {
      id,
      ...task,
      offset: 0,
      progress: 0,
      speed: 0,
      state: 'waiting'
    }
    
    downloadingList.value.push(downloadItem)
    
    // 保存到localStorage
    saveToStorage()
    
    console.log('[DownloadStore] 添加下载任务:', id)
    
    return id
  }
  
  /**
   * 批量添加下载任务
   */
  const addBatchDownloadTasks = (tasks: Array<Omit<DownloadItem, 'id' | 'offset' | 'progress' | 'speed' | 'state'>>): string[] => {
    const ids: string[] = []
    
    tasks.forEach(task => {
      const id = addDownloadTask(task)
      ids.push(id)
    })
    
    console.log(`[DownloadStore] 批量添加 ${ids.length} 个下载任务`)
    
    return ids
  }
  
  /**
   * 开始下载（将waiting状态改为downloading并启动实际下载）
   */
  const startDownload = async (id: string): Promise<void> => {
    const task = downloadingList.value.find(item => item.id === id)
    if (task && task.state === 'waiting') {
      task.state = 'downloading'
      task.time = new Date().toISOString()
      saveToStorage()
      console.log('[DownloadStore] 开始下载:', id)
      
      // 启动实际的Electron下载
      try {
        // 获取下载目录
        const settingsStr = localStorage.getItem('app_settings')
        let downloadPath = ''
        if (settingsStr) {
          try {
            const settings = JSON.parse(settingsStr)
            downloadPath = settings.downloadPath || ''
          } catch (e) {
            console.error('解析设置失败:', e)
          }
        }
        
        if (!downloadPath && typeof window !== 'undefined' && window.electronAPI) {
          // 如果没有设置，提示用户选择
          const selectedDir = await window.electronAPI.selectFolder()
          if (selectedDir) {
            downloadPath = selectedDir
            // 保存设置
            const settings = { downloadPath }
            localStorage.setItem('app_settings', JSON.stringify(settings))
          } else {
            // 用户取消选择，暂停任务
            task.state = 'paused'
            return
          }
        }
        
        if (!downloadPath) {
          task.state = 'paused'
          console.error('[DownloadStore] 未设置下载目录')
          return
        }
        
        // 调用Electron API开始下载
        if (typeof window !== 'undefined' && window.electronAPI) {
          window.electronAPI.startDownloadTask({
            taskId: id,
            url: task.url,
            filename: task.filename,
            saveDir: downloadPath
          })
        }
      } catch (error) {
        console.error('[DownloadStore] 启动下载失败:', error)
        task.state = 'waiting'
      }
    }
  }
  
  /**
   * 暂停下载
   */
  const pauseDownload = (id: string): void => {
    const task = downloadingList.value.find(item => item.id === id)
    if (task && task.state === 'downloading') {
      task.state = 'paused'
      saveToStorage()
      console.log('[DownloadStore] 暂停下载:', id)
    }
  }
  
  /**
   * 恢复下载
   */
  const resumeDownload = (id: string): void => {
    const task = downloadingList.value.find(item => item.id === id)
    if (task && task.state === 'paused') {
      task.state = 'downloading'
      saveToStorage()
      console.log('[DownloadStore] 恢复下载:', id)
    }
  }
  
  /**
   * 取消下载
   */
  const cancelDownload = (id: string): boolean => {
    const index = downloadingList.value.findIndex(item => item.id === id)
    if (index !== -1) {
      downloadingList.value.splice(index, 1)
      saveToStorage()
      console.log('[DownloadStore] 取消下载:', id)
      return true
    }
    return false
  }
  
  /**
   * 更新下载进度
   */
  const updateProgress = (id: string, progress: number, offset: number, speed: number, filePath?: string): void => {
    const task = downloadingList.value.find(item => item.id === id)
    if (task) {
      task.progress = progress
      task.offset = offset
      task.speed = speed
      
      // 如果完成，移动到已完成列表
      if (progress >= 100 && filePath) {
        completeDownload(id, filePath)
      } else if (progress >= 100) {
        completeDownload(id)
      }
    }
  }
  
  /**
   * 完成下载
   */
  const completeDownload = (id: string, filePath?: string): void => {
    const index = downloadingList.value.findIndex(item => item.id === id)
    if (index !== -1) {
      const task = downloadingList.value[index]
      if (!task) return
      
      // 转换为已完成项
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
        wallpaperId: task.wallpaperId
      }
      
      // 添加到已完成列表
      finishedList.value.unshift(finishedItem)
      
      // 从下载列表中移除
      downloadingList.value.splice(index, 1)
      
      // 限制已完成列表数量（最多保留50条）
      if (finishedList.value.length > 50) {
        finishedList.value = finishedList.value.slice(0, 50)
      }
      
      saveToStorage()
      console.log('[DownloadStore] 下载完成:', id)
    }
  }
  
  /**
   * 删除已完成记录
   */
  const removeFinishedRecord = (id: string): boolean => {
    const index = finishedList.value.findIndex(item => item.id === id)
    if (index !== -1) {
      finishedList.value.splice(index, 1)
      saveToStorage()
      console.log('[DownloadStore] 删除完成记录:', id)
      return true
    }
    return false
  }
  
  /**
   * 清空已完成列表
   */
  const clearFinishedList = (): void => {
    finishedList.value = []
    saveToStorage()
    console.log('[DownloadStore] 清空已完成列表')
  }
  
  /**
   * 保存到localStorage
   */
  const saveToStorage = (): void => {
    try {
      localStorage.setItem('download_finished_list', JSON.stringify(finishedList.value))
    } catch (error) {
      console.error('[DownloadStore] 保存失败:', error)
    }
  }
  
  /**
   * 从localStorage加载
   */
  const loadFromStorage = (): void => {
    try {
      const saved = localStorage.getItem('download_finished_list')
      if (saved) {
        finishedList.value = JSON.parse(saved)
        console.log('[DownloadStore] 已加载历史记录:', finishedList.value.length)
      }
    } catch (error) {
      console.error('[DownloadStore] 加载失败:', error)
    }
  }
  
  /**
   * 检查是否已在下载队列中
   */
  const isDownloading = (wallpaperId: string): boolean => {
    return downloadingList.value.some(item => item.wallpaperId === wallpaperId)
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
    addDownloadTask,
    addBatchDownloadTasks,
    startDownload,
    pauseDownload,
    resumeDownload,
    cancelDownload,
    updateProgress,
    completeDownload,
    removeFinishedRecord,
    clearFinishedList,
    saveToStorage,
    loadFromStorage,
    isDownloading
  }
})
