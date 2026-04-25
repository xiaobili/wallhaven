import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import { AppError } from './errors'
import { downloadService } from '@/services'

// 延迟导入stores，减少启动时的模块加载
let wallpaperStore: any = null
let downloadStore: any = null

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

// ==================== 全局错误处理器 ====================

/**
 * Vue 错误处理器
 * 捕获组件渲染和生命周期钩子中的错误
 */
app.config.errorHandler = (err, instance, info) => {
  console.error('[Vue Error]', err)
  console.error('[Component Info]', info)

  if (err instanceof AppError) {
    console.error('[Error Code]', err.code)
    if (err.context) {
      console.error('[Error Context]', err.context)
    }
  }

  // 注意：不在此处显示 Alert，因为应用可能未完全初始化
  // 组件级别的错误应由组件自行处理
}

/**
 * 未处理的 Promise rejection
 * 捕获 async 函数中未处理的错误
 */
window.addEventListener('unhandledrejection', (event) => {
  console.error('[Unhandled Rejection]', event.reason)

  if (event.reason instanceof AppError) {
    console.error('[Error Code]', event.reason.code)
    if (event.reason.context) {
      console.error('[Error Context]', event.reason.context)
    }
  }

  // 阻止默认的控制台警告
  event.preventDefault()
})

/**
 * 全局 JavaScript 错误
 * 捕获同步代码中的未捕获错误
 */
window.addEventListener('error', (event) => {
  console.error('[Global Error]', event.error)
})

// ==================== 应用挂载 ====================

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

  // 通过 downloadService 注册下载进度监听器
  downloadService.onProgress((data) => {
    console.log('[Main] 收到下载进度:', data)

    const { taskId, progress, offset, speed, state, filePath, error } = data

    if (error) {
      // 下载失败 - 保留已下载的字节数，便于恢复
      console.error('[Main] 下载失败:', error)
      const task = downloadStore.downloadingList.find((item: any) => item.id === taskId)
      if (task) {
        task.state = 'failed'
        // 保留 offset，不重置 progress，便于用户恢复下载
      }
    } else if (state === 'completed') {
      // 下载完成 - 先更新进度到100%，再标记为完成
      downloadStore.updateProgress(taskId, 100, offset, 0, filePath)
      // 持久化已完成记录到 storage
      const finishedItem = downloadStore.finishedList.find((item: any) => item.id === taskId)
      if (finishedItem) {
        downloadService.saveFinishedRecord(finishedItem).catch((err) => {
          console.error('[Main] 保存已完成记录失败:', err)
        })
      }
      console.log('[Main] 下载完成:', filePath)
    } else {
      // 更新进度（downloading, paused, waiting 等状态）
      downloadStore.updateProgress(taskId, progress, offset, speed)
    }
  })

  console.log('[Main] 下载进度监听器已通过 downloadService 注册')
}

// 非阻塞式初始化
initializeApp()
