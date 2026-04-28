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
          <!-- WallpaperGrid will be added in Phase 21 -->
          <div
            v-for="favorite in filteredFavorites"
            :key="favorite.wallpaperId"
            class="favorite-item"
          >
            <img
              :src="favorite.wallpaperData.thumbs?.small || favorite.wallpaperData.path"
              :alt="favorite.wallpaperId"
            >
          </div>
        </div>
      </div>
    </div>

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
import { ref, computed, onMounted } from 'vue'
import CollectionSidebar from '@/components/favorites/CollectionSidebar.vue'
import Alert from '@/components/Alert.vue'
import { useCollections, useFavorites, useAlert } from '@/composables'

const { collections, load: loadCollections } = useCollections()
const { favorites, load: loadFavorites } = useFavorites()
const { alert, showSuccess, showError, hideAlert } = useAlert()

const selectedCollectionId = ref<string | null>(null)

const selectedCollection = computed(() =>
  collections.value.find(c => c.id === selectedCollectionId.value)
)

const filteredFavorites = computed(() =>
  favorites.value.filter(f => f.collectionId === selectedCollectionId.value)
)

const handleCollectionSelect = (collectionId: string) => {
  selectedCollectionId.value = collectionId
}

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
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1em;
}

.favorite-item {
  aspect-ratio: 16 / 10;
  background: #222;
  border-radius: 4px;
  overflow: hidden;
}

.favorite-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
</style>
