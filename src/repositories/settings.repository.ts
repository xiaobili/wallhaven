/**
 * 设置仓储
 * 管理应用设置的持久化存储
 */

import type { IpcResponse } from '@/shared/types/ipc'
import type { AppSettings } from '@/types'
import { electronClient, STORAGE_KEYS } from '@/clients'

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
}
