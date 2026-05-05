/**
 * 壁纸设置客户端
 * 封装桌面壁纸设置功能
 */

import type { IpcResponse } from '@/types/ipc'
import { BaseClient } from './base.client'

/**
 * 壁纸客户端实现类
 */
class WallpaperClientImpl extends BaseClient {
  /**
   * 设置壁纸
   */
  async set(imagePath: string): Promise<IpcResponse<void>> {
    if (!this.isAvailable()) {
      return this.createUnavailableResponse<void>()
    }

    try {
      const result = await window.electronAPI.setWallpaper(imagePath)
      if (result.success) {
        return { success: true }
      }
      return {
        success: false,
        error: {
          code: 'SET_WALLPAPER_ERROR',
          message: result.error || 'Set wallpaper failed',
        },
      }
    } catch (error) {
      return {
        success: false,
        error: { code: 'SET_WALLPAPER_ERROR', message: String(error) },
      }
    }
  }
}

/** 壁纸客户端单例 */
export const wallpaperClient = new WallpaperClientImpl()
