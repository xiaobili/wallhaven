import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import { useWallpaperStore } from './stores/wallpaper'
import { useDownloadStore } from './stores/modules/download'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

// 应用启动时加载保存的设置
const wallpaperStore = useWallpaperStore()
const downloadStore = useDownloadStore()

// 异步加载设置（支持 Electron 持久化存储）
async function initializeApp() {
  // 首先从 localStorage 加载
  wallpaperStore.loadSettings()
  
  // 加载下载历史记录
  downloadStore.loadFromStorage()
  
  // 如果在 Electron 环境中，尝试从 Electron 存储加载
  if (window.electronAPI) {
    try {
      const result = await window.electronAPI.loadSettings()
      if (result.success && result.settings) {
        // 使用 Electron 存储的设置覆盖 localStorage
        wallpaperStore.updateSettings(result.settings)
        console.log('已从 Electron 存储加载设置')
      }
      
      // 注册下载进度监听器
      window.electronAPI.onDownloadProgress((data) => {
        console.log('[Main] 收到下载进度:', data)
        
        const { taskId, progress, offset, speed, state, filePath, error } = data
        
        if (error) {
          // 下载失败
          console.error('[Main] 下载失败:', error)
          const task = downloadStore.downloadingList.find(item => item.id === taskId)
          if (task) {
            task.state = 'waiting'
            task.progress = 0
          }
        } else if (state === 'completed') {
          // 下载完成 - 先更新进度到100%，再标记为完成
          downloadStore.updateProgress(taskId, 100, offset, 0, filePath)
          console.log('[Main] 下载完成:', filePath)
        } else {
          // 更新进度（downloading, paused, waiting 等状态）
          downloadStore.updateProgress(taskId, progress, offset, speed)
        }
      })
      
      console.log('[Main] 下载进度监听器已注册')
    } catch (error) {
      console.warn('从 Electron 加载设置失败，使用 localStorage:', error)
    }
  }
  
  // 挂载应用
  app.mount('#app')
}

initializeApp()
