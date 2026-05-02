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
      @toggle-favorite="() => {}"
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
            <span class="wallpaper-count">{{ filteredFavorites.length }} 张壁纸</span>
          </div>

          <div
            v-if="filteredFavorites.length === 0"
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
              v-for="favorite in filteredFavorites"
              :key="`${favorite.wallpaperId}-${favorite.collectionId}`"
              :favorite="favorite"
              :collection-names="getCollectionNamesForWallpaper(favorite.wallpaperId)"
              @preview="handlePreview"
              @download="handleDownload"
              @set-bg="handleSetBg"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, shallowRef, onActivated } from 'vue'
import CollectionSidebar from '@/components/favorites/CollectionSidebar.vue'
import FavoriteWallpaperCard from '@/components/favorites/FavoriteWallpaperCard.vue'
import ImagePreview from '@/components/ImagePreview.vue'
import Alert from '@/components/Alert.vue'
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
const { favorites, favoriteIds, load: loadFavorites, getCollectionsForWallpaper } = useFavorites()
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

const filteredFavorites = computed(() => {
  if (!selectedCollectionId.value) {
    // "All favorites" mode - deduplicate by wallpaperId, sort newest first
    const seen = new Set<string>()
    return favorites.value
      .slice()
      .sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime())
      .filter((f) => {
        if (seen.has(f.wallpaperId)) return false
        seen.add(f.wallpaperId)
        return true
      })
  }
  return favorites.value
    .filter((f) => f.collectionId === selectedCollectionId.value)
    .sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime())
})

// Extract WallpaperItem[] for ImagePreview navigation
const favoriteWallpaperList = computed<WallpaperItem[]>(() =>
  filteredFavorites.value.map((f) => f.wallpaperData),
)

// Current preview index for navigation
const previewIndex = computed(() => {
  if (!imgInfo.value) return -1
  return favoriteWallpaperList.value.findIndex((wp) => wp.id === imgInfo.value?.id)
})

// Helper for card badge data
const getCollectionNamesForWallpaper = (wallpaperId: string): string[] => {
  return getCollectionsForWallpaper(wallpaperId)
}

// Event handlers
const handleCollectionSelect = (collectionId: string | null): void => {
  selectedCollectionId.value = collectionId
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


// Lifecycle
onActivated(async () => {
  await Promise.all([loadCollections(), loadFavorites()])
})
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
