/**
 * 收藏项服务
 * 封装收藏项业务逻辑（ARCH-02: 无状态服务）
 */

import type { IpcResponse } from '@/types/ipc'
import type { Collection, FavoriteItem, WallpaperItem } from '@/types'
import { favoritesRepository } from '@/repositories'

/**
 * 收藏项服务实现类
 * ARCH-02: 转为无状态服务，缓存已迁移到 Store
 */
class FavoritesServiceImpl {
  /**
   * 获取所有收藏项
   */
  async getAll(): Promise<IpcResponse<FavoriteItem[]>> {
    return favoritesRepository.getFavorites()
  }

  /**
   * 获取指定收藏夹的收藏项
   * @param collectionId - 收藏夹 ID
   */
  async getByCollection(collectionId: string): Promise<IpcResponse<FavoriteItem[]>> {
    const result = await favoritesRepository.getFavorites(collectionId)
    return result
  }

  /**
   * 检查壁纸是否已收藏
   * @param wallpaperId - 壁纸 ID
   */
  async isFavorite(wallpaperId: string): Promise<IpcResponse<boolean>> {
    return favoritesRepository.isFavorite(wallpaperId)
  }

  /**
   * 获取壁纸所属的收藏夹列表
   * @param wallpaperId - 壁纸 ID
   */
  async getCollectionsForWallpaper(wallpaperId: string): Promise<IpcResponse<Collection[]>> {
    return favoritesRepository.getCollectionsForWallpaper(wallpaperId)
  }

  /**
   * 添加收藏项
   * @param wallpaperId - 壁纸 ID
   * @param collectionId - 收藏夹 ID
   * @param wallpaperData - 壁纸数据快照
   */
  async add(
    wallpaperId: string,
    collectionId: string,
    wallpaperData: WallpaperItem,
  ): Promise<IpcResponse<FavoriteItem>> {
    const item: FavoriteItem = {
      wallpaperId,
      collectionId,
      addedAt: new Date().toISOString(),
      wallpaperData,
    }

    return favoritesRepository.addFavorite(item)
  }

  /**
   * 移除收藏项
   * @param wallpaperId - 壁纸 ID
   * @param collectionId - 收藏夹 ID
   */
  async remove(wallpaperId: string, collectionId: string): Promise<IpcResponse<void>> {
    return favoritesRepository.removeFavorite(wallpaperId, collectionId)
  }

  /**
   * 移动收藏项到其他收藏夹
   * @param wallpaperId - 壁纸 ID
   * @param fromCollectionId - 源收藏夹 ID
   * @param toCollectionId - 目标收藏夹 ID
   */
  async move(
    wallpaperId: string,
    fromCollectionId: string,
    toCollectionId: string,
  ): Promise<IpcResponse<FavoriteItem>> {
    return favoritesRepository.moveFavorite(
      wallpaperId,
      fromCollectionId,
      toCollectionId,
    )
  }
}

/** 收藏项服务单例 */
export const favoritesService = new FavoritesServiceImpl()
