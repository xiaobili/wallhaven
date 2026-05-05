/**
 * 收藏功能客户端
 * 封装收藏夹和收藏项的 IPC 操作
 */

import type {
  IpcResponse,
  FavoritesGetPaginatedRequest,
  FavoritesCountsResponse,
} from '@/types/ipc'
import type {
  Collection,
  FavoriteItem,
  WallpaperItem,
  PaginationParams,
  PaginatedFavoritesResult,
} from '@/types'
import { BaseClient } from './base.client'

/**
 * 收藏功能客户端实现类
 */
class FavoritesClientImpl extends BaseClient {
  // ==================== 收藏夹操作 ====================

  /**
   * 获取所有收藏夹
   */
  async getCollections(): Promise<IpcResponse<Collection[]>> {
    if (!this.isAvailable()) {
      return this.createUnavailableResponse<Collection[]>()
    }

    try {
      const result = await window.electronAPI.favoritesGetCollections()
      if (result.success) {
        return { success: true, data: result.data as Collection[] }
      }
      return {
        success: false,
        error: result.error || { code: 'FAVORITES_ERROR', message: '收藏夹不存在' },
      }
    } catch (error) {
      return {
        success: false,
        error: { code: 'FAVORITES_ERROR', message: String(error) },
      }
    }
  }

  /**
   * 创建收藏夹
   */
  async createCollection(name: string): Promise<IpcResponse<Collection>> {
    if (!this.isAvailable()) {
      return this.createUnavailableResponse<Collection>()
    }

    try {
      const result = await window.electronAPI.favoritesCreateCollection({ name })
      if (result.success) {
        return { success: true, data: result.data as Collection }
      }
      return {
        success: false,
        error: result.error || { code: 'FAVORITES_ERROR', message: '创建收藏夹失败' },
      }
    } catch (error) {
      return {
        success: false,
        error: { code: 'FAVORITES_ERROR', message: String(error) },
      }
    }
  }

  /**
   * 重命名收藏夹
   */
  async renameCollection(id: string, name: string): Promise<IpcResponse<Collection>> {
    if (!this.isAvailable()) {
      return this.createUnavailableResponse<Collection>()
    }

    try {
      const result = await window.electronAPI.favoritesRenameCollection({ id, name })
      if (result.success) {
        return { success: true, data: result.data as Collection }
      }
      return {
        success: false,
        error: result.error || { code: 'FAVORITES_ERROR', message: '重命名收藏夹失败' },
      }
    } catch (error) {
      return {
        success: false,
        error: { code: 'FAVORITES_ERROR', message: String(error) },
      }
    }
  }

  /**
   * 删除收藏夹
   */
  async deleteCollection(id: string): Promise<IpcResponse<void>> {
    if (!this.isAvailable()) {
      return this.createUnavailableResponse<void>()
    }

    try {
      const result = await window.electronAPI.favoritesDeleteCollection({ id })
      if (result.success) {
        return { success: true }
      }
      return {
        success: false,
        error: result.error || { code: 'FAVORITES_ERROR', message: '删除收藏夹失败' },
      }
    } catch (error) {
      return {
        success: false,
        error: { code: 'FAVORITES_ERROR', message: String(error) },
      }
    }
  }

  /**
   * 设置默认收藏夹
   */
  async setDefaultCollection(id: string): Promise<IpcResponse<Collection>> {
    if (!this.isAvailable()) {
      return this.createUnavailableResponse<Collection>()
    }

    try {
      const result = await window.electronAPI.favoritesSetDefaultCollection({ id })
      if (result.success) {
        return { success: true, data: result.data as Collection }
      }
      return {
        success: false,
        error: result.error || { code: 'FAVORITES_ERROR', message: '设置默认收藏夹失败' },
      }
    } catch (error) {
      return {
        success: false,
        error: { code: 'FAVORITES_ERROR', message: String(error) },
      }
    }
  }

  // ==================== 收藏项操作 ====================

  /**
   * 获取收藏夹中的收藏项
   */
  async getByCollection(collectionId?: string): Promise<IpcResponse<FavoriteItem[]>> {
    if (!this.isAvailable()) {
      return this.createUnavailableResponse<FavoriteItem[]>()
    }

    try {
      const result = await window.electronAPI.favoritesGetByCollection({ collectionId })
      if (result.success) {
        return { success: true, data: result.data as FavoriteItem[] }
      }
      return {
        success: false,
        error: result.error || { code: 'FAVORITES_ERROR', message: '获取收藏项失败' },
      }
    } catch (error) {
      return {
        success: false,
        error: { code: 'FAVORITES_ERROR', message: String(error) },
      }
    }
  }

  /**
   * 添加收藏项
   */
  async add(
    wallpaperId: string,
    collectionId: string,
    wallpaperData: WallpaperItem,
  ): Promise<IpcResponse<FavoriteItem>> {
    if (!this.isAvailable()) {
      return this.createUnavailableResponse<FavoriteItem>()
    }

    try {
      // 将 Proxy 对象转换为纯 JSON 对象，避免 IPC 序列化错误
      const plainWallpaperData = JSON.parse(JSON.stringify(wallpaperData))
      const result = await window.electronAPI.favoritesAdd({
        wallpaperId,
        collectionId,
        wallpaperData: plainWallpaperData,
      })
      if (result.success) {
        return { success: true, data: result.data as FavoriteItem }
      }
      return {
        success: false,
        error: result.error || { code: 'FAVORITES_ERROR', message: '添加收藏失败' },
      }
    } catch (error) {
      return {
        success: false,
        error: { code: 'FAVORITES_ERROR', message: String(error) },
      }
    }
  }

  /**
   * 移除收藏项
   */
  async remove(wallpaperId: string, collectionId: string): Promise<IpcResponse<void>> {
    if (!this.isAvailable()) {
      return this.createUnavailableResponse<void>()
    }

    try {
      const result = await window.electronAPI.favoritesRemove({ wallpaperId, collectionId })
      if (result.success) {
        return { success: true }
      }
      return {
        success: false,
        error: result.error || { code: 'FAVORITES_ERROR', message: '移除收藏失败' },
      }
    } catch (error) {
      return {
        success: false,
        error: { code: 'FAVORITES_ERROR', message: String(error) },
      }
    }
  }

  /**
   * 移动收藏项到其他收藏夹
   */
  async move(
    wallpaperId: string,
    fromCollectionId: string,
    toCollectionId: string,
  ): Promise<IpcResponse<FavoriteItem>> {
    if (!this.isAvailable()) {
      return this.createUnavailableResponse<FavoriteItem>()
    }

    try {
      const result = await window.electronAPI.favoritesMove({
        wallpaperId,
        fromCollectionId,
        toCollectionId,
      })
      if (result.success) {
        return { success: true, data: result.data as FavoriteItem }
      }
      return {
        success: false,
        error: result.error || { code: 'FAVORITES_ERROR', message: '移动收藏失败' },
      }
    } catch (error) {
      return {
        success: false,
        error: { code: 'FAVORITES_ERROR', message: String(error) },
      }
    }
  }

  // ==================== 查询方法 ====================

  /**
   * 检查壁纸是否已收藏
   */
  async isFavorite(wallpaperId: string): Promise<IpcResponse<boolean>> {
    if (!this.isAvailable()) {
      return this.createUnavailableResponse<boolean>()
    }

    try {
      const result = await window.electronAPI.favoritesIsFavorite({ wallpaperId })
      if (result.success) {
        return { success: true, data: result.data as boolean }
      }
      return {
        success: false,
        data: false,
        error: result.error || { code: 'FAVORITES_ERROR', message: '检查收藏状态失败' },
      }
    } catch (error) {
      return {
        success: false,
        data: false,
        error: { code: 'FAVORITES_ERROR', message: String(error) },
      }
    }
  }

  /**
   * 获取壁纸所属的收藏夹列表
   */
  async getCollectionsForWallpaper(wallpaperId: string): Promise<IpcResponse<Collection[]>> {
    if (!this.isAvailable()) {
      return this.createUnavailableResponse<Collection[]>()
    }

    try {
      const result = await window.electronAPI.favoritesGetCollectionsForWallpaper({ wallpaperId })
      if (result.success) {
        return { success: true, data: result.data as Collection[] }
      }
      return {
        success: false,
        error: result.error || { code: 'FAVORITES_ERROR', message: '获取壁纸收藏夹失败' },
      }
    } catch (error) {
      return {
        success: false,
        error: { code: 'FAVORITES_ERROR', message: String(error) },
      }
    }
  }

  /**
   * 分页获取收藏项
   */
  async getPaginated(
    params: PaginationParams & { collectionId?: string },
  ): Promise<IpcResponse<PaginatedFavoritesResult>> {
    if (!this.isAvailable()) {
      return this.createUnavailableResponse<PaginatedFavoritesResult>()
    }

    try {
      const result = await window.electronAPI.favoritesGetPaginated(params)
      if (result.success) {
        return { success: true, data: result.data as PaginatedFavoritesResult }
      }
      return {
        success: false,
        error: result.error || { code: 'FAVORITES_ERROR', message: '分页获取收藏失败' },
      }
    } catch (error) {
      return {
        success: false,
        error: { code: 'FAVORITES_ERROR', message: String(error) },
      }
    }
  }

  /**
   * 获取所有收藏夹计数
   */
  async getCounts(): Promise<IpcResponse<Record<string, number>>> {
    if (!this.isAvailable()) {
      return this.createUnavailableResponse<Record<string, number>>()
    }

    try {
      const result = await window.electronAPI.favoritesGetCounts()
      if (result.success) {
        return { success: true, data: result.data as Record<string, number> }
      }
      return {
        success: false,
        error: result.error || { code: 'FAVORITES_ERROR', message: '获取收藏计数失败' },
      }
    } catch (error) {
      return {
        success: false,
        error: { code: 'FAVORITES_ERROR', message: String(error) },
      }
    }
  }

  /**
   * 批量获取收藏状态映射
   */
  async getStatusMap(wallpaperIds: string[]): Promise<IpcResponse<Record<string, 0 | 1 | 2>>> {
    if (!this.isAvailable()) {
      return this.createUnavailableResponse<Record<string, 0 | 1 | 2>>()
    }

    try {
      const result = await window.electronAPI.favoritesGetStatusMap({ wallpaperIds })
      if (result.success) {
        return { success: true, data: result.data as Record<string, 0 | 1 | 2> }
      }
      return {
        success: false,
        error: result.error || { code: 'FAVORITES_ERROR', message: '获取收藏状态失败' },
      }
    } catch (error) {
      return {
        success: false,
        error: { code: 'FAVORITES_ERROR', message: String(error) },
      }
    }
  }
}

/** 收藏功能客户端单例 */
export const favoritesClient = new FavoritesClientImpl()
