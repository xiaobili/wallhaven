<template>
  <header id="header">
    <label>{{ title }}</label>
    <div class="win-btn-wrap">
      <span class="win-btn min-btn" @click="minimize" title="最小化">
        <i class="fas fw fa-window-minimize"></i>
      </span>
      <span class="win-btn max-btn" @click="maximize" :title="isMaximized ? '还原' : '最大化'">
        <i :class="isMaximized ? 'fas fw fa-window-restore' : 'fas fw fa-window-maximize'"></i>
      </span>
      <span class="win-btn close-btn" @click="close" title="关闭">
        <i class="fas fw fa-window-close"></i>
      </span>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

interface Props {
  title: string
}

const props = defineProps<Props>()

// 窗口最大化状态
const isMaximized = ref(false)

// 检查窗口是否最大化
const checkMaximizedState = async (): Promise<void> => {
  // @ts-ignore
  if (window.electronAPI) {
    try {
      // @ts-ignore
      isMaximized.value = await window.electronAPI.isMaximized()
    } catch (error) {
      console.error('检查窗口状态失败:', error)
    }
  }
}

const minimize = async (): Promise<void> => {
  console.log("最小化")
  // @ts-ignore
  if (window.electronAPI) {
    try {
      // @ts-ignore
      await window.electronAPI.minimizeWindow()
    } catch (error) {
      console.error('最小化窗口失败:', error)
    }
  }
}

const maximize = async (): Promise<void> => {
  console.log("最大化/还原")
  // @ts-ignore
  if (window.electronAPI) {
    try {
      // @ts-ignore
      await window.electronAPI.maximizeWindow()
      // 切换后更新状态
      isMaximized.value = !isMaximized.value
    } catch (error) {
      console.error('最大化窗口失败:', error)
    }
  }
}

const close = async (): Promise<void> => {
  console.log("关闭")
  // @ts-ignore
  if (window.electronAPI) {
    try {
      // @ts-ignore
      await window.electronAPI.closeWindow()
    } catch (error) {
      console.error('关闭窗口失败:', error)
    }
  }
}

// 组件挂载时检查窗口状态
onMounted(() => {
  checkMaximizedState()
})
</script>

<style scoped>

.win-btn-wrap{
  height: 40px;
  display: inline-block;
  position: fixed;
  z-index: 999;
  right: 10px;
}

.win-btn{
  -webkit-app-region: no-drag;
  display: inline-block;
  margin: 10px 15px 0 15px;
  cursor: pointer;
  transition: all 0.2s ease;
  opacity: 0.7;
}

.win-btn:hover {
  opacity: 1;
  transform: scale(1.1);
}

.win-btn:active {
  transform: scale(0.95);
}

.close-btn:hover {
  color: #ff5f56;
}

.min-btn{
  margin-top: 2px;
}

#header {
  -webkit-app-region: drag;
  cursor: move !important;
  position: fixed;
  top: 0;
  height: 40px;
  width: 100%;
  min-width: 640px;
  z-index: 200;
  user-select: none; /* 防止文本选择 */
}

@media (max-width: 639px) {
  #header {
    position: absolute;
    min-width: 800px
  }
}

#header {
  color: #FFF;
  justify-content: center;
  -ms-flex-align: center;
  align-items: center;
  display: -ms-flexbox;
  display: flex;
  -ms-flex-align: center;
  align-items: center;
  font-size: 1.2em;
  white-space: nowrap;
  background-color: rgb(58 56 56 / 27%);
  background-image: linear-gradient(to bottom, #787a7c4f 0, #3f414247 100%);
  text-shadow: 1px 1px 3px rgba(0, 0, 0, .75);
  box-shadow: inset 0 0 0 1px rgba(31, 31, 31, .66), 0 0 0px rgba(0, 0, 0, 0), 0 0 10px rgba(0, 0, 0, .75)
}

#header label {
  margin-right: 230px;
}
</style>