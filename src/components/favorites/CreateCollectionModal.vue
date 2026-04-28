<template>
  <Teleport to="body">
    <transition name="modal-fade">
      <div
        v-if="visible"
        class="modal-overlay"
        @click.self="handleCancel"
      >
        <div class="modal-container">
          <div class="modal-header">
            <h3>新建收藏夹</h3>
            <button
              class="modal-close"
              @click="handleCancel"
            >
              <i class="fas fa-times" />
            </button>
          </div>
          <div class="modal-body">
            <label for="collection-name">收藏夹名称</label>
            <input
              id="collection-name"
              v-model="collectionName"
              type="text"
              placeholder="请输入收藏夹名称"
              maxlength="20"
              @keyup.enter="handleConfirm"
            >
            <p
              v-if="errorMessage"
              class="error-message"
            >
              {{ errorMessage }}
            </p>
          </div>
          <div class="modal-footer">
            <button
              class="btn btn-cancel"
              @click="handleCancel"
            >
              取消
            </button>
            <button
              class="btn btn-confirm"
              :disabled="!isValid"
              @click="handleConfirm"
            >
              创建
            </button>
          </div>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'

interface Props {
  visible: boolean
  existingNames?: string[]
}

const props = withDefaults(defineProps<Props>(), {
  visible: false,
  existingNames: () => []
})

const emit = defineEmits<{
  close: []
  confirm: [name: string]
}>()

const collectionName = ref('')
const errorMessage = ref('')

// Validate input
const isValid = computed(() => {
  const name = collectionName.value.trim()
  return name.length > 0 && name.length <= 20
})

// Check for duplicate names
watch(collectionName, (newValue) => {
  const name = newValue.trim()
  if (name.length === 0) {
    errorMessage.value = ''
  } else if (props.existingNames.includes(name)) {
    errorMessage.value = '收藏夹名称已存在'
  } else if (name.length > 20) {
    errorMessage.value = '名称不能超过20个字符'
  } else {
    errorMessage.value = ''
  }
})

const handleCancel = () => {
  collectionName.value = ''
  errorMessage.value = ''
  emit('close')
}

const handleConfirm = () => {
  const name = collectionName.value.trim()
  if (!isValid.value || errorMessage.value) return
  emit('confirm', name)
  collectionName.value = ''
  errorMessage.value = ''
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.modal-container {
  background: #1a1a1a;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
  width: 400px;
  max-width: 90vw;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1em 1.5em;
  border-bottom: 1px solid #333;
}

.modal-header h3 {
  color: #8cc;
  margin: 0;
  font-size: 1.2em;
}

.modal-close {
  background: transparent;
  border: none;
  color: #888;
  cursor: pointer;
  font-size: 1.2em;
  padding: 0.25em;
  transition: color 0.2s;
}

.modal-close:hover {
  color: #fff;
}

.modal-body {
  padding: 1.5em;
}

.modal-body label {
  display: block;
  color: #85aaaf;
  margin-bottom: 0.5em;
  font-size: 0.95em;
}

.modal-body input {
  width: 100%;
  padding: 0.75em;
  background: #313131;
  border: 1px solid #444;
  border-radius: 4px;
  color: #ddd;
  font-size: 1em;
  box-sizing: border-box;
}

.modal-body input:focus {
  outline: none;
  border-color: #666;
  background: #3d3d3d;
}

.error-message {
  color: #ff6b6b;
  font-size: 0.85em;
  margin-top: 0.5em;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75em;
  padding: 1em 1.5em;
  border-top: 1px solid #333;
}

.btn {
  padding: 0.5em 1.25em;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.95em;
  transition: all 0.2s;
}

.btn-cancel {
  background: #313131;
  border: 1px solid #444;
  color: #aaa;
}

.btn-cancel:hover {
  background: #3d3d3d;
  color: #fff;
}

.btn-confirm {
  background: linear-gradient(to bottom, #275660 0, #183640 100%);
  border: none;
  color: #fff;
}

.btn-confirm:hover:not(:disabled) {
  background: linear-gradient(to bottom, #2a6a75 0, #1a4a55 100%);
}

.btn-confirm:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Transition */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.3s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}
</style>
