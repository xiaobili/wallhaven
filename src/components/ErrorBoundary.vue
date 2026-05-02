<template>
  <slot v-if="!error" />
  <div
    v-else
    class="error-boundary"
  >
    <div class="error-boundary-content">
      <i class="fas fa-exclamation-triangle error-boundary-icon" />
      <h3>组件错误</h3>
      <p>发生了意外错误，请重试</p>
      <p class="error-detail">
        {{ errorInfo.message }}
      </p>
      <button
        class="retry-button"
        @click="resetError"
      >
        <i class="fas fa-redo" /> 重试
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onErrorCaptured, type Ref } from 'vue'

interface ErrorInfo {
  message: string
  component: string | null
}

const error: Ref<Error | null> = ref(null)
const errorInfo: Ref<ErrorInfo> = ref({ message: '', component: null })

onErrorCaptured((err, instance, info) => {
  error.value = err
  errorInfo.value = {
    message: err.message,
    component: instance?.$options?.name || null,
  }
  console.error('[ErrorBoundary] Captured error:', err, info)
  return false // Prevent error from propagating
})

const resetError = () => {
  error.value = null
  errorInfo.value = { message: '', component: null }
}
</script>

<style scoped>
.error-boundary {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
  padding: 20px;
}

.error-boundary-content {
  text-align: center;
  padding: 40px;
  background: #2a2a2a;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
  max-width: 500px;
}

.error-boundary-icon {
  font-size: 48px;
  color: #ff6b6b;
  margin-bottom: 20px;
}

.error-boundary-content h3 {
  color: #fff;
  margin-bottom: 15px;
}

.error-boundary-content p {
  color: #aaa;
  margin-bottom: 15px;
}

.error-detail {
  font-family: monospace;
  font-size: 0.9em;
  color: #ff6b6b;
  background: rgba(255, 107, 107, 0.1);
  padding: 8px 12px;
  border-radius: 4px;
  word-break: break-word;
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
