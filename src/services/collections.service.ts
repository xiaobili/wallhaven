/**
 * 收藏夹服务
 * 封装收藏夹业务逻辑，提供内存缓存优化
 */

import type { IpcResponse } from '@/shared/types/ipc'
import type { Collection, FavoritesData } from '@/types'
import { favoritesRepository } from '@/repositories'

/**
 * 收藏夹服务实现类
 */
class CollectionsServiceImpl {
  /** 内存缓存的收藏夹列表 */
  private cachedCollections: Collection[] | null = null
  /** 内存缓存的完整数据 */
  private cachedData: FavoritesData | null = null

  /**
   * 获取所有收藏夹
   * 优先返回内存缓存，避免重复 IPC 调用
   */
  async getAll(): Promise<IpcResponse<Collection[]>> {
    // 优先返回缓存
    if (this.cachedCollections) {
      return { success: true, data: this.cachedCollections }
    }

    // 从 Repository 获取
    const result = await favoritesRepository.getCollections()

    // 成功时更新缓存
    if (result.success && result.data) {
      this.cachedCollections = result.data
    }

    return result
  }

  /**
   * 根据 ID 获取收藏夹
   * @param id - 收藏夹 ID
   */
  async getById(id: string): Promise<IpcResponse<Collection | null>> {
    const result = await this.getAll()

    if (!result.success) {
      return { success: false, data: null, error: result.error }
    }

    const collection = result.data?.find(c => c.id === id) || null
    return { success: true, data: collection }
  }

  /**
   * 获取默认收藏夹
   * 返回 isDefault=true 的收藏夹
   */
  async getDefault(): Promise<IpcResponse<Collection | null>> {
    const result = await this.getAll()

    if (!result.success) {
      return { success: false, data: null, error: result.error }
    }

    const defaultCollection = result.data?.find(c => c.isDefault) || null
    return { success: true, data: defaultCollection }
  }

  /**
   * 创建收藏夹
   * 创建后清除缓存
   * @param name - 收藏夹名称
   */
  async create(name: string): Promise<IpcResponse<Collection>> {
    const result = await favoritesRepository.createCollection(name)

    // 成功时清除缓存
    if (result.success) {
      this.clearCache()
    }

    return result
  }

  /**
   * 重命名收藏夹
   * 重命名后清除缓存
   * @param id - 收藏夹 ID
   * @param name - 新名称
   */
  async rename(id: string, name: string): Promise<IpcResponse<Collection>> {
    const result = await favoritesRepository.renameCollection(id, name)

    // 成功时清除缓存
    if (result.success) {
      this.clearCache()
    }

    return result
  }

  /**
   * 删除收藏夹
   * 删除后清除缓存
   * @param id - 收藏夹 ID
   */
  async delete(id: string): Promise<IpcResponse<void>> {
    const result = await favoritesRepository.deleteCollection(id)

    // 成功时清除缓存
    if (result.success) {
      this.clearCache()
    }

    return result
  }

  /**
   * 设置默认收藏夹
   * 设置后清除缓存
   * @param id - 收藏夹 ID
   */
  async setDefault(id: string): Promise<IpcResponse<Collection>> {
    const result = await favoritesRepository.setDefaultCollection(id)

    // 成功时清除缓存
    if (result.success) {
      this.clearCache()
    }

    return result
  }

  /**
   * 清除内存缓存
   * 下次获取收藏夹时将从 Repository 重新加载
   */
  clearCache(): void {
    this.cachedCollections = null
    this.cachedData = null
  }
}

/** 收藏夹服务单例 */
export const collectionsService = new CollectionsServiceImpl()
