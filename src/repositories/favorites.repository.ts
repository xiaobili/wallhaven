/**
 * 收藏功能仓储
 * 管理收藏夹和收藏项的持久化存储
 */

import type { IpcResponse } from '@/shared/types/ipc'
import type { Collection, FavoriteItem, FavoritesData, FavoritesErrorCode } from '@/types'
import { electronClient, STORAGE_KEYS } from '@/clients'
import { FavoritesErrorCodes } from '@/types'

/** 默认收藏夹名称 */
const DEFAULT_COLLECTION_NAME = '收藏'

/** 创建默认收藏夹 */
function createDefaultCollection(): Collection {
  return {
    id: crypto.randomUUID(),
    name: DEFAULT_COLLECTION_NAME,
    isDefault: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

/** 创建错误响应 */
function createError<T>(code: FavoritesErrorCode, message: string): IpcResponse<T> {
  return {
    success: false,
    error: { code, message },
  }
}

/**
 * 收藏功能仓储
 */
export const favoritesRepository = {
  // ==================== 数据获取 ====================

  /**
   * 获取收藏数据（首次访问时初始化默认收藏夹）
   */
  async getData(): Promise<IpcResponse<FavoritesData>> {
    const result = await electronClient.storeGet<FavoritesData>(STORAGE_KEYS.FAVORITES_DATA)

    if (result.success && result.data === null) {
      // 首次访问：初始化默认收藏夹
      const initialData: FavoritesData = {
        collections: [createDefaultCollection()],
        favorites: [],
        version: 1,
      }
      const setResult = await electronClient.storeSet(STORAGE_KEYS.FAVORITES_DATA, initialData)
      if (!setResult.success) {
        return createError(FavoritesErrorCodes.STORAGE_ERROR, '初始化收藏数据失败')
      }
      return { success: true, data: initialData }
    }

    if (!result.success) {
      return createError(FavoritesErrorCodes.STORAGE_ERROR, result.error?.message || '读取收藏数据失败')
    }

    return { success: true, data: result.data ?? { collections: [], favorites: [], version: 1 } }
  },

  /**
   * 保存收藏数据
   */
  async setData(data: FavoritesData): Promise<IpcResponse<void>> {
    return electronClient.storeSet(STORAGE_KEYS.FAVORITES_DATA, data)
  },

  // ==================== 收藏夹操作 ====================

  /**
   * 获取所有收藏夹
   */
  async getCollections(): Promise<IpcResponse<Collection[]>> {
    const result = await this.getData()
    if (!result.success || !result.data) {
      return { success: false, data: [], error: result.error }
    }
    return { success: true, data: result.data.collections }
  },

  /**
   * 创建收藏夹
   */
  async createCollection(name: string): Promise<IpcResponse<Collection>> {
    const result = await this.getData()
    if (!result.success || !result.data) {
      return createError(FavoritesErrorCodes.STORAGE_ERROR, result.error?.message || '读取收藏数据失败')
    }

    const data = result.data
    // 检查名称是否已存在
    if (data.collections.some(c => c.name === name)) {
      return createError(FavoritesErrorCodes.COLLECTION_NAME_EXISTS, '收藏夹名称已存在')
    }

    const newCollection: Collection = {
      id: crypto.randomUUID(),
      name,
      isDefault: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    const updatedData: FavoritesData = {
      collections: [...data.collections, newCollection],
      favorites: data.favorites,
      version: data.version,
    }

    const setResult = await this.setData(updatedData)
    if (!setResult.success) {
      return createError(FavoritesErrorCodes.STORAGE_ERROR, '保存收藏夹失败')
    }

    return { success: true, data: newCollection }
  },

  /**
   * 重命名收藏夹
   */
  async renameCollection(id: string, name: string): Promise<IpcResponse<Collection>> {
    const result = await this.getData()
    if (!result.success || !result.data) {
      return createError(FavoritesErrorCodes.STORAGE_ERROR, result.error?.message || '读取收藏数据失败')
    }

    const data = result.data
    const collection = data.collections.find(c => c.id === id)
    if (!collection) {
      return createError(FavoritesErrorCodes.COLLECTION_NOT_FOUND, '收藏夹不存在')
    }

    // 检查新名称是否与其他收藏夹冲突
    if (data.collections.some(c => c.name === name && c.id !== id)) {
      return createError(FavoritesErrorCodes.COLLECTION_NAME_EXISTS, '收藏夹名称已存在')
    }

    const updatedCollection: Collection = {
      ...collection,
      name,
      updatedAt: new Date().toISOString(),
    }

    const updatedData: FavoritesData = {
      collections: data.collections.map(c => (c.id === id ? updatedCollection : c)),
      favorites: data.favorites,
      version: data.version,
    }

    const setResult = await this.setData(updatedData)
    if (!setResult.success) {
      return createError(FavoritesErrorCodes.STORAGE_ERROR, '保存收藏夹失败')
    }

    return { success: true, data: updatedCollection }
  },

  /**
   * 删除收藏夹
   */
  async deleteCollection(id: string): Promise<IpcResponse<void>> {
    const result = await this.getData()
    if (!result.success || !result.data) {
      return createError(FavoritesErrorCodes.STORAGE_ERROR, result.error?.message || '读取收藏数据失败')
    }

    const data = result.data
    const collection = data.collections.find(c => c.id === id)
    if (!collection) {
      return createError(FavoritesErrorCodes.COLLECTION_NOT_FOUND, '收藏夹不存在')
    }

    if (collection.isDefault) {
      return createError(FavoritesErrorCodes.COLLECTION_IS_DEFAULT, '无法删除默认收藏夹')
    }

    // 删除收藏夹及其所有收藏项
    const updatedData: FavoritesData = {
      collections: data.collections.filter(c => c.id !== id),
      favorites: data.favorites.filter(f => f.collectionId !== id),
      version: data.version,
    }

    const setResult = await this.setData(updatedData)
    if (!setResult.success) {
      return createError(FavoritesErrorCodes.STORAGE_ERROR, '删除收藏夹失败')
    }

    return { success: true }
  },

  // ==================== 收藏项操作 ====================

  /**
   * 获取收藏项
   * @param collectionId 可选，指定收藏夹 ID 则只返回该收藏夹的收藏项
   */
  async getFavorites(collectionId?: string): Promise<IpcResponse<FavoriteItem[]>> {
    const result = await this.getData()
    if (!result.success || !result.data) {
      return { success: false, data: [], error: result.error }
    }

    const favorites = collectionId
      ? result.data.favorites.filter(f => f.collectionId === collectionId)
      : result.data.favorites

    return { success: true, data: favorites }
  },

  /**
   * 添加收藏项
   */
  async addFavorite(item: FavoriteItem): Promise<IpcResponse<FavoriteItem>> {
    const result = await this.getData()
    if (!result.success || !result.data) {
      return createError(FavoritesErrorCodes.STORAGE_ERROR, result.error?.message || '读取收藏数据失败')
    }

    const data = result.data
    // 检查收藏夹是否存在
    if (!data.collections.some(c => c.id === item.collectionId)) {
      return createError(FavoritesErrorCodes.COLLECTION_NOT_FOUND, '收藏夹不存在')
    }

    // 检查是否已收藏
    if (data.favorites.some(f => f.wallpaperId === item.wallpaperId && f.collectionId === item.collectionId)) {
      return createError(FavoritesErrorCodes.FAVORITE_ALREADY_EXISTS, '该壁纸已在此收藏夹中')
    }

    const updatedData: FavoritesData = {
      collections: data.collections,
      favorites: [...data.favorites, item],
      version: data.version,
    }

    const setResult = await this.setData(updatedData)
    if (!setResult.success) {
      return createError(FavoritesErrorCodes.STORAGE_ERROR, '添加收藏失败')
    }

    return { success: true, data: item }
  },

  /**
   * 移除收藏项
   */
  async removeFavorite(wallpaperId: string, collectionId: string): Promise<IpcResponse<void>> {
    const result = await this.getData()
    if (!result.success || !result.data) {
      return createError(FavoritesErrorCodes.STORAGE_ERROR, result.error?.message || '读取收藏数据失败')
    }

    const data = result.data
    const index = data.favorites.findIndex(
      f => f.wallpaperId === wallpaperId && f.collectionId === collectionId
    )

    if (index === -1) {
      return createError(FavoritesErrorCodes.FAVORITE_NOT_FOUND, '收藏项不存在')
    }

    const updatedData: FavoritesData = {
      collections: data.collections,
      favorites: data.favorites.filter(
        f => !(f.wallpaperId === wallpaperId && f.collectionId === collectionId)
      ),
      version: data.version,
    }

    const setResult = await this.setData(updatedData)
    if (!setResult.success) {
      return createError(FavoritesErrorCodes.STORAGE_ERROR, '移除收藏失败')
    }

    return { success: true }
  },

  /**
   * 移动收藏项到其他收藏夹
   */
  async moveFavorite(
    wallpaperId: string,
    fromCollectionId: string,
    toCollectionId: string
  ): Promise<IpcResponse<FavoriteItem>> {
    const result = await this.getData()
    if (!result.success || !result.data) {
      return createError(FavoritesErrorCodes.STORAGE_ERROR, result.error?.message || '读取收藏数据失败')
    }

    const data = result.data
    // 检查目标收藏夹是否存在
    if (!data.collections.some(c => c.id === toCollectionId)) {
      return createError(FavoritesErrorCodes.COLLECTION_NOT_FOUND, '目标收藏夹不存在')
    }

    // 查找原收藏项
    const favorite = data.favorites.find(
      f => f.wallpaperId === wallpaperId && f.collectionId === fromCollectionId
    )

    if (!favorite) {
      return createError(FavoritesErrorCodes.FAVORITE_NOT_FOUND, '收藏项不存在')
    }

    // 检查目标收藏夹是否已有该壁纸
    if (data.favorites.some(f => f.wallpaperId === wallpaperId && f.collectionId === toCollectionId)) {
      return createError(FavoritesErrorCodes.FAVORITE_ALREADY_EXISTS, '该壁纸已在目标收藏夹中')
    }

    // 更新收藏项
    const updatedFavorite: FavoriteItem = {
      ...favorite,
      collectionId: toCollectionId,
      addedAt: new Date().toISOString(),
    }

    const updatedData: FavoritesData = {
      collections: data.collections,
      favorites: data.favorites.map(f =>
        f.wallpaperId === wallpaperId && f.collectionId === fromCollectionId ? updatedFavorite : f
      ),
      version: data.version,
    }

    const setResult = await this.setData(updatedData)
    if (!setResult.success) {
      return createError(FavoritesErrorCodes.STORAGE_ERROR, '移动收藏失败')
    }

    return { success: true, data: updatedFavorite }
  },

  // ==================== 查询方法 ====================

  /**
   * 检查壁纸是否已收藏
   */
  async isFavorite(wallpaperId: string): Promise<IpcResponse<boolean>> {
    const result = await this.getData()
    if (!result.success || !result.data) {
      return { success: false, data: false, error: result.error }
    }

    const isFav = result.data.favorites.some(f => f.wallpaperId === wallpaperId)
    return { success: true, data: isFav }
  },

  /**
   * 获取壁纸所属的收藏夹列表
   */
  async getCollectionsForWallpaper(wallpaperId: string): Promise<IpcResponse<Collection[]>> {
    const result = await this.getData()
    if (!result.success || !result.data) {
      return { success: false, data: [], error: result.error }
    }

    const collectionIds = result.data.favorites
      .filter(f => f.wallpaperId === wallpaperId)
      .map(f => f.collectionId)

    const collections = result.data.collections.filter(c => collectionIds.includes(c.id))
    return { success: true, data: collections }
  },
}
