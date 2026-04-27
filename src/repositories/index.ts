/**
 * Repositories 层统一导出
 */

// 设置仓储
export { settingsRepository, type CacheInfo, type ClearCacheResult } from './settings.repository'

// 下载仓储
export { downloadRepository } from './download.repository'

// 壁纸仓储
export { wallpaperRepository } from './wallpaper.repository'

// 窗口仓储
export { windowRepository } from './window.repository'
