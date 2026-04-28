<template>
  <div class="online-wallpaper-page">
    <!-- 加载遮罩层 -->
    <LoadingOverlay
      :show="showLoadingOverlay"
      text="搜索中..."
    />

    <!-- Alert 提示框 -->
    <Alert
      v-if="alert.visible"
      :type="alert.type"
      :message="alert.message"
      :duration="alert.duration"
      @close="hideAlert"
    />

    <ImagePreview
      v-show="imgShow"
      :showing="imgShow"
      :img-info="imgInfo"
      :is-local="false"
      :wallpaper-list="wallpaperList"
      :current-index="previewIndex"
      :favorite-ids="favoriteIds"
      @download-img="downloadImg"
      @set-bg="setBg"
      @close="closePreview"
      @navigate="handleNavigate"
      @toggle-favorite="handleToggleFavorite"
      @show-favorite-dropdown="handleShowFavoriteDropdown"
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
    <div
      v-if="error"
      class="error-container"
    >
      <div class="error-content">
        <i class="fas fa-exclamation-triangle error-icon" />
        <h3>网络异常</h3>
        <p>无法连接到 Wallhaven API，请检查：</p>
        <ul>
          <li>网络连接是否正常</li>
          <li>API Key 是否正确（如果需要）</li>
          <li>防火墙或代理设置</li>
        </ul>
        <button
          class="retry-button"
          @click="retryFetch"
        >
          <i class="fas fa-redo" /> 重试
        </button>
      </div>
    </div>

    <!-- 使用壁纸列表组件 -->
    <WallpaperList
      v-else
      :page-data="wallpapers"
      :loading="loading"
      :error="error"
      :selected-ids="selectedWallpapers"
      :favorite-ids="favoriteIds"
      @set-bg="setBg"
      @preview="preview"
      @download-img="downloadImg"
      @select-wallpaper="toggleSelection"
      @close-search-modal="closeSearchModal"
      @toggle-favorite="handleToggleFavorite"
      @show-favorite-dropdown="handleShowFavoriteDropdown"
    />

    <!-- Collection Dropdown -->
    <CollectionDropdown
      v-if="dropdownWallpaper"
      :wallpaper-id="dropdownWallpaper.id"
      :wallpaper-data="dropdownWallpaper"
      :visible="showFavoriteDropdown"
      :position="dropdownPosition"
      @close="closeFavoriteDropdown"
    />
  </div>
</template>

<script lang="ts" setup>
import { computed, onMounted, onUnmounted, onActivated, onDeactivated, ref, shallowRef } from 'vue'
import SearchBar from '@/components/SearchBar.vue'
import WallpaperList from '@/components/WallpaperList.vue'
import ImagePreview from '@/components/ImagePreview.vue'
import Alert from '@/components/Alert.vue'
import LoadingOverlay from '@/components/LoadingOverlay.vue'
import CollectionDropdown from '@/components/favorites/CollectionDropdown.vue'
import { useWallpaperList, useDownload, useSettings, useAlert, useWallpaperSetter, useFavorites, useCollections } from '@/composables'
import type { WallpaperItem, GetParams, CustomParams } from '@/types'
import { throttle } from '@/utils/helpers'

// Composables
const {
  wallpapers,
  loading,
  error,
  queryParams,
  fetch: fetchWallpapers,
  loadMore: loadMoreWallpapers,
  saveCustomParams
} = useWallpaperList()
const { addTask, startDownload, loadHistory, isDownloading } = useDownload()
const { settings, selectFolder, update: updateSettings } = useSettings()
const { alert, showSuccess, showError, showWarning, hideAlert } = useAlert()
const { setWallpaper } = useWallpaperSetter()

// Favorites composable
const {
  favoriteIds,
  add: addFavorite,
  remove: removeFavorite,
  isInCollection,
  load: loadFavorites
} = useFavorites()

// Collections composable for getDefault
const {
  getDefault,
  load: loadCollections
} = useCollections()

// Refs - 使用 shallowRef 优化大型对象
const searchBarRef = ref<InstanceType<typeof SearchBar> | null>(null)
const desktopInfo = ref<string>('')
const saving = ref<boolean>(false)
const imgInfo = shallowRef<WallpaperItem | null>(null) // 使用 shallowRef
const imgShow = ref<boolean>(false)
const selectedWallpapers = ref<string[]>([])
const downloading = ref<boolean>(false)
const showLoadingOverlay = ref<boolean>(false) // 控制加载遮罩层显示

// Favorite dropdown state
const showFavoriteDropdown = ref<boolean>(false)
const dropdownPosition = ref<{ x: number; y: number }>({ x: 0, y: 0 })
const dropdownWallpaper = ref<WallpaperItem | null>(null)

// Computed - 使用计算属性使 apiKey 响应式跟随 store 变化
const apiKey = computed(() => settings.value.apiKey)

// 从 wallpapers 中提取扁平化的壁纸列表
const wallpaperList = computed<WallpaperItem[]>(() => {
  const allWallpapers: WallpaperItem[] = []
  wallpapers.value.sections.forEach(section => {
    allWallpapers.push(...section.data)
  })
  return allWallpapers
})

// 当前预览索引
const previewIndex = computed(() => {
  if (!imgInfo.value) return -1
  return wallpaperList.value.findIndex(wp => wp.id === imgInfo.value?.id)
})

// Lifecycle hooks
onMounted(() => {
  // 加载下载历史记录
  loadHistory()
  // 加载收藏数据
  loadFavorites()
  // 加载收藏夹列表
  loadCollections()
  // 添加点击外部关闭下拉菜单
  document.addEventListener('click', handleClickOutside)
})

onActivated(() => {
  // 组件被激活时（从 KeepAlive 缓存中恢复），添加滚动监听器
  window.addEventListener('scroll', throttledScrollEvent, { passive: true })
})

onDeactivated(() => {
  // 组件被停用时（进入 KeepAlive 缓存），移除滚动监听器
  window.removeEventListener('scroll', throttledScrollEvent)
})

onUnmounted(() => {
  // 组件真正卸载时，确保清理监听器
  window.removeEventListener('scroll', throttledScrollEvent)
  document.removeEventListener('click', handleClickOutside)
})

// Methods
const handleChangeParams = (customParams: GetParams | null): void => {
  showLoadingOverlay.value = true // 点击搜索按钮时显示遮罩
  fetchWallpapers(customParams).finally(() => {
    showLoadingOverlay.value = false // 加载完成后隐藏遮罩
  })
}

const saveParams = async (params: CustomParams): Promise<void> => {
  const success = await saveCustomParams(params)
  if (success) {
    showSuccess('参数已保存')
  }
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
    showWarning('请先选择要下载的壁纸')
    return
  }

  downloading.value = true

  try {
    // 获取所有选中的壁纸信息
    const allSections = wallpapers.value.sections
    const allWallpapers: WallpaperItem[] = []

    // 从所有section中收集壁纸
    allSections.forEach(section => {
      allWallpapers.push(...section.data)
    })

    const selectedItems = allWallpapers.filter((wp: WallpaperItem) =>
      selectedWallpapers.value.includes(wp.id)
    )

    if (selectedItems.length === 0) {
      showError('未找到选中的壁纸信息')
      return
    }

    // 批量添加到下载队列并启动下载
    for (const item of selectedItems) {
      const taskId = addTask({
        url: item.path,
        filename: generateFilename(item),
        small: item.thumbs.small,
        resolution: item.resolution,
        size: item.file_size,
        wallpaperId: item.id
      })
      await startDownload(taskId)
    }

    showSuccess(`已添加 ${selectedItems.length} 个下载任务到下载中心`)

    // 清空选择
    clearSelection()
  } catch (error: any) {
    console.error('批量下载失败:', error)
    showError('批量下载失败: ' + error.message)
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
      showError('下载壁纸失败: ' + (downloadResult.error || '未知错误'))
      return
    }

    // 设置为桌面壁纸
    await setWallpaper(downloadResult.filePath)
  } catch (error: any) {
    console.error('设置壁纸错误:', error)
    showError('设置壁纸失败: ' + error.message)
  }
}

const downloadImg = async (imgItem: WallpaperItem): Promise<void> => {
  try {
    // 添加到下载队列
    await addToDownloadQueue(imgItem)
    showSuccess('已添加到下载队列，请在下载中心查看进度')
  } catch (error: any) {
    console.error('添加下载任务失败:', error)
    showError('添加下载任务失败: ' + error.message)
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
  let downloadPath = settings.value.downloadPath

  if (!downloadPath) {
    // 如果没有设置下载目录，提示用户
    const selectResult = await selectFolder()
    if (!selectResult.success || !selectResult.data) {
      return { success: false, filePath: null, error: '未选择下载目录' }
    }

    // 保存下载目录到 electron-store
    await updateSettings({ downloadPath: selectResult.data })
    downloadPath = selectResult.data
  }

  const saveDir = downloadPath

  // 生成文件名（从URL提取扩展名）
  let ext = '.jpg'
  if (imgItem.path) {
    const match = imgItem.path.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/i)
    if (match) {
      ext = match[0]
    }
  }
  const filename = `wallhaven-${imgItem.id}${ext}`

  // 通过 electronClient 下载
  const { electronClient } = await import('@/clients')
  const result = await electronClient.downloadWallpaper({
    url: imgItem.path,
    filename,
    saveDir
  })

  return {
    success: result.success,
    filePath: result.data || null,
    error: result.error?.message || null
  }
}

const closePreview = (): void => {
  imgShow.value = false
  imgInfo.value = null
}

const handleNavigate = (direction: 'prev' | 'next'): void => {
  const newIndex = direction === 'prev'
    ? previewIndex.value - 1
    : previewIndex.value + 1

  if (newIndex >= 0 && newIndex < wallpaperList.value.length) {
    const wallpaper = wallpaperList.value[newIndex]
    if (wallpaper) {
      preview(wallpaper)
    }
  }
}

/**
 * 重试获取数据
 */
const retryFetch = (): void => {
  showLoadingOverlay.value = true
  fetchWallpapers(queryParams.value).finally(() => {
    showLoadingOverlay.value = false
  })
}

/**
 * 滚轮滚动加载（使用节流优化）
 */
const scrollEvent = (): void => {
  // 如果正在加载，则不执行
  if (loading.value) return

  // 如果已经加载完所有页面且有数据，则不执行
  const { currentPage, totalPage } = wallpapers.value
  if (totalPage > 0 && currentPage >= totalPage) return

  const scrollTop = document.documentElement.scrollTop || document.body.scrollTop
  const scrollHeight = document.documentElement.scrollHeight || document.body.scrollHeight
  const clientHeight = document.documentElement.clientHeight

  // 距离底部200px时触发加载（增加阈值以应对快速滚动）
  if (scrollTop + clientHeight >= scrollHeight - 200) {
    loadMoreWallpapers()
  }
}

// 使用节流函数包装滚动事件（300ms间隔，平衡性能和响应速度）
const throttledScrollEvent = throttle(scrollEvent, 300)

/**
 * 添加到下载队列（单个）
 */
const addToDownloadQueue = async (imgItem: WallpaperItem): Promise<void> => {
  // 检查是否已在下载队列中
  if (isDownloading(imgItem.id)) {
    throw new Error('该壁纸已在下载队列中')
  }

  // 生成文件名
  const filename = generateFilename(imgItem)

  // 创建下载任务
  const taskId = addTask({
    url: imgItem.path,
    filename,
    small: imgItem.thumbs.small,
    resolution: imgItem.resolution,
    size: Number(imgItem.file_size) || 0,
    wallpaperId: imgItem.id
  })

  // 自动开始下载
  await startDownload(taskId)

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

/**
 * 处理收藏按钮左键点击 - 快速添加/移除默认收藏夹
 */
const handleToggleFavorite = async (item: WallpaperItem): Promise<void> => {
  const defaultCollection = getDefault()
  if (!defaultCollection) {
    showWarning('请先设置默认收藏夹')
    return
  }

  // 检查是否已在默认收藏夹中
  if (isInCollection(item.id, defaultCollection.id)) {
    // 已在默认收藏夹中，移除
    await removeFavorite(item.id, defaultCollection.id)
    showSuccess(`已从"${defaultCollection.name}"移除`)
  } else {
    // 不在默认收藏夹中，添加
    await addFavorite(item.id, defaultCollection.id, item)
    showSuccess(`已添加到"${defaultCollection.name}"`)
  }
}

/**
 * 处理收藏按钮右键点击 - 显示收藏夹下拉菜单
 */
const handleShowFavoriteDropdown = (item: WallpaperItem, event: MouseEvent): void => {
  if (showFavoriteDropdown.value && dropdownWallpaper.value?.id === item.id) {
    closeFavoriteDropdown()
  } else {
      dropdownWallpaper.value = item
  const rect = (event.target as HTMLElement).getBoundingClientRect()
  dropdownPosition.value = {
    x: rect.left,
    y: rect.bottom + 4
  }
  showFavoriteDropdown.value = true
  }
}

/**
 * 关闭收藏下拉菜单
 */
const closeFavoriteDropdown = (): void => {
  showFavoriteDropdown.value = false
  dropdownWallpaper.value = null
}

/**
 * 点击外部关闭下拉菜单
 */
const handleClickOutside = (event: MouseEvent): void => {
  if (showFavoriteDropdown.value) {
    const target = event.target as HTMLElement
    if (!target.closest('.collection-dropdown') && !target.closest('.thumb-favorite-btn')) {
      closeFavoriteDropdown()
    }
  }
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
