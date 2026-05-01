/**
 * Electron Store Instance
 *
 * Extracted from index.ts to break circular dependencies.
 * Handler modules (store.handler.ts, download.handler.ts, download-queue.ts)
 * import store from here instead of dynamically importing ../../index.
 *
 * This eliminates Vite warnings about mixed static/dynamic imports
 * caused by the circular-dependency-avoidance pattern.
 */

import Store from 'electron-store'

const store = new Store({
  name: 'wallhaven-data',
  defaults: {
    // 壁纸搜索参数
    wallpaperQueryParams: null,
    // 应用设置
    appSettings: null,
    // 下载完成列表
    downloadFinishedList: [],
  },
})

export { store }
