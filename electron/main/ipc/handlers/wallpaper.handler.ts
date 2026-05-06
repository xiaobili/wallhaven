/**
 * Wallpaper Setting IPC Handler
 */

import { ipcMain } from 'electron'
import * as fs from 'fs'
import { logHandler } from './base'
import { IPC_ERROR_CODES, createErrorResponse } from '../../../../src/errors'

export function registerWallpaperHandlers(): void {
  /**
   * 设置桌面壁纸
   * 注意：需要安装 wallpaper 包
   */
  ipcMain.handle('set-wallpaper', async (_event, imagePath: string) => {
    try {
      if (!fs.existsSync(imagePath)) {
        return createErrorResponse(IPC_ERROR_CODES.WALLPAPER_FILE_NOT_FOUND, '图片文件不存在')
      }

      // 动态导入 wallpaper 包（使用命名导出）
      let setWallpaper: any
      try {
        const wallpaperModule = await import('wallpaper')
        // wallpaper 使用命名导出，不是默认导出
        setWallpaper = (wallpaperModule as any).setWallpaper
        if (!setWallpaper) {
          throw new Error('wallpaper 模块未正确导出 setWallpaper 函数')
        }
      } catch (importError: any) {
        logHandler('set-wallpaper', `Import error: ${importError.message}`, 'error')
        return createErrorResponse(
          IPC_ERROR_CODES.WALLPAPER_MODULE_ERROR,
          `wallpaper 模块加载失败: ${importError.message}`,
        )
      }

      await setWallpaper(imagePath)

      return { success: true, error: null }
    } catch (error: any) {
      logHandler('set-wallpaper', `Error: ${error.message}`, 'error')
      return createErrorResponse(IPC_ERROR_CODES.INTERNAL_ERROR, error.message)
    }
  })
}
