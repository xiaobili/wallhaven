// Wallhaven API 相关类型定义

// ==================== 壁纸相关类型 ====================

/**
 * 壁纸缩略图信息
 */
export interface WallpaperThumb {
  large: string
  original: string
  small: string
}

/**
 * 壁纸查询参数
 */
export interface WallpaperQuery {
  id?: number
  tag?: string
}

/**
 * 壁纸元数据
 */
export interface WallpaperMeta {
  current_page: number
  last_page: number
  per_page: number
  total: number
  query?: string | WallpaperQuery
  seed?: string | null
}

/**
 * 壁纸项目信息，可为 null 或者 WallpaperItem
 */

export interface WallpaperItem {
  id: string
  url: string
  short_url: string
  views: number
  favorites: number
  source: string
  purity: 'sfw' | 'sketchy' | 'nsfw'
  category: 'general' | 'anime' | 'people'
  dimension_x: number
  dimension_y: number
  resolution: string
  ratio: string
  file_size: number
  file_type: string
  created_at: string
  colors: string[]
  path: string
  thumbs: WallpaperThumb
}

// ==================== 页面数据相关类型 ====================

/**
 * 页面数据结构
 */
export interface PageData {
  totalPage: number
  currentPage: number
  data: WallpaperItem[]
}

export interface TotalPageData {
  totalPage: number
  currentPage: number
  sections: PageData[]
}

// ==================== 搜索参数相关类型 ====================

/**
 * 自定义搜索参数
 */
export interface CustomParams {
  selector: number
  keyword: string
  categories: string[]
  aiArt: boolean
  purity: string[]
  sorting: string
  desc: boolean
  topRange: string
  ratios: string[]
  respickerLimitation: string
  resolutions: string[]
  resolution: string
  respickerCustomWidth: string
  respickerCustomHeight: string
  color: string
}

/**
 * API 获取参数
 */
export interface GetParams {
  q?: string
  ai_art_filter?: number
  categories?: string
  purity?: string
  sorting?: string
  topRange?: string
  order?: string
  colors?: string | null
  ratios?: string | null
  atleast?: string | null
  resolutions?: string | null
  page: number
}

// ==================== UI 辅助类型 ====================

/**
 * 分辨率行数据
 */
export interface ResolutionLine {
  item: string[]
}

/**
 * 比例行数据
 */
export interface RatioLine {
  item: string[]
}

/**
 * 颜色行数据
 */
export interface ColorLine {
  item: string[]
}

// ==================== 组件 Props 类型 ====================

/**
 * SearchBar 组件 Props
 */
export interface SearchBarProps {
  customParams: CustomParams
  apiKey: string
  desktopInfo: string
  saving: boolean
}

/**
 * WallpaperList 组件 Props
 */
export interface WallpaperListProps {
  pageData: PageData
  loading: boolean
  error: boolean
}

// ==================== 下载和壁纸信息类型 ====================

/**
 * 壁纸操作信息（用于设置背景、下载等）
 */
export interface WallpaperActionInfo {
  id: string
  url: string
  size: number
  small: string
  resolution: string
}

// ==================== 下载任务相关类型 ====================

/**
 * 下载任务状态
 */
export type DownloadState = 'downloading' | 'paused' | 'waiting' | 'completed'

/**
 * 下载任务项
 */
export interface DownloadItem {
  url: string
  small: string
  resolution: string
  size: number
  offset: number
  progress: number
  speed: number
  state: DownloadState
  path?: string
  time?: string
}

/**
 * 已完成下载项
 */
export interface FinishedDownloadItem extends DownloadItem {
  path: string
  time: string
}

// ==================== 应用设置类型 ====================

/**
 * 壁纸适配模式
 */
export type WallpaperFit = 'fill' | 'fit' | 'stretch' | 'tile' | 'center' | 'span'

/**
 * 应用设置接口
 */
export interface AppSettings {
  // 下载设置
  downloadPath: string
  maxConcurrentDownloads: number
  
  // API 设置
  apiKey: string
  
  // 桌面设置
  wallpaperFit: WallpaperFit
}
