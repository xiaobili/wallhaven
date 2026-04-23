import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'

// 延迟导入stores，减少启动时的模块加载
let wallpaperStore: any = null
let downloadStore: any = null

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

// 快速挂载应用，不等待异步操作
app.mount('#app')

// 异步初始化（在应用挂载后执行）
async function initializeApp() {
  // 动态导入stores
  const wallpaperModule = await import('./stores/wallpaper')
  const downloadModule = await import('./stores/modules/download')
  
  wallpaperStore = wallpaperModule.useWallpaperStore()
  downloadStore = downloadModule.useDownloadStore()
  
  // 从 electron-store 加载设置
  await wallpaperStore.loadSettings()
  
  // 从 electron-store 加载下载历史记录
  await downloadStore.loadFromStorage()
  
  console.log('[Main] 应用初始化完成，已从 electron-store 加载数据')
  
  // 如果在 Electron 环境中，注册下载进度监听器
  if (window.electronAPI) {
    try {
      // 注册下载进度监听器
      window.electronAPI.onDownloadProgress((data) => {
        console.log('[Main] 收到下载进度:', data)
        
        const { taskId, progress, offset, speed, state, filePath, error } = data
        
        if (error) {
          // 下载失败
          console.error('[Main] 下载失败:', error)
          const task = downloadStore.downloadingList.find((item: any) => item.id === taskId)
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
      console.warn('注册 Electron 监听器失败:', error)
    }
  }
}

// 非阻塞式初始化
initializeApp()
