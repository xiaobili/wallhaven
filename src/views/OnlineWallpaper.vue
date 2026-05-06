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
      v-show="previewVisible"
      :showing="previewVisible"
      :img-info="previewCurrent"
      :is-local="false"
      :wallpaper-list="wallpaperList"
      :current-index="previewIndex"
      :favorite-ids="favoriteIds"
      :wallpaper-collection-map="wallpaperCollectionMap"
      :default-collection-id="defaultCollectionId"
      @download-img="downloadImg"
      @set-bg="setBg"
      @close="closePreviewState"
      @navigate="handleNavigate"
      @toggle-favorite="handleToggleFavorite"
      @show-favorite-dropdown="handleShowFavoriteDropdown"
    />

    <SearchBar
      ref="searchBarRef"
      :api-key="apiKey"
      :desktop-info="desktopInfo"
      :saving="saving"
      :selected-count="selection.selectedCount.value"
      :downloading="selection.downloading.value"
      @change-params="handleChangeParams"
      @save-params="saveParams"
      @download-selected="downloadSelected"
      @clear-selection="selection.clear"
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
          class="button red"
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
      :selected-ids="selection.selectedIds.value"
      :favorite-ids="favoriteIds"
      :wallpaper-collection-map="wallpaperCollectionMap"
      :default-collection-id="defaultCollectionId"
      @set-bg="setBg"
      @preview="openPreview"
      @download-img="downloadImg"
      @select-wallpaper="selection.toggle"
      @close-search-modal="closeSearchModal"
      @toggle-favorite="handleToggleFavorite"
      @show-favorite-dropdown="handleShowFavoriteDropdown"
      @select-all="selection.selectAll"
    />

    <!-- 分页条 -->
    <PaginationBar
      v-if="!error && currentPageData.totalPage > 0 && wallpaperList.length > 0"
      :current-page="currentPageData.currentPage"
      :total-pages="currentPageData.totalPage"
      :total-count="totalCount"
      :loading="loading"
      @go-to-page="handleGoToPage"
    />

    <!-- Collection Dropdown -->
    <CollectionDropdown
      v-if="dropdown.wallpaper.value"
      :wallpaper-id="dropdown.wallpaper.value.id"
      :wallpaper-data="dropdown.wallpaper.value"
      :visible="dropdown.visible.value"
      :position="dropdown.position.value"
      @close="dropdown.close"
    />
  </div>
</template>

<script lang="ts" setup>
import { computed, onActivated, onDeactivated, ref, shallowRef, watch } from 'vue'
import SearchBar from '@/components/SearchBar.vue'
import WallpaperList from '@/components/WallpaperList.vue'
import ImagePreview from '@/components/ImagePreview.vue'
import Alert from '@/components/Alert.vue'
import LoadingOverlay from '@/components/LoadingOverlay.vue'
import CollectionDropdown from '@/components/favorites/CollectionDropdown.vue'
import PaginationBar from '@/components/PaginationBar.vue'
import {
  useWallpaperList,
  useWallpaperSelection,
  useWallpaperDownload,
  useSettings,
  useAlert,
  useWallpaperSetter,
  useFavorites,
  useCollections,
  useFavoriteDropdown,
  flattenWallpapers,
} from '@/composables'
import type { WallpaperItem, GetParams, CustomParams } from '@/types'

// ==================== Composables ====================

// 壁纸列表
const {
  wallpapers,
  currentPageData,
  totalCount,
  loading,
  error,
  queryParams,
  fetch: fetchWallpapers,
  goToPage,
  saveCustomParams,
  updateItemFavoriteStatus,
} = useWallpaperList()

// 设置
const { settings } = useSettings()
const apiKey = computed(() => settings.value.apiKey)

// 下载
const wallpaperDownload = useWallpaperDownload()

// 提示
const { alert, showSuccess, showError, showWarning, hideAlert } = useAlert()

// 壁纸设置
const { setBgFromUrl } = useWallpaperSetter()

// 收藏
const {
  favorites,
  favoriteIds,
  add: addFavorite,
  remove: removeFavorite,
  isInCollection,
} = useFavorites()
const { getDefault } = useCollections()

// 选择管理
const selection = useWallpaperSelection()

// 收藏下拉菜单
const dropdown = useFavoriteDropdown()

// ==================== 预览状态 ====================

const previewVisible = ref<boolean>(false)
const previewCurrent = shallowRef<WallpaperItem | null>(null)

const openPreviewState = (item: WallpaperItem) => {
  dropdown.close()
  previewCurrent.value = item
  previewVisible.value = true
}

const closePreviewState = () => {
  previewVisible.value = false
  previewCurrent.value = null
}

// ==================== 其他状态 ====================

const searchBarRef = ref<InstanceType<typeof SearchBar> | null>(null)
const desktopInfo = ref<string>('')
const saving = ref<boolean>(false)
const showLoadingOverlay = ref<boolean>(false)

// ==================== 计算属性 ====================

// 扁平化的壁纸列表
const wallpaperList = computed<WallpaperItem[]>(() => flattenWallpapers(wallpapers.value))

// 当前预览索引
const previewIndex = computed(() => {
  if (!previewCurrent.value) return -1
  return wallpaperList.value.findIndex((wp) => wp.id === previewCurrent.value?.id)
})

// 收藏夹映射
const wallpaperCollectionMap = computed(() => {
  const map = new Map<string, string[]>()
  for (const fav of favorites.value) {
    const ids = map.get(fav.wallpaperId)
    if (ids) {
      ids.push(fav.collectionId)
    } else {
      map.set(fav.wallpaperId, [fav.collectionId])
    }
  }
  return map
})

// 默认收藏夹 ID
const defaultCollectionId = computed(() => getDefault()?.id ?? null)

// ==================== 生命周期 ====================

onActivated(() => {
  document.addEventListener('click', dropdown.handleClickOutside)
  window.addEventListener('keydown', handleKeydown)
})

onDeactivated(() => {
  document.removeEventListener('click', dropdown.handleClickOutside)
  window.removeEventListener('keydown', handleKeydown)
})

// ==================== 监听器 ====================

// 页码变化时滚动
watch(
  () => currentPageData.value.currentPage,
  (newPage, oldPage) => {
    if (oldPage !== undefined && oldPage !== 0 && newPage !== oldPage) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }
)

// 收藏变化时更新壁纸状态
watch(
  () => favorites.value,
  (newFavorites) => {
    if (currentPageData.value.data.length === 0) return

    for (const item of currentPageData.value.data) {
      const favRecords = newFavorites.filter((f) => f.wallpaperId === item.id)
      let newStatus: 0 | 1 | 2 = 0

      if (favRecords.length > 0) {
        const defaultColId = defaultCollectionId.value
        const inDefault = defaultColId ? favRecords.some((f) => f.collectionId === defaultColId) : false
        newStatus = inDefault ? 1 : 2
      }

      if (item.is_favorite !== newStatus) {
        updateItemFavoriteStatus(item.id, newStatus)
      }
    }
  },
  { deep: true }
)

// ==================== 事件处理 ====================

/**
 * 分页导航
 */
const handleGoToPage = async (page: number): Promise<void> => {
  await goToPage(page)
}

/**
 * 键盘导航
 */
const handleKeydown = (event: KeyboardEvent): void => {
  if (previewVisible.value) return

  const { currentPage, totalPage } = currentPageData.value

  if (event.key === 'ArrowLeft' && currentPage > 1) {
    event.preventDefault()
    goToPage(currentPage - 1)
  } else if (event.key === 'ArrowRight' && currentPage < totalPage) {
    event.preventDefault()
    goToPage(currentPage + 1)
  }
}

/**
 * 搜索参数变更
 */
const handleChangeParams = (customParams: GetParams | null): void => {
  showLoadingOverlay.value = true
  fetchWallpapers(customParams).finally(() => {
    showLoadingOverlay.value = false
  })
}

/**
 * 保存搜索参数
 */
const saveParams = async (params: CustomParams): Promise<void> => {
  const success = await saveCustomParams(params)
  if (success) {
    showSuccess('参数已保存')
  }
}

/**
 * 批量下载
 */
const downloadSelected = async (): Promise<void> => {
  await selection.downloadSelected(wallpapers.value)
}

/**
 * 关闭搜索模态框
 */
const closeSearchModal = (): void => {
  searchBarRef.value?.closeModal()
}

/**
 * 打开预览
 */
const openPreview = (item: WallpaperItem): void => {
  openPreviewState(item)
}

/**
 * 设置壁纸
 */
const setBg = async (item: WallpaperItem): Promise<void> => {
  return setBgFromUrl(item)
}

/**
 * 下载壁纸
 */
const downloadImg = async (item: WallpaperItem): Promise<void> => {
  try {
    await wallpaperDownload.download(item)
    showSuccess('已添加到下载队列，请在下载中心查看进度')
  } catch (error: any) {
    console.error('添加下载任务失败:', error)
    showError('添加下载任务失败: ' + error.message)
  }
}

/**
 * 预览导航
 */
const handleNavigate = (direction: 'prev' | 'next'): void => {
  const newIndex = direction === 'prev' ? previewIndex.value - 1 : previewIndex.value + 1

  if (newIndex >= 0 && newIndex < wallpaperList.value.length) {
    const wallpaper = wallpaperList.value[newIndex]
    if (wallpaper) {
      openPreviewState(wallpaper)
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
 * 切换收藏状态
 */
const handleToggleFavorite = async (item: WallpaperItem): Promise<void> => {
  const defaultCollection = getDefault()
  if (!defaultCollection) {
    showWarning('请先设置默认收藏夹')
    return
  }

  if (isInCollection(item.id, defaultCollection.id)) {
    await removeFavorite(item.id, defaultCollection.id)
    updateItemFavoriteStatus(item.id, 0)
    showSuccess(`已从"${defaultCollection.name}"移除`)
  } else {
    await addFavorite(item.id, defaultCollection.id, item)
    updateItemFavoriteStatus(item.id, 1)
    showSuccess(`已添加到"${defaultCollection.name}"`)
  }
}

/**
 * 显示收藏下拉菜单
 */
const handleShowFavoriteDropdown = (item: WallpaperItem, event: MouseEvent): void => {
  dropdown.show(item, event)
}
</script>

<style scoped>
.online-wallpaper-page {
  min-height: calc(100vh - 60px);
  padding-bottom: 2em;
}

.error-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
  padding: 140px;
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
