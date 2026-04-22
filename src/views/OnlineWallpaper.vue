<template>
  <div class="online-wallpaper-page">
    <ImagePreview
      :showing="imgShow"
      :img-info="imgInfo"
      @preview="preview"
      @download-img="downloadImg"
      @set-bg="setBg"
      @close="closePreview"
    />

    <SearchBar
      ref="searchBarRef"
      :api-key="apiKey"
      :desktop-info="desktopInfo"
      :saving="saving"
      :selected-count="selectedWallpapers.length"
      :downloading="downloading"
      @change-params="handleChangeParams"
      @save-params="saveParams"
      @download-selected="downloadSelected"
      @clear-selection="clearSelection"
    />

    <!-- 显示错误信息 -->
    <div v-if="wallpaperStore.error" class="error-container">
      <div class="error-content">
        <i class="fas fa-exclamation-triangle error-icon"></i>
        <h3>网络异常</h3>
        <p>无法连接到 Wallhaven API，请检查：</p>
        <ul>
          <li>网络连接是否正常</li>
          <li>API Key 是否正确（如果需要）</li>
          <li>防火墙或代理设置</li>
        </ul>
        <button @click="retryFetch" class="retry-button">
          <i class="fas fa-redo"></i> 重试
        </button>
      </div>
    </div>

    <!-- 使用壁纸列表组件 -->
    <WallpaperList
      v-else
      :page-data="wallpaperStore.totalPageData"
      :loading="wallpaperStore.loading"
      :error="wallpaperStore.error"
      :selected-ids="selectedWallpapers"
      @set-bg="setBg"
      @preview="preview"
      @download-img="downloadImg"
      @select-wallpaper="toggleSelection"
      @close-search-modal="closeSearchModal"
    />
  </div>
</template>

<script lang="ts" setup>
import { onMounted, onUnmounted, ref } from 'vue'
import SearchBar from '@/components/SearchBar.vue'
import WallpaperList from '@/components/WallpaperList.vue'
import ImagePreview from '@/components/ImagePreview.vue'
import { useWallpaperStore } from '@/stores/wallpaper'
import { useDownloadStore } from '@/stores/modules/download'
import type { WallpaperItem, GetParams } from '@/types'
import { throttle } from '@/utils/helpers'

// Pinia Stores
const wallpaperStore = useWallpaperStore()
const downloadStore = useDownloadStore()

// Refs
const searchBarRef = ref<InstanceType<typeof SearchBar> | null>(null)
const apiKey = ref<string>('')
const desktopInfo = ref<string>('')
const saving = ref<boolean>(false)
const imgInfo = ref<WallpaperItem | null>(null)
const imgShow = ref<boolean>(false)
const selectedWallpapers = ref<string[]>([])
const downloading = ref<boolean>(false)

// Lifecycle hooks
onMounted(() => {
  // 加载下载历史记录
  downloadStore.loadFromStorage()
  
  // 使用节流优化滚动事件
  window.addEventListener('scroll', throttledScrollEvent)
})

onUnmounted(() => {
  // 清理事件监听器
  window.removeEventListener('scroll', throttledScrollEvent)
})

// Methods
const handleChangeParams = (customParams: GetParams | null): void => {
  wallpaperStore.fetchWallpapers(customParams)
}

const saveParams = (): void => {
  console.log('saveParams 被调用')
  // TODO: 实现保存参数功能
}

/**
 * 切换壁纸选择状态
 */
const toggleSelection = (wallpaperId: string): void => {
  const index = selectedWallpapers.value.indexOf(wallpaperId)
  if (index > -1) {
    // 已选中，取消选择
    selectedWallpapers.value.splice(index, 1)
  } else {
    // 未选中，添加选择
    selectedWallpapers.value.push(wallpaperId)
  }
}

/**
 * 清空选择
 */
const clearSelection = (): void => {
  selectedWallpapers.value = []
}

/**
 * 下载选中的壁纸
 */
const downloadSelected = async (): Promise<void> => {
  if (selectedWallpapers.value.length === 0) {
    alert('请先选择要下载的壁纸')
    return
  }
  
  downloading.value = true
  
  try {
    // 获取所有选中的壁纸信息
    const allSections = wallpaperStore.totalPageData.sections
    const allWallpapers: WallpaperItem[] = []
    
    // 从所有section中收集壁纸
    allSections.forEach(section => {
      allWallpapers.push(...section.data)
    })
    
    const selectedItems = allWallpapers.filter((wp: WallpaperItem) => 
      selectedWallpapers.value.includes(wp.id)
    )
    
    if (selectedItems.length === 0) {
      alert('未找到选中的壁纸信息')
      return
    }
    
    // 批量添加到下载队列
    const tasks = selectedItems.map((item: WallpaperItem) => ({
      url: item.path,
      filename: generateFilename(item),
      small: item.thumbs.small,
      resolution: item.resolution,
      size: item.file_size,
      wallpaperId: item.id
    }))
    
    const ids = downloadStore.addBatchDownloadTasks(tasks)
    
    // 自动开始所有下载
    ids.forEach(id => downloadStore.startDownload(id))
    
    alert(`✅ 已添加 ${selectedItems.length} 个下载任务到下载中心`)
    
    // 清空选择
    clearSelection()
  } catch (error: any) {
    console.error('批量下载失败:', error)
    alert('批量下载失败: ' + error.message)
  } finally {
    downloading.value = false
  }
}

const closeSearchModal = (): void => {
  // 调用 SearchBar 组件暴露的 closeModal 方法
  if (searchBarRef.value) {
    searchBarRef.value.closeModal()
  }
}

const preview = (imgItem: WallpaperItem): void => {
  imgInfo.value = imgItem
  imgShow.value = true
}

const setBg = async (imgItem: WallpaperItem): Promise<void> => {
  try {
    // 首先下载图片
    const downloadResult = await downloadWallpaperFile(imgItem)
    
    if (!downloadResult.success || !downloadResult.filePath) {
      alert('下载壁纸失败: ' + (downloadResult.error || '未知错误'))
      return
    }
    
    // 设置为桌面壁纸
    const setResult = await window.electronAPI.setWallpaper(downloadResult.filePath)
    
    if (setResult.success) {
      alert('✅ 壁纸设置成功！')
    } else {
      alert('设置壁纸失败: ' + (setResult.error || '未知错误'))
    }
  } catch (error: any) {
    console.error('设置壁纸错误:', error)
    alert('设置壁纸失败: ' + error.message)
  }
}

const downloadImg = async (imgItem: WallpaperItem): Promise<void> => {
  try {
    // 添加到下载队列
    await addToDownloadQueue(imgItem)
    alert('✅ 已添加到下载队列，请在下载中心查看进度')
  } catch (error: any) {
    console.error('添加下载任务失败:', error)
    alert('添加下载任务失败: ' + error.message)
  }
}

/**
 * 下载壁纸文件
 */
const downloadWallpaperFile = async (imgItem: WallpaperItem): Promise<{
  success: boolean
  filePath: string | null
  error: string | null
}> => {
  // 从store获取下载目录
  const downloadPath = wallpaperStore.settings.downloadPath
  
  if (!downloadPath) {
    // 如果没有设置下载目录，提示用户
    const selectedDir = await window.electronAPI.selectFolder()
    if (!selectedDir) {
      return { success: false, filePath: null, error: '未选择下载目录' }
    }
    
    // 保存下载目录到设置
    wallpaperStore.updateSettings({ downloadPath: selectedDir })
  }
  
  const saveDir = downloadPath || (await window.electronAPI.selectFolder())
  
  if (!saveDir) {
    return { success: false, filePath: null, error: '未选择下载目录' }
  }
  
  // 生成文件名（从URL提取扩展名）
  let ext = '.jpg'
  if (imgItem.path) {
    const match = imgItem.path.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/i)
    if (match) {
      ext = match[0]
    }
  }
  const filename = `wallhaven-${imgItem.id}${ext}`
  
  // 调用Electron API下载
  return await window.electronAPI.downloadWallpaper({
    url: imgItem.path,
    filename,
    saveDir
  })
}

const closePreview = (): void => {
  imgShow.value = false
  imgInfo.value = null
}

/**
 * 重试获取数据
 */
const retryFetch = (): void => {
  wallpaperStore.fetchWallpapers(wallpaperStore.queryParams)
}

/**
 * 滚轮滚动加载（使用节流优化）
 */
const scrollEvent = (): void => {
  // 如果正在加载，则不执行
  if (wallpaperStore.loading) return

  // 如果已经加载完所有页面且有数据，则不执行
  const { currentPage, totalPage } = wallpaperStore.totalPageData
  if (totalPage > 0 && currentPage >= totalPage) return

  const scrollTop = document.documentElement.scrollTop || document.body.scrollTop
  const scrollHeight = document.documentElement.scrollHeight || document.body.scrollHeight
  const clientHeight = document.documentElement.clientHeight

  // 距离底部200px时触发加载（增加阈值以应对快速滚动）
  if (scrollTop + clientHeight >= scrollHeight - 200) {
    wallpaperStore.loadMoreWallpapers()
  }
}

// 使用节流函数包装滚动事件（200ms间隔，更快响应）
const throttledScrollEvent = throttle(scrollEvent, 200)

/**
 * 添加到下载队列（单个）
 */
const addToDownloadQueue = async (imgItem: WallpaperItem): Promise<void> => {
  // 检查是否已在下载队列中
  if (downloadStore.isDownloading(imgItem.id)) {
    throw new Error('该壁纸已在下载队列中')
  }
  
  // 生成文件名
  const filename = generateFilename(imgItem)
  
  // 创建下载任务
  const task = {
    url: imgItem.path,
    filename,
    small: imgItem.thumbs.small,
    resolution: imgItem.resolution,
    size: Number(imgItem.file_size) || 0,
    wallpaperId: imgItem.id
  }
  
  // 添加到下载队列
  const taskId = downloadStore.addDownloadTask(task)
  
  // 自动开始下载
  downloadStore.startDownload(taskId)
  
  console.log('[OnlineWallpaper] 已添加下载任务:', taskId)
}

/**
 * 生成文件名
 */
const generateFilename = (imgItem: WallpaperItem): string => {
  let ext = '.jpg'
  if (imgItem.path) {
    const match = imgItem.path.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/i)
    if (match) {
      ext = match[0]
    }
  }
  return `wallhaven-${imgItem.id}${ext}`
}

</script>

<style scoped>
.online-wallpaper-page {
  min-height: calc(100vh - 60px);
}

.error-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
  padding: 20px;
}

.error-content {
  text-align: center;
  padding: 40px;
  background: #2a2a2a;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
  max-width: 500px;
}

.error-icon {
  font-size: 48px;
  color: #ff6b6b;
  margin-bottom: 20px;
}

.error-content h3 {
  color: #fff;
  margin-bottom: 15px;
}

.error-content p {
  color: #aaa;
  margin-bottom: 15px;
}

.error-content ul {
  text-align: left;
  color: #aaa;
  margin-bottom: 20px;
  padding-left: 20px;
}

.error-content li {
  margin: 5px 0;
}

.retry-button {
  padding: 10px 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s;
}

.retry-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.retry-button i {
  margin-right: 5px;
}
</style>
