<template>
  <figure
    class="thumb"
    style="width:300px;height:200px"
  >
    <!-- Collection badge - top-left -->
    <div
      class="favorite-badge"
      :title="collectionNames.join(', ')"
    >
      <i class="fas fa-heart" />
      <span
        v-if="collectionCount > 1"
        class="badge-count"
      >{{ collectionCount }}</span>
    </div>

    <!-- Thumbnail -->
    <img
      :src="thumbnailSrc"
      :alt="favorite.wallpaperId"
      loading="lazy"
      decoding="async"
    >
    <a
      class="preview"
      @click.prevent="emit('preview', favorite.wallpaperData)"
    />

    <!-- Bottom info bar -->
    <figcaption class="thumb-info">
      <span class="wall-res">{{ formatResolution(favorite.wallpaperData.resolution) }}</span>
      <a
        class="wall-favs"
        title="设为壁纸"
        @click="emit('set-bg', favorite.wallpaperData)"
      >
        <i class="fas fa-fw fa-repeat-alt" />
      </a>
      <a
        class="thumb-tags-toggle tagged"
        title="下载"
        @click="emit('download', favorite.wallpaperData)"
      >
        <i class="fas fa-fw fa-download" />
      </a>
    </figcaption>
  </figure>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { formatResolution } from '@/utils/helpers'
import type { FavoriteItem } from '@/types'

interface Props {
  favorite: FavoriteItem
  collectionNames: string[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'preview': [wallpaperData: FavoriteItem['wallpaperData']]
  'download': [wallpaperData: FavoriteItem['wallpaperData']]
  'set-bg': [wallpaperData: FavoriteItem['wallpaperData']]
}>()

// Derived values
const collectionCount = computed(() => props.collectionNames.length)

const thumbnailSrc = computed(() => {
  return props.favorite.wallpaperData.thumbs?.small || props.favorite.wallpaperData.path
})
</script>

<style scoped>
/* Card container - matches list.css .thumb pattern */
.thumb {
  position: relative;
  display: inline-block;
  margin: 5px 5px 0;
  vertical-align: bottom;
  text-align: center;
  white-space: normal;
  background-color: #222;
  box-shadow: 0 0 4px rgba(0, 0, 0, 0.8);
  border-radius: 3px;
}

/* Image styling */
.thumb img {
  z-index: 90;
  position: absolute;
  display: block;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 3px;
}

/* Preview overlay - clickable area */
.thumb .preview {
  z-index: 110;
  position: absolute;
  display: block;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  cursor: pointer;
}

/* Bottom info bar */
.thumb > .thumb-info {
  position: absolute;
  z-index: 120;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 0 0.5em;
  line-height: 2em;
  overflow: hidden;
  max-height: 0;
  visibility: hidden;
  opacity: 0;
  transition:
    0.25s 50ms visibility,
    0.25s 50ms opacity,
    0.5s 50ms max-height;
  color: #fff;
  text-shadow: 1px 1px 1px rgba(0, 0, 0, 0.75);
  background-color: rgba(0, 0, 0, 0.165);
  background-image: linear-gradient(to bottom, rgba(0, 0, 0, 0.03) 0, rgba(0, 0, 0, 0.3) 100%);
}

.thumb:hover > .thumb-info {
  max-height: 2.5em;
  visibility: visible;
  opacity: 1;
}

/* Resolution text */
.thumb > .thumb-info > .wall-res {
  font-style: italic;
}

/* Action buttons */
.thumb > .thumb-info > .thumb-tags-toggle,
.thumb > .thumb-info > .wall-favs {
  position: absolute;
  top: 0;
  margin: 0 0.5em;
  cursor: pointer;
}

.thumb > .thumb-info > .wall-favs {
  left: 0;
}

.thumb > .thumb-info > .thumb-tags-toggle {
  right: 0;
}

.thumb > .thumb-info > .tagged {
  color: #5ab86c;
}

/* Collection badge - top-left */
.favorite-badge {
  position: absolute;
  top: 4px;
  left: 4px;
  z-index: 130;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 6px;
  background: rgba(0, 0, 0, 0.6);
  border-radius: 4px;
  cursor: default;
}

.favorite-badge i {
  color: #ff6b6b;
  font-size: 12px;
}

.badge-count {
  background: rgba(255, 107, 107, 0.9);
  color: #fff;
  font-size: 10px;
  font-weight: bold;
  padding: 0 4px;
  border-radius: 8px;
  min-width: 16px;
  text-align: center;
}
</style>
