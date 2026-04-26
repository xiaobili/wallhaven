/**
 * 设置仓储
 * 管理应用设置的持久化存储
 */

import type { IpcResponse } from '@/shared/types/ipc'
import type { AppSettings } from '@/types'
import { electronClient, STORAGE_KEYS } from '@/clients'

/** 缓存信息类型 */
export interface CacheInfo {
  thumbnailsCount: number
  tempFilesCount: number
}

/** 清理缓存结果类型 */
export interface ClearCacheResult {
  thumbnailsDeleted: number
  tempFilesDeleted: number
}

/**
 * 设置仓储
 */
export const settingsRepository = {
  /**
   * 获取应用设置
   * @returns 返回设置数据，如果未设置则返回 null
   */
  async get(): Promise<IpcResponse<AppSettings | null>> {
    return electronClient.storeGet<AppSettings>(STORAGE_KEYS.APP_SETTINGS)
  },

  /**
   * 保存应用设置
   * @param settings - 应用设置对象
   */
  async set(settings: AppSettings): Promise<IpcResponse<void>> {
    return electronClient.storeSet(STORAGE_KEYS.APP_SETTINGS, settings)
  },

  /**
   * 删除应用设置
   */
  async delete(): Promise<IpcResponse<void>> {
    return electronClient.storeDelete(STORAGE_KEYS.APP_SETTINGS)
  },

  /**
   * 选择文件夹
   * @returns 返回选中的文件夹路径，取消则返回 null
   */
  async selectFolder(): Promise<IpcResponse<string | null>> {
    return electronClient.selectFolder()
  },

  /**
   * 清空应用存储
   */
  async clearStore(): Promise<IpcResponse<void>> {
    return electronClient.storeClear()
  },

  /**
   * 清理应用缓存
   * @param downloadPath - 下载目录路径
   */
  async clearAppCache(downloadPath?: string): Promise<IpcResponse<ClearCacheResult>> {
    return electronClient.clearAppCache(downloadPath)
  },

  /**
   * 获取缓存信息
   * @param downloadPath - 下载目录路径
   */
  async getCacheInfo(downloadPath?: string): Promise<IpcResponse<CacheInfo>> {
    return electronClient.getCacheInfo(downloadPath)
  },
}
