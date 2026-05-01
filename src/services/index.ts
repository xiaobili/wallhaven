/**
 * Services 层统一导出
 */

// 壁纸服务
export { wallpaperService, type WallpaperSearchResult } from './wallpaper.service'

// 下载服务
export {
  downloadService,
  type DownloadProgressData,
  type ProgressCallback,
} from './download.service'

// 设置服务
export { settingsService } from './settings.service'

// 窗口服务
export { windowService } from './window.service'

// 收藏夹服务
export { collectionsService } from './collections.service'

// 收藏项服务
export { favoritesService } from './favorites.service'
