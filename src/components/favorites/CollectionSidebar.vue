<template>
  <div class="collection-sidebar">
    <div class="sidebar-header">
      <h3>收藏夹</h3>
      <button
        class="create-btn"
        title="新建收藏夹"
        @click="showCreateModal = true"
      >
        <i class="fas fa-plus" />
      </button>
    </div>

    <div class="sidebar-content">
      <div
        v-if="loading"
        class="loading-state"
      >
        <i class="fas fa-spinner fa-spin" />
        <span>加载中...</span>
      </div>

      <div
        v-else-if="collections.length === 0"
        class="empty-state"
      >
        <i class="fas fa-folder-open" />
        <p>还没有收藏夹</p>
        <p class="hint">
          点击上方 + 按钮创建
        </p>
      </div>

      <div
        v-else
        class="collection-list"
      >
        <div
          class="collection-item all-favorites-item"
          :class="{ active: !selectedId }"
          @click="handleSelectAll"
        >
          <div class="collection-icon">
            <i class="fas fa-heart" />
          </div>
          <div class="collection-info">
            <span class="collection-name">全部收藏</span>
            <span class="collection-count">{{ uniqueWallpaperCount }} 张</span>
          </div>
        </div>
        <CollectionItem
          v-for="collection in collections"
          :key="collection.id"
          :collection="collection"
          :count="getCollectionCount(collection.id)"
          :is-active="selectedId === collection.id"
          @select="handleSelect"
          @rename="handleRename"
          @delete="handleDelete"
          @set-default="handleSetDefault"
        />
      </div>
    </div>

    <CreateCollectionModal
      :visible="showCreateModal"
      :existing-names="existingNames"
      @close="showCreateModal = false"
      @confirm="handleCreateConfirm"
    />

    <RenameCollectionModal
      :visible="showRenameModal"
      :current-name="renameTarget?.name || ''"
      :collection-id="renameTarget?.id || ''"
      :existing-names="existingNames"
      @close="handleRenameClose"
      @confirm="handleRenameConfirm"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import CollectionItem from './CollectionItem.vue'
import CreateCollectionModal from './CreateCollectionModal.vue'
import RenameCollectionModal from './RenameCollectionModal.vue'
import { useCollections, useFavorites, useAlert } from '@/composables'
import type { Collection } from '@/types'

const emit = defineEmits<{
  select: [collectionId: string | null]
}>()

const { collections, loading, load: loadCollections, create, rename, delete: deleteCollection, setDefault } = useCollections()
const { load: loadFavorites, uniqueWallpaperCount, getCollectionCount } = useFavorites()
const { showSuccess, showError } = useAlert()

const showCreateModal = ref(false)
const showRenameModal = ref(false)
const renameTarget = ref<Collection | null>(null)
const selectedId = ref<string | null>(null)

const existingNames = computed(() =>
  collections.value.map(c => c.name)
)

const handleSelectAll = () => {
  selectedId.value = null
  emit('select', null)
}

const handleSelect = (collection: Collection) => {
  selectedId.value = collection.id
  emit('select', collection.id)
}

const handleRename = (collection: Collection) => {
  renameTarget.value = collection
  showRenameModal.value = true
}

const handleRenameClose = () => {
  showRenameModal.value = false
  renameTarget.value = null
}

const handleDelete = async (collection: Collection) => {
  const confirmed = window.confirm(
    `确定要删除收藏夹"${collection.name}"吗？\n收藏的壁纸将从该收藏夹移除。`
  )
  if (!confirmed) return

  const success = await deleteCollection(collection.id)
  if (success) {
    showSuccess('收藏夹已删除')
    if (selectedId.value === collection.id) {
      selectedId.value = null
    }
  } else {
    showError('删除收藏夹失败')
  }
}

const handleSetDefault = async (collection: Collection) => {
  await setDefault(collection.id)
}

const handleCreateConfirm = async (name: string) => {
  const success = await create(name)
  if (success) {
    showSuccess('收藏夹创建成功')
    showCreateModal.value = false
  } else {
    showError('创建收藏夹失败')
  }
}

const handleRenameConfirm = async (id: string, name: string) => {
  const success = await rename(id, name)
  if (success) {
    showSuccess('收藏夹已重命名')
    showRenameModal.value = false
    renameTarget.value = null
  } else {
    showError('重命名失败')
  }
}

onMounted(async () => {
  // 同时加载收藏夹和收藏项数据
  await Promise.all([loadCollections(), loadFavorites()])
})
</script>

<style scoped>
.collection-sidebar {
  position: fixed;
  top: 40px;
  left: 180px;
  width: 200px;
  height: calc(100vh - 40px);
  background: #1a1a1a;
  border-right: 1px solid #333;
  display: flex;
  flex-direction: column;
  background: url('@/static/icons/bg-dark-grain.png') repeat;
}

.sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1em;
  border-bottom: 1px solid #333;
}

.sidebar-header h3 {
  color: #8cc;
  margin: 0;
  font-size: 1em;
}

.create-btn {
  background: transparent;
  border: 1px solid #444;
  color: #85aaaf;
  cursor: pointer;
  padding: 0.35em 0.5em;
  border-radius: 4px;
  transition: all 0.2s;
}

.create-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  border-color: #666;
}

.sidebar-content {
  flex: 1;
  overflow-y: auto;
  padding: 0.5em 0;
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2em;
  color: #888;
  text-align: center;
}

.empty-state i {
  font-size: 2em;
  margin-bottom: 0.5em;
  opacity: 0.5;
}

.empty-state p {
  margin: 0.25em 0;
}

.empty-state .hint {
  font-size: 0.85em;
  opacity: 0.7;
}

.collection-list {
  display: flex;
  flex-direction: column;
}

.all-favorites-item {
  display: flex;
  align-items: center;
  padding: 0.75em 1em;
  cursor: pointer;
  border-radius: 4px;
  transition: background-color 0.2s;
  position: relative;
}

.all-favorites-item:hover {
  background-color: rgba(255, 255, 255, 0.05);
}

.all-favorites-item.active {
  background-color: rgba(255, 255, 255, 0.1);
}

.all-favorites-item.active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 60%;
  background: linear-gradient(to bottom, #275660, #183640);
  border-radius: 0 2px 2px 0;
}

.all-favorites-item .collection-icon {
  width: 24px;
  text-align: center;
  color: #ff6b6b;
  margin-right: 0.75em;
}

.all-favorites-item .collection-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.all-favorites-item .collection-name {
  color: #ddd;
  font-size: 0.95em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.all-favorites-item .collection-count {
  color: #888;
  font-size: 0.8em;
  margin-top: 0.15em;
}
</style>
