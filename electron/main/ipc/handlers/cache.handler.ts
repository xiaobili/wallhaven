/**
 * Cache Management IPC Handlers
 * Handles application cache clearing and info retrieval
 */

import { ipcMain, BrowserWindow } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import { logHandler } from './base'

/**
 * 清空应用缓存
 * 包括：缩略图缓存、下载临时文件等
 */
ipcMain.handle('clear-app-cache', async (_event, downloadPath?: string) => {
  try {
    const results = {
      thumbnailsDeleted: 0,
      tempFilesDeleted: 0,
      errors: [] as string[],
    }

    // 1. 如果提供了下载路径，清理该目录下的缓存
    if (downloadPath && fs.existsSync(downloadPath)) {
      // 清理缩略图缓存目录
      const thumbnailDir = path.join(downloadPath, '.thumbnails')
      if (fs.existsSync(thumbnailDir)) {
        try {
          const files = fs.readdirSync(thumbnailDir)
          files.forEach(file => {
            const filePath = path.join(thumbnailDir, file)
            fs.unlinkSync(filePath)
            results.thumbnailsDeleted++
          })
          // 删除空目录
          fs.rmdirSync(thumbnailDir)
          logHandler('clear-app-cache', `Deleted ${results.thumbnailsDeleted} thumbnails`)
        } catch (error: any) {
          results.errors.push(`清理缩略图缓存失败: ${error.message}`)
          logHandler('clear-app-cache', `Failed to clear thumbnails: ${error.message}`, 'error')
        }
      }

      // 清理下载临时文件（.download 文件）
      try {
        const allFiles = fs.readdirSync(downloadPath)
        allFiles.forEach(file => {
          if (file.endsWith('.download')) {
            const filePath = path.join(downloadPath, file)
            try {
              fs.unlinkSync(filePath)
              results.tempFilesDeleted++
            } catch (e: any) {
              results.errors.push(`删除临时文件失败 (${file}): ${e.message}`)
            }
          }
        })
        if (results.tempFilesDeleted > 0) {
          logHandler('clear-app-cache', `Deleted ${results.tempFilesDeleted} temp files`)
        }
      } catch (error: any) {
        results.errors.push(`清理临时文件失败: ${error.message}`)
        logHandler('clear-app-cache', `Failed to clear temp files: ${error.message}`, 'error')
      }
    }

    // 2. 清理 Electron 渲染进程缓存（可选）
    try {
      const windows = BrowserWindow.getAllWindows()
      for (const win of windows) {
        await win.webContents.session.clearCache()
        await win.webContents.session.clearStorageData()
        logHandler('clear-app-cache', 'Cleared renderer cache and storage')
      }
    } catch (error: any) {
      results.errors.push(`清理渲染缓存失败: ${error.message}`)
      logHandler('clear-app-cache', `Failed to clear renderer cache: ${error.message}`, 'error')
    }

    return {
      success: true,
      ...results,
    }
  } catch (error: any) {
    logHandler('clear-app-cache', `Clear failed: ${error.message}`, 'error')
    return {
      success: false,
      error: error.message,
      thumbnailsDeleted: 0,
      tempFilesDeleted: 0,
      errors: [error.message],
    }
  }
})

/**
 * 获取缓存信息
 * 返回缩略图和临时文件的数量
 */
ipcMain.handle('get-cache-info', async (_event, downloadPath?: string) => {
  try {
    const info = {
      thumbnailsCount: 0,
      tempFilesCount: 0,
    }

    if (!downloadPath || !fs.existsSync(downloadPath)) {
      return { success: true, info }
    }

    // 统计缩略图数量
    const thumbnailDir = path.join(downloadPath, '.thumbnails')
    if (fs.existsSync(thumbnailDir)) {
      try {
        const files = fs.readdirSync(thumbnailDir)
        info.thumbnailsCount = files.length
      } catch (error: any) {
        logHandler('get-cache-info', `Failed to count thumbnails: ${error.message}`, 'error')
      }
    }

    // 统计临时文件数量
    try {
      const allFiles = fs.readdirSync(downloadPath)
      info.tempFilesCount = allFiles.filter(file => file.endsWith('.download')).length
    } catch (error: any) {
      logHandler('get-cache-info', `Failed to count temp files: ${error.message}`, 'error')
    }

    return {
      success: true,
      info,
    }
  } catch (error: any) {
    logHandler('get-cache-info', `Get failed: ${error.message}`, 'error')
    return {
      success: false,
      error: error.message,
      info: { thumbnailsCount: 0, tempFilesCount: 0 },
    }
  }
})
