/**
 * 壁纸仓储
 * 管理壁纸查询参数的持久化存储和壁纸设置
 */

import type { IpcResponse } from '@/shared/types/ipc'
import type { CustomParams } from '@/types'
import { electronClient, STORAGE_KEYS } from '@/clients'

/**
 * 壁纸仓储
 */
export const wallpaperRepository = {
  /**
   * 获取保存的查询参数
   * @returns 返回查询参数，如果未设置则返回 null
   */
  async getQueryParams(): Promise<IpcResponse<CustomParams | null>> {
    return electronClient.storeGet<CustomParams>(STORAGE_KEYS.WALLPAPER_QUERY_PARAMS)
  },

  /**
   * 保存查询参数
   * @param params - 查询参数对象
   */
  async setQueryParams(params: CustomParams): Promise<IpcResponse<void>> {
    return electronClient.storeSet(STORAGE_KEYS.WALLPAPER_QUERY_PARAMS, params)
  },

  /**
   * 删除查询参数
   */
  async deleteQueryParams(): Promise<IpcResponse<void>> {
    return electronClient.storeDelete(STORAGE_KEYS.WALLPAPER_QUERY_PARAMS)
  },

  /**
   * 设置桌面壁纸
   * @param imagePath - 图片文件路径
   */
  async setWallpaper(imagePath: string): Promise<IpcResponse<void>> {
    return electronClient.setWallpaper(imagePath)
  },
}
