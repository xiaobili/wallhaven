/**
 * 应用配置常量
 * 集中管理所有硬编码值，便于维护和调整
 */

/**
 * 下载配置
 */
export const DOWNLOAD_CONFIG = {
  /** 重试基础延迟（毫秒） */
  BACKOFF_BASE_MS: 2000,
  /** 重试最大延迟（毫秒） */
  BACKOFF_MAX_MS: 30000,
  /** 最大重试次数 */
  MAX_RETRIES: 3,
  /** 进度更新间隔（毫秒）— Phase 1 优化 */
  PROGRESS_UPDATE_INTERVAL_MS: 300,
} as const

/**
 * 缓存配置
 */
export const CACHE_CONFIG = {
  /** 搜索结果缓存 TTL（毫秒） */
  SEARCH_TTL_MS: 5 * 60 * 1000, // 5 分钟
  /** 搜索结果缓存最大内存（字节） */
  SEARCH_MAX_SIZE_BYTES: 50 * 1024 * 1024, // 50 MB
  /** 收藏状态缓存 TTL（毫秒） */
  FAVORITE_STATUS_TTL_MS: 10 * 60 * 1000, // 10 分钟
} as const

/**
 * 数据库配置
 */
export const DATABASE_CONFIG = {
  /** WAL 检查点间隔（毫秒） */
  CHECKPOINT_INTERVAL_MS: 5 * 60 * 1000,
  /** WAL 大小阈值（字节） */
  WAL_SIZE_THRESHOLD_BYTES: 10 * 1024 * 1024,
} as const

/**
 * API 配置
 */
export const API_CONFIG = {
  /** 请求超时（毫秒） */
  REQUEST_TIMEOUT_MS: 30000,
  /** API 基础 URL */
  BASE_URL: 'https://wallhaven.cc/api/v1',
} as const
