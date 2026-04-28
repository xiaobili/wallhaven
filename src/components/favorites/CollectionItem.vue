<template>
  <div
    class="collection-item"
    :class="{ active: isActive, 'is-default': collection.isDefault }"
    @click="handleSelect"
    @mouseenter="showActions = true"
    @mouseleave="showActions = false"
  >
    <div class="collection-icon">
      <i
        v-if="collection.isDefault"
        class="fas fa-star"
        title="默认收藏夹"
      />
      <i
        v-else
        class="fas fa-folder"
      />
    </div>
    <div class="collection-info">
      <span class="collection-name">
        {{ collection.name }}
        <span v-if="collection.isDefault" class="default-badge">默认</span>
      </span>
      <span class="collection-count">{{ count }} 张</span>
    </div>
    <div
      v-show="showActions"
      class="collection-actions"
    >
      <button
        v-if="!collection.isDefault"
        class="action-btn set-default-btn"
        title="设为默认"
        @click.stop="handleSetDefault"
      >
        <i class="fas fa-star" />
      </button>
      <button
        class="action-btn"
        title="重命名"
        @click.stop="handleRename"
      >
        <i class="fas fa-pen" />
      </button>
      <button
        v-if="!collection.isDefault"
        class="action-btn delete-btn"
        title="删除"
        @click.stop="handleDelete"
      >
        <i class="fas fa-trash" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { Collection } from '@/types'

interface Props {
  collection: Collection
  count: number
  isActive?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  count: 0,
  isActive: false
})

const emit = defineEmits<{
  select: [collection: Collection]
  rename: [collection: Collection]
  delete: [collection: Collection]
  setDefault: [collection: Collection]
}>()

const showActions = ref(false)

const handleSelect = () => {
  emit('select', props.collection)
}

const handleRename = () => {
  emit('rename', props.collection)
}

const handleDelete = () => {
  emit('delete', props.collection)
}

const handleSetDefault = () => {
  emit('setDefault', props.collection)
}
</script>

<style scoped>
.collection-item {
  display: flex;
  align-items: center;
  padding: 0.75em 1em;
  cursor: pointer;
  border-radius: 4px;
  transition: background-color 0.2s;
  position: relative;
}

.collection-item:hover {
  background-color: rgba(255, 255, 255, 0.05);
}

.collection-item.active {
  background-color: rgba(255, 255, 255, 0.1);
}

.collection-item.active::before {
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

.collection-icon {
  width: 24px;
  text-align: center;
  color: #85aaaf;
  margin-right: 0.75em;
}

.collection-item.is-default .collection-icon {
  color: #d4af37;
}

.collection-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.collection-name {
  color: #ddd;
  font-size: 0.95em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.collection-count {
  color: #888;
  font-size: 0.8em;
  margin-top: 0.15em;
}

.default-badge {
  display: inline-block;
  font-size: 0.7em;
  color: #1a1a1a;
  background: linear-gradient(135deg, #d4af37 0%, #f4d03f 100%);
  padding: 0.1em 0.4em;
  border-radius: 3px;
  margin-left: 0.5em;
  vertical-align: middle;
  font-weight: 500;
}

.collection-actions {
  display: flex;
  gap: 0.25em;
  opacity: 0;
  transition: opacity 0.2s;
}

.collection-item:hover .collection-actions {
  opacity: 1;
}

.action-btn {
  background: transparent;
  border: none;
  color: #888;
  cursor: pointer;
  padding: 0.35em;
  border-radius: 3px;
  transition: all 0.2s;
  font-size: 0.85em;
}

.action-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.delete-btn:hover {
  color: #ff6b6b;
}

.set-default-btn:hover {
  color: #d4af37;
}
</style>
