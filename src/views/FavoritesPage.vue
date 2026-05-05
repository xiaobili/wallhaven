<template>
  <div>
    <!-- ImagePreview 放在顶层，确保 position: fixed 正确计算 -->
    <ImagePreview
      v-show="imgShow"
      :showing="imgShow"
      :img-info="imgInfo"
      :is-local="false"
      :wallpaper-list="favoriteWallpaperList"
      :current-index="previewIndex"
      :favorite-ids="favoriteIds"
      @download-img="handleDownload"
      @set-bg="handleSetBg"
      @close="closePreview"
      @navigate="handleNavigate"
      @toggle-favorite="handleToggleFavorite"
    />

    <Alert
      v-if="alert.visible"
      :type="alert.type"
      :message="alert.message"
      :duration="alert.duration"
      @close="hideAlert"
    />

    <div class="favorites-page">
      <CollectionSidebar @select="handleCollectionSelect" />

      <div class="favorites-content">
        <div class="collection-content">
          <div class="content-header">
            <h2>{{ selectedCollection?.name || '全部收藏' }}</h2>
            <span class="wallpaper-count">{{ totalCount }} 张壁纸</span>
          </div>

          <div
            v-if="currentPageData.data.length === 0 && !loading"
            class="empty-collection"
          >
            <i class="fas fa-images" />
            <p v-if="!selectedCollectionId">
              还没有收藏任何壁纸
            </p>
            <p v-else>
              这个收藏夹还没有壁纸
            </p>
            <p class="hint">
              去在线壁纸页面发现喜欢的壁纸吧
            </p>
          </div>

          <div
            v-else
            class="favorites-grid"
          >
            <FavoriteWallpaperCard
              v-for="wallpaper in currentPageData.data"
              :key="wallpaper.id"
              :wallpaper="wallpaper"
              :collection-names="getCollectionNamesForWallpaper(wallpaper.id)"
              @preview="handlePreview"
              @download="handleDownload"
              @set-bg="handleSetBg"
              @unfavorite="handleCardUnfavorite"
            />
          </div>

          <!-- Pagination bar -->
          <PaginationBar
            v-if="currentPageData.totalPage > 0"
            :current-page="currentPageData.currentPage"
            :total-pages="currentPageData.totalPage"
            :total-count="totalCount"
            :loading="loading"
            @go-to-page="handleGoToPage"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, shallowRef, onActivated, onDeactivated, watch } from 'vue'
import CollectionSidebar from '@/components/favorites/CollectionSidebar.vue'
import FavoriteWallpaperCard from '@/components/favorites/FavoriteWallpaperCard.vue'
import ImagePreview from '@/components/ImagePreview.vue'
import Alert from '@/components/Alert.vue'
import PaginationBar from '@/components/PaginationBar.vue'
import {
  useCollections,
  useFavorites,
  useAlert,
  useDownload,
  useWallpaperSetter,
} from '@/composables'
import type { WallpaperItem } from '@/types'

defineOptions({ name: 'FavoritesPage' })

// Composables
const { collections, load: loadCollections } = useCollections()
const {
  favorites,
  favoriteIds,
  currentPageData,
  totalCount,
  loading,
  goToPage,
  refresh,
  loadCounts,
  getCollectionsForWallpaper,
  remove,
} = useFavorites()
const { alert, showSuccess, showWarning, hideAlert } = useAlert()
const { addTask, startDownload, isDownloading } = useDownload()
const { setBgFromUrl } = useWallpaperSetter()

// State
const selectedCollectionId = ref<string | null>(null)
const imgInfo = shallowRef<WallpaperItem | null>(null)
const imgShow = ref<boolean>(false)

// Computed
const selectedCollection = computed(() => {
  if (!selectedCollectionId.value) return null
  return collections.value.find((c) => c.id === selectedCollectionId.value)
})

// Extract WallpaperItem[] from current page data for display and ImagePreview navigation
const favoriteWallpaperList = computed<WallpaperItem[]>(() =>
  currentPageData.value.data,
)

// Current preview index for navigation
const previewIndex = computed(() => {
  if (!imgInfo.value) return -1
  return favoriteWallpaperList.value.findIndex((wp) => wp.id === imgInfo.value?.id)
})

// Shared unfavorite logic used by both card badge and ImagePreview handlers
const unfavoriteWallpaper = async (wallpaperId: string): Promise<void> => {
  if (selectedCollectionId.value) {
    // Specific collection view — remove from this collection only
    await remove(wallpaperId, selectedCollectionId.value)
  } else {
    // "All favorites" view — remove from ALL collections
    // Collect all collection IDs first (snapshot) to avoid stale iteration
    const collectionIds = favorites.value
      .filter((f) => f.wallpaperId === wallpaperId)
      .map((f) => f.collectionId)
    for (const cid of collectionIds) {
      await remove(wallpaperId, cid)
    }
  }
}

// Helper for card badge data
const getCollectionNamesForWallpaper = (wallpaperId: string): string[] => {
  return getCollectionsForWallpaper(wallpaperId)
}

// Event handlers
const handleCollectionSelect = async (collectionId: string | null): Promise<void> => {
  selectedCollectionId.value = collectionId
  // Jump to page 1 with collection filter
  await goToPage(1, collectionId ?? undefined)
}

const handleCardUnfavorite = async (wallpaperId: string): Promise<void> => {
  await unfavoriteWallpaper(wallpaperId)

  // Edge case: if current page is empty and it's the last page, go to previous page
  const currentPage = currentPageData.value.currentPage
  const totalPage = currentPageData.value.totalPage

  if (currentPage > 1 && currentPage >= totalPage) {
    // Current page might be empty (last page), go to previous page
    await goToPage(currentPage - 1, selectedCollectionId.value ?? undefined)
  } else {
    // Otherwise refresh current page
    await refresh()
  }
}

const handleToggleFavorite = (item: WallpaperItem): void => {
  // In FavoritesPage, heart click ONLY unfavorites (no toggle-to-add)
  void unfavoriteWallpaper(item.id)
}

const handlePreview = (wallpaperData: WallpaperItem): void => {
  imgInfo.value = wallpaperData
  imgShow.value = true
}

const closePreview = (): void => {
  imgShow.value = false
  imgInfo.value = null
}

const handleNavigate = (direction: 'prev' | 'next'): void => {
  const newIndex = direction === 'prev' ? previewIndex.value - 1 : previewIndex.value + 1

  if (newIndex >= 0 && newIndex < favoriteWallpaperList.value.length) {
    const wallpaper = favoriteWallpaperList.value[newIndex]
    if (wallpaper) {
      handlePreview(wallpaper)
    }
  }
}

const handleDownload = async (wallpaperData: WallpaperItem): Promise<void> => {
  // Check if already downloading
  if (isDownloading(wallpaperData.id)) {
    showWarning('该壁纸已在下载队列中')
    return
  }

  // Generate filename with extension
  let ext = '.jpg'
  if (wallpaperData.path) {
    const match = wallpaperData.path.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/i)
    if (match) {
      ext = match[0]
    }
  }
  const filename = `wallhaven-${wallpaperData.id}${ext}`

  // Create and start download task
  const taskId = addTask({
    url: wallpaperData.path,
    filename,
    small: wallpaperData.thumbs?.small || '',
    resolution: wallpaperData.resolution,
    size: Number(wallpaperData.file_size) || 0,
    wallpaperId: wallpaperData.id,
  })

  await startDownload(taskId)
  showSuccess('已添加到下载队列')
}

const handleSetBg = (imgItem: WallpaperItem): Promise<void> => {
  return setBgFromUrl(imgItem)
}

/**
 * Pagination navigation handler
 */
const handleGoToPage = async (page: number): Promise<void> => {
  await goToPage(page, selectedCollectionId.value ?? undefined)
}

// Lifecycle
onActivated(async () => {
  await Promise.all([
    loadCollections(),
    goToPage(1, selectedCollectionId.value ?? undefined),
    loadCounts(),
  ])
})

// Keyboard navigation handler (mutually exclusive with ImagePreview)
const handleKeydown = (event: KeyboardEvent): void => {
  // Only respond when ImagePreview is closed
  if (imgShow.value) return

  const { currentPage, totalPage } = currentPageData.value

  // Boundary check + navigation
  if (event.key === 'ArrowLeft' && currentPage > 1) {
    event.preventDefault()
    goToPage(currentPage - 1, selectedCollectionId.value ?? undefined)
  } else if (event.key === 'ArrowRight' && currentPage < totalPage) {
    event.preventDefault()
    goToPage(currentPage + 1, selectedCollectionId.value ?? undefined)
  }
}

onActivated(() => {
  window.addEventListener('keydown', handleKeydown)
})

onDeactivated(() => {
  window.removeEventListener('keydown', handleKeydown)
})

// Watch page change, trigger scroll
watch(
  () => currentPageData.value.currentPage,
  (newPage, oldPage) => {
    // Only scroll when page actually changes (exclude initialization)
    if (oldPage !== undefined && oldPage !== 0 && newPage !== oldPage) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }
)
</script>

<style scoped>
.favorites-page {
  min-height: calc(100vh - 40px);
  padding: 40px;
}

.favorites-content {
  flex: 1;
  margin-left: 200px;
  padding: 1.5em;
  overflow-y: auto;
}

.content-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5em;
  padding-bottom: 0.75em;
  border-bottom: 1px solid #333;
}

.content-header h2 {
  color: #8cc;
  margin: 0;
}

.wallpaper-count {
  color: #888;
  font-size: 0.9em;
}

.empty-collection {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4em;
  color: #888;
  text-align: center;
}

.empty-collection i {
  font-size: 3em;
  margin-bottom: 1em;
  opacity: 0.3;
}

.empty-collection p {
  margin: 0.25em 0;
}

.empty-collection .hint {
  font-size: 0.85em;
  opacity: 0.7;
}

.favorites-grid {
  text-align: center;
}
</style>
