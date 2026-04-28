/**
 * 收藏功能相关类型定义
 */

import type { WallpaperItem } from './index'

// ==================== 收藏夹类型 ====================

/**
 * 收藏夹接口
 */
export interface Collection {
  /** 唯一标识符 (UUID) */
  id: string
  /** 收藏夹名称 */
  name: string
  /** 是否为默认收藏夹（不可删除） */
  isDefault: boolean
  /** 创建时间 (ISO 8601) */
  createdAt: string
  /** 更新时间 (ISO 8601) */
  updatedAt: string
}

/**
 * 收藏项接口
 */
export interface FavoriteItem {
  /** Wallhaven 壁纸 ID */
  wallpaperId: string
  /** 所属收藏夹 ID */
  collectionId: string
  /** 添加时间 (ISO 8601) */
  addedAt: string
  /** 壁纸数据快照（避免额外查询） */
  wallpaperData: WallpaperItem
}

/**
 * 收藏数据根结构
 */
export interface FavoritesData {
  /** 收藏夹列表 */
  collections: Collection[]
  /** 收藏项列表 */
  favorites: FavoriteItem[]
  /** 数据版本号（便于未来迁移） */
  version: number
}

// ==================== 错误码类型 ====================

/**
 * 收藏功能错误码
 */
export const FavoritesErrorCodes = {
  COLLECTION_NOT_FOUND: 'COLLECTION_NOT_FOUND',
  COLLECTION_IS_DEFAULT: 'COLLECTION_IS_DEFAULT',
  COLLECTION_NAME_EXISTS: 'COLLECTION_NAME_EXISTS',
  FAVORITE_NOT_FOUND: 'FAVORITE_NOT_FOUND',
  FAVORITE_ALREADY_EXISTS: 'FAVORITE_ALREADY_EXISTS',
  STORAGE_ERROR: 'FAVORITES_STORAGE_ERROR',
} as const

export type FavoritesErrorCode = (typeof FavoritesErrorCodes)[keyof typeof FavoritesErrorCodes]
