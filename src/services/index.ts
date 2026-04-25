/**
 * Services 层统一导出
 */

// 壁纸服务
export { wallpaperService, type WallpaperSearchResult } from './wallpaper.service'

// 下载服务
export { downloadService, type DownloadProgressData, type ProgressCallback } from './download.service'

// 设置服务
export { settingsService } from './settings.service'
