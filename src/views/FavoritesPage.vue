<template>
  <div class="favorites-page">
    <CollectionSidebar @select="handleCollectionSelect" />

    <div class="favorites-content">
      <div
        v-if="!selectedCollectionId"
        class="empty-content"
      >
        <i class="fas fa-heart" />
        <h3>我的收藏</h3>
        <p>从左侧选择一个收藏夹开始浏览</p>
      </div>

      <div
        v-else
        class="collection-content"
      >
        <div class="content-header">
          <h2>{{ selectedCollection?.name || '收藏夹' }}</h2>
          <span class="wallpaper-count">{{ filteredFavorites.length }} 张壁纸</span>
        </div>

        <div
          v-if="filteredFavorites.length === 0"
          class="empty-collection"
        >
          <i class="fas fa-images" />
          <p>这个收藏夹还没有壁纸</p>
          <p class="hint">在在线壁纸页面点击心形图标添加壁纸</p>
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

    <ImagePreview
      v-show="imgShow"
      :showing="imgShow"
      :img-info="imgInfo"
      :is-local="false"
      :wallpaper-list="favoriteWallpaperList"
      :current-index="previewIndex"
      :favorite-ids="favoriteIds.value"
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
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, shallowRef } from 'vue'
import CollectionSidebar from '@/components/favorites/CollectionSidebar.vue'
import FavoriteWallpaperCard from '@/components/favorites/FavoriteWallpaperCard.vue'
import ImagePreview from '@/components/ImagePreview.vue'
import Alert from '@/components/Alert.vue'
import { useCollections, useFavorites, useAlert, useDownload, useWallpaperSetter } from '@/composables'
import type { WallpaperItem, FavoriteItem } from '@/types'

// Composables
const { collections, load: loadCollections } = useCollections()
const { favorites, favoriteIds, load: loadFavorites, getCollectionsForWallpaper } = useFavorites()
const { alert, showSuccess, showWarning, hideAlert } = useAlert()
const { addTask, startDownload, isDownloading } = useDownload()
const { setWallpaper } = useWallpaperSetter()

// State
const selectedCollectionId = ref<string | null>(null)
const imgInfo = shallowRef<WallpaperItem | null>(null)
const imgShow = ref<boolean>(false)

// Computed
const selectedCollection = computed(() =>
  collections.value.find(c => c.id === selectedCollectionId.value)
)

const filteredFavorites = computed(() =>
  favorites.value.filter(f => f.collectionId === selectedCollectionId.value)
)

// Extract WallpaperItem[] for ImagePreview navigation
const favoriteWallpaperList = computed<WallpaperItem[]>(() =>
  filteredFavorites.value.map(f => f.wallpaperData)
)

// Current preview index for navigation
const previewIndex = computed(() => {
  if (!imgInfo.value) return -1
  return favoriteWallpaperList.value.findIndex(wp => wp.id === imgInfo.value?.id)
})

// Helper for card badge data
const getCollectionNamesForWallpaper = (wallpaperId: string): string[] => {
  return getCollectionsForWallpaper(wallpaperId)
}

// Event handlers
const handleCollectionSelect = (collectionId: string): void => {
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
  const newIndex = direction === 'prev'
    ? previewIndex.value - 1
    : previewIndex.value + 1

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
    wallpaperId: wallpaperData.id
  })

  await startDownload(taskId)
  showSuccess('已添加到下载队列')
}

const handleSetBg = async (wallpaperData: WallpaperItem): Promise<void> => {
  await setWallpaper(wallpaperData.path)
}

// Lifecycle
onMounted(async () => {
  await Promise.all([loadCollections(), loadFavorites()])
})
</script>

<style scoped>
.favorites-page {
  display: flex;
  min-height: calc(100vh - 40px);
  margin-top: 40px;
}

.favorites-content {
  flex: 1;
  padding: 1.5em;
  overflow-y: auto;
}

.empty-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #888;
  text-align: center;
}

.empty-content i {
  font-size: 4em;
  margin-bottom: 1em;
  opacity: 0.3;
}

.empty-content h3 {
  color: #8cc;
  margin: 0 0 0.5em;
}

.empty-content p {
  margin: 0;
  opacity: 0.7;
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
