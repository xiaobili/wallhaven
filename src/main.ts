import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import { AppError } from './errors'

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
  const { useSettings, useDownload } = await import('./composables')

  await useSettings().load()
  await useDownload().loadHistory()
  console.log('[Main] 应用初始化完成，已从 electron-store 加载数据')

  // 注意：下载进度监听器已移至 useDownload composable 中
  // 这样每个使用下载功能的组件会自行管理监听器的生命周期
}

// 非阻塞式初始化
initializeApp()
