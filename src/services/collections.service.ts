/**
 * 收藏夹服务
 * 封装收藏夹业务逻辑（ARCH-02: 无状态服务）
 */

import type { IpcResponse } from '@/types/ipc'
import type { Collection } from '@/types'
import { favoritesRepository } from '@/repositories'

/**
 * 收藏夹服务实现类
 * ARCH-02: 转为无状态服务，缓存已迁移到 Store
 */
class CollectionsServiceImpl {
  /**
   * 获取所有收藏夹
   */
  async getAll(): Promise<IpcResponse<Collection[]>> {
    return favoritesRepository.getCollections()
  }

  /**
   * 根据 ID 获取收藏夹
   * @param id - 收藏夹 ID
   */
  async getById(id: string): Promise<IpcResponse<Collection | null>> {
    const result = await favoritesRepository.getCollections()

    if (!result.success) {
      return { success: false, data: null, error: result.error }
    }

    const collection = result.data?.find((c) => c.id === id) || null
    return { success: true, data: collection }
  }

  /**
   * 获取默认收藏夹
   * 返回 isDefault=true 的收藏夹
   */
  async getDefault(): Promise<IpcResponse<Collection | null>> {
    const result = await favoritesRepository.getCollections()

    if (!result.success) {
      return { success: false, data: null, error: result.error }
    }

    const defaultCollection = result.data?.find((c) => c.isDefault) || null
    return { success: true, data: defaultCollection }
  }

  /**
   * 创建收藏夹
   * @param name - 收藏夹名称
   */
  async create(name: string): Promise<IpcResponse<Collection>> {
    return favoritesRepository.createCollection(name)
  }

  /**
   * 重命名收藏夹
   * @param id - 收藏夹 ID
   * @param name - 新名称
   */
  async rename(id: string, name: string): Promise<IpcResponse<Collection>> {
    return favoritesRepository.renameCollection(id, name)
  }

  /**
   * 删除收藏夹
   * @param id - 收藏夹 ID
   */
  async delete(id: string): Promise<IpcResponse<void>> {
    return favoritesRepository.deleteCollection(id)
  }

  /**
   * 设置默认收藏夹
   * @param id - 收藏夹 ID
   */
  async setDefault(id: string): Promise<IpcResponse<Collection>> {
    return favoritesRepository.setDefaultCollection(id)
  }
}

/** 收藏夹服务单例 */
export const collectionsService = new CollectionsServiceImpl()
