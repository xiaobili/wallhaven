<template>
  <Teleport to="body">
    <Transition name="dropdown" appear>
      <div
        v-if="visible"
        class="collection-dropdown"
        :style="dropdownStyle"
        @click.stop
      >
        <!-- Collection list with checkboxes -->
        <div
          v-for="collection in collections"
          :key="collection.id"
          class="dropdown-item"
          :class="{ 'selected': isInCollection(collection.id) }"
          @click="toggleCollection(collection.id)"
        >
          <i
            v-if="isInCollection(collection.id)"
            class="fas fa-check"
          />
          <i
            v-else
            class="far fa-square"
          />
          <span>{{ collection.name }}</span>
          <i
            v-if="collection.isDefault"
            class="fas fa-star default-star"
            title="默认收藏夹"
          />
          <button
            v-if="isInCollection(collection.id) && !collection.isDefault"
            class="remove-btn"
            @click.stop="removeFromCollection(collection.id)"
          >
            <i class="fas fa-times" />
          </button>
        </div>
        <!-- Empty state -->
        <div
          v-if="collections.length === 0"
          class="dropdown-empty"
        >
          暂无收藏夹
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useFavorites, useCollections } from '@/composables'
import type { WallpaperItem } from '@/types'

interface Props {
  wallpaperId: string
  wallpaperData: WallpaperItem
  visible: boolean
  position: { x: number; y: number }
}

const props = defineProps<Props>()

defineEmits<{
  close: []
}>()

// Composables
const {
  favorites,
  add: addFavorite,
  remove: removeFavorite,
  load: loadFavorites
} = useFavorites()

const {
  collections,
  load: loadCollections
} = useCollections()

// Load data on mount
onMounted(async () => {
  await Promise.all([loadCollections(), loadFavorites()])
})

// Computed
const dropdownStyle = computed(() => ({
  position: 'fixed' as const,
  left: `${props.position.x}px`,
  top: `${props.position.y}px`,
  zIndex: 1000
}))

// Methods
const isInCollection = (collectionId: string): boolean => {
  return favorites.value.some(
    f => f.wallpaperId === props.wallpaperId && f.collectionId === collectionId
  )
}

const toggleCollection = async (collectionId: string): Promise<void> => {
  if (isInCollection(collectionId)) {
    // Already in collection - do nothing on click (use remove button)
  } else {
    await addFavorite(props.wallpaperId, collectionId, props.wallpaperData)
  }
}

const removeFromCollection = async (collectionId: string): Promise<void> => {
  await removeFavorite(props.wallpaperId, collectionId)
}
</script>

<style scoped>
.collection-dropdown {
  width: 180px;
  background: #2a2a2a;
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  overflow: hidden;
  transform-origin: top left;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  cursor: pointer;
  transition: background 0.2s;
  color: #fff;
  font-size: 14px;
}

.dropdown-item:hover {
  background: #3a3a3a;
}

.dropdown-item.selected {
  color: #667eea;
}

.default-star {
  color: #d4af37;
  font-size: 0.8em;
  margin-left: auto;
}

.default-star {
  color: #d4af37;
  font-size: 0.8em;
  margin-left: auto;
}

.dropdown-item i {
  width: 16px;
  text-align: center;
}

.dropdown-item span {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.remove-btn {
  background: none;
  border: none;
  color: #ff6b6b;
  cursor: pointer;
  padding: 2px 4px;
  opacity: 0;
  transition: opacity 0.2s;
}

.dropdown-item.selected:hover .remove-btn {
  opacity: 1;
}

.remove-btn:hover {
  color: #ff4757;
}

.dropdown-empty {
  padding: 12px;
  text-align: center;
  color: #888;
  font-size: 13px;
}

/* macOS-style dropdown animation */
.dropdown-enter-active,
.dropdown-appear-active {
  animation: dropdown-open 0.2s ease-out;
}

.dropdown-leave-active {
  animation: dropdown-close 0.15s ease-in;
}

@keyframes dropdown-open {
  from {
    opacity: 0;
    transform: scale(0.8) translateY(-8px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

@keyframes dropdown-close {
  from {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
  to {
    opacity: 0;
    transform: scale(0.8) translateY(-8px);
  }
}
</style>
