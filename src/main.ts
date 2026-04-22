import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import { useWallpaperStore } from './stores/wallpaper'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

// 应用启动时加载保存的设置
const wallpaperStore = useWallpaperStore()
wallpaperStore.loadSettings()

app.mount('#app')
