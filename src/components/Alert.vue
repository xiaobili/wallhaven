<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <transition name="alert-fade">
    <div
      v-if="visible"
      :class="['alert', `alert-${type}`, `alert-position-${position}`]"
      role="alert"
    >
      <div class="alert-content">
        <i
          v-if="showIcon"
          :class="['alert-icon', iconClass]"
        />
        <span class="alert-message">{{ message }}</span>
      </div>
      <button
        v-if="closable"
        class="alert-close"
        aria-label="关闭"
        @click="handleClose"
      >
        <i class="fas fa-times" />
      </button>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'

interface Props {
  type?: 'success' | 'error' | 'warning' | 'info'
  message: string
  showIcon?: boolean
  closable?: boolean
  duration?: number
  position?:
    | 'top-center'
    | 'top-right'
    | 'top-left'
    | 'bottom-center'
    | 'bottom-right'
    | 'bottom-left'
}

const props = withDefaults(defineProps<Props>(), {
  type: 'info',
  showIcon: true,
  closable: true,
  duration: 0,
  position: 'top-center',
})

const emit = defineEmits<{
  close: []
}>()

const visible = ref(true)

// 根据类型返回对应的图标类名
const iconClass = computed(() => {
  const iconMap = {
    success: 'fas fa-check-circle',
    error: 'fas fa-times-circle',
    warning: 'fas fa-exclamation-triangle',
    info: 'fas fa-info-circle',
  }
  return iconMap[props.type]
})

// 关闭提示框
const handleClose = () => {
  visible.value = false
  emit('close')
}

// 自动关闭逻辑
watch(
  () => props.duration,
  (newDuration) => {
    if (newDuration && newDuration > 0) {
      setTimeout(() => {
        handleClose()
      }, newDuration)
    }
  },
  { immediate: true },
)

// 暴露方法给父组件
defineExpose({
  close: handleClose,
})
</script>

<style scoped>
@import '@/static/css/list.css';

.alert {
  position: fixed;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1em 2em;
  border-radius: 4px;
  text-shadow: 1px 1px 3px #000;
  box-shadow:
    0 4px 16px rgba(0, 0, 0, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  animation: alert-slide-in 0.3s ease;
  min-height: 3.5em;
  z-index: 9999;
  max-width: 600px;
  min-width: 300px;
}

.alert-content {
  display: flex;
  align-items: center;
  flex: 1;
  gap: 0.75em;
}

.alert-icon {
  font-size: 1.3em;
  flex-shrink: 0;
}

.alert-message {
  font-size: 1em;
  line-height: 1.5;
  word-break: break-word;
}

.alert-close {
  background: transparent;
  border: none;
  color: inherit;
  cursor: pointer;
  padding: 0.25em;
  margin-left: 1em;
  opacity: 0.6;
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
  font-size: 1.1em;
  flex-shrink: 0;
}

.alert-close:hover {
  opacity: 1;
  transform: scale(1.1);
}

.alert-close:active {
  transform: scale(0.95);
}

/* ===== 成功状态 ===== */
.alert-success {
  background: rgba(80, 160, 80, 0.95);
  border-left: 4px solid #4a4;
  color: #fff;
}

.alert-success .alert-icon {
  color: #cfc;
}

/* ===== 失败状态 ===== */
.alert-error {
  background: rgba(180, 60, 60, 0.95);
  border-left: 4px solid #c44;
  color: #fff;
}

.alert-error .alert-icon {
  color: #fcc;
}

/* ===== 警告状态 ===== */
.alert-warning {
  background: rgba(180, 140, 40, 0.95);
  border-left: 4px solid #ca4;
  color: #fff;
}

.alert-warning .alert-icon {
  color: #ffe6b3;
}

/* ===== 信息状态 ===== */
.alert-info {
  background: rgba(60, 120, 180, 0.95);
  border-left: 4px solid #48c;
  color: #fff;
}

.alert-info .alert-icon {
  color: #cce5ff;
}

/* ===== 位置样式 - 调整为在PageHeader下方，SideBar右侧 ===== */

/* 顶部居中 - PageHeader下方，SideBar右侧 (PageHeader高度40px + 10px间距，SideBar宽度180px) */
.alert-position-top-center {
  top: 50px;
  left: calc(180px + 50%);
  transform: translateX(-50%);
}

/* 顶部右侧 - PageHeader下方 */
.alert-position-top-right {
  top: 50px;
  right: 20px;
}

/* 顶部左侧 - PageHeader下方，SideBar右侧 */
.alert-position-top-left {
  top: 50px;
  left: 200px; /* SideBar宽度180px + 20px间距 */
}

/* 底部居中 */
.alert-position-bottom-center {
  bottom: 20px;
  left: calc(180px + 50%);
  transform: translateX(-50%);
}

/* 底部右侧 */
.alert-position-bottom-right {
  bottom: 20px;
  right: 20px;
}

/* 底部左侧 - SideBar右侧 */
.alert-position-bottom-left {
  bottom: 20px;
  left: 200px; /* SideBar宽度180px + 20px间距 */
}

/* ===== 淡入淡出动画 ===== */
.alert-fade-enter-active,
.alert-fade-leave-active {
  transition: all 0.3s ease;
}

.alert-fade-enter-from {
  opacity: 0;
  transform: translateY(-20px) translateX(-50%);
}

.alert-fade-leave-to {
  opacity: 0;
  transform: translateY(-20px) translateX(-50%);
}

/* 右侧位置的动画 */
.alert-position-top-right.alert-fade-enter-from,
.alert-position-bottom-right.alert-fade-enter-from {
  transform: translateX(100px);
}

.alert-position-top-right.alert-fade-leave-to,
.alert-position-bottom-right.alert-fade-leave-to {
  transform: translateX(100px);
}

/* 左侧位置的动画 */
.alert-position-top-left.alert-fade-enter-from,
.alert-position-bottom-left.alert-fade-enter-from {
  transform: translateX(-100px);
}

.alert-position-top-left.alert-fade-leave-to,
.alert-position-bottom-left.alert-fade-leave-to {
  transform: translateX(-100px);
}

/* ===== 滑入动画 ===== */
@keyframes alert-slide-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

/* ===== 响应式适配 ===== */
@media (max-width: 768px) {
  .alert {
    padding: 0.75em 1em;
    min-width: 280px;
    max-width: calc(100vw - 40px);
  }

  .alert-content {
    gap: 0.5em;
  }

  .alert-icon {
    font-size: 1.1em;
  }

  .alert-message {
    font-size: 0.95em;
  }

  .alert-close {
    margin-left: 0.5em;
    padding: 0.15em;
  }

  /* 移动端统一使用居中（不考虑侧边栏，因为移动端侧边栏可能隐藏） */
  .alert-position-top-center,
  .alert-position-top-right,
  .alert-position-top-left {
    left: 50%;
    right: auto;
    transform: translateX(-50%);
  }

  .alert-position-bottom-center,
  .alert-position-bottom-right,
  .alert-position-bottom-left {
    left: 50%;
    right: auto;
    bottom: 20px;
    top: auto;
    transform: translateX(-50%);
  }
}
</style>
