/**
 * 存储键常量
 * 统一管理 electron-store 的键名
 */

export const STORAGE_KEYS = {
  /** 应用设置存储键 */
  APP_SETTINGS: 'appSettings',
  /** 已完成下载列表存储键 */
  DOWNLOAD_FINISHED_LIST: 'downloadFinishedList',
  /** 壁纸查询参数存储键 */
  WALLPAPER_QUERY_PARAMS: 'wallpaperQueryParams',
} as const

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS]
