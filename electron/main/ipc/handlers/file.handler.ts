/**
 * File Operations IPC Handlers
 */

import { ipcMain, dialog, shell } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import { getImageDimensions, generateThumbnail, logHandler } from './base'

export function registerFileHandlers(): void {
  /**
   * 选择文件夹对话框
   */
  ipcMain.handle('select-folder', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: '选择下载目录',
    })

    if (result.canceled || result.filePaths.length === 0) {
      return null
    }

    return result.filePaths[0]
  })

  /**
   * 读取目录内容（带缩略图）
   */
  ipcMain.handle('read-directory', async (_event, dirPath: string) => {
    try {
      if (!fs.existsSync(dirPath)) {
        return { error: '目录不存在', files: [] }
      }

      const files = fs.readdirSync(dirPath)
      const imageFiles = files.filter((file) => {
        const ext = path.extname(file).toLowerCase()
        return ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'].includes(ext)
      })

      const fileDetails = await Promise.all(
        imageFiles.map(async (file) => {
          const filePath = path.join(dirPath, file)
          const stats = fs.statSync(filePath)

          // 获取图片尺寸和生成缩略图
          let width = 0
          let height = 0
          let thumbnailPath = ''

          try {
            const sizeInfo = await getImageDimensions(filePath)
            width = sizeInfo.width
            height = sizeInfo.height

            // 生成缩略图
            thumbnailPath = await generateThumbnail(filePath, dirPath, file)
          } catch (e) {
            // 静默失败，使用默认值
            width = 0
            height = 0
            thumbnailPath = ''
          }

          return {
            name: file,
            path: filePath,
            thumbnailPath: thumbnailPath, // 缩略图路径
            size: stats.size,
            modifiedAt: stats.mtimeMs,
            width,
            height,
          }
        }),
      )

      return { error: null, files: fileDetails }
    } catch (error: any) {
      logHandler('read-directory', `Error: ${error.message}`, 'error')
      return { error: error.message, files: [] }
    }
  })

  /**
   * 删除文件
   */
  ipcMain.handle('delete-file', async (_event, filePath: string) => {
    try {
      if (!fs.existsSync(filePath)) {
        return { success: false, error: '文件不存在' }
      }

      fs.unlinkSync(filePath)
      return { success: true, error: null }
    } catch (error: any) {
      logHandler('delete-file', `Error: ${error.message}`, 'error')
      return { success: false, error: error.message }
    }
  })

  /**
   * 打开文件夹
   */
  ipcMain.handle('open-folder', async (_event, folderPath: string) => {
    try {
      await shell.openPath(folderPath)
      return { success: true }
    } catch (error: any) {
      logHandler('open-folder', `Error: ${error.message}`, 'error')
      return { success: false, error: error.message }
    }
  })
}
