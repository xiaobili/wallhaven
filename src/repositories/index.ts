/**
 * Repositories 层统一导出
 */

// 设置仓储
export { settingsRepository, type ClearCacheResult } from './settings.repository'

// 下载仓储（已完成记录）
export { downloadRepository } from './download.repository'

// 下载任务仓储（任务管理）— ARCH-01
export { downloadTaskRepository } from './download-task.repository'

// 壁纸仓储
export { wallpaperRepository } from './wallpaper.repository'

// 窗口仓储
export { windowRepository } from './window.repository'

// 收藏功能仓储
export { favoritesRepository } from './favorites.repository'
