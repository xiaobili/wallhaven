import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

// 定义路由配置
const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/online',
  },
  {
    path: '/online',
    name: 'OnlineWallpaper',
    component: () => import('@/views/OnlineWallpaper.vue'),
    meta: {
      title: '在线壁纸',
      icon: 'fas fa-cloud',
    },
  },
  {
    path: '/switch',
    name: 'LocalWallpaper',
    component: () => import('@/views/LocalWallpaper.vue'),
    meta: {
      title: '本地列表',
      icon: 'fas fa-folder',
    },
  },
  {
    path: '/download',
    name: 'DownloadWallpaper',
    component: () => import('@/views/DownloadWallpaper.vue'),
    meta: {
      title: '下载中心',
      icon: 'fas fa-inbox-in',
    },
  },
  {
    path: '/setting',
    name: 'SettingPage',
    component: () => import('@/views/SettingPage.vue'),
    meta: {
      title: '设置',
      icon: 'fas fa-cog',
    },
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

export default router
