/**
 * 收藏项服务
 * 封装收藏项业务逻辑，提供内存缓存优化
 */

import type { IpcResponse } from '@/shared/types/ipc'
import type { Collection, FavoriteItem, FavoritesData, WallpaperItem } from '@/types'
import { favoritesRepository } from '@/repositories'

/**
 * 收藏项服务实现类
 */
class FavoritesServiceImpl {
  /** 内存缓存的收藏项列表 */
  private cachedFavorites: FavoriteItem[] | null = null
  /** 内存缓存的完整数据 */
  private cachedData: FavoritesData | null = null

  /**
   * 获取所有收藏项
   * 优先返回内存缓存，避免重复 IPC 调用
   */
  async getAll(): Promise<IpcResponse<FavoriteItem[]>> {
    // 优先返回缓存
    if (this.cachedFavorites) {
      return { success: true, data: this.cachedFavorites }
    }

    // 从 Repository 获取
    const result = await favoritesRepository.getFavorites()

    // 成功时更新缓存
    if (result.success && result.data) {
      this.cachedFavorites = result.data
    }

    return result
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
   * 添加后清除缓存
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

    const result = await favoritesRepository.addFavorite(item)

    // 成功时清除缓存
    if (result.success) {
      this.clearCache()
    }

    return result
  }

  /**
   * 移除收藏项
   * 移除后清除缓存
   * @param wallpaperId - 壁纸 ID
   * @param collectionId - 收藏夹 ID
   */
  async remove(wallpaperId: string, collectionId: string): Promise<IpcResponse<void>> {
    const result = await favoritesRepository.removeFavorite(wallpaperId, collectionId)

    // 成功时清除缓存
    if (result.success) {
      this.clearCache()
    }

    return result
  }

  /**
   * 移动收藏项到其他收藏夹
   * 移动后清除缓存
   * @param wallpaperId - 壁纸 ID
   * @param fromCollectionId - 源收藏夹 ID
   * @param toCollectionId - 目标收藏夹 ID
   */
  async move(
    wallpaperId: string,
    fromCollectionId: string,
    toCollectionId: string,
  ): Promise<IpcResponse<FavoriteItem>> {
    const result = await favoritesRepository.moveFavorite(
      wallpaperId,
      fromCollectionId,
      toCollectionId,
    )

    // 成功时清除缓存
    if (result.success) {
      this.clearCache()
    }

    return result
  }

  /**
   * 清除内存缓存
   * 下次获取收藏项时将从 Repository 重新加载
   */
  clearCache(): void {
    this.cachedFavorites = null
    this.cachedData = null
  }
}

/** 收藏项服务单例 */
export const favoritesService = new FavoritesServiceImpl()
