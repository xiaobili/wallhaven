/**
 * Download Management IPC Handlers
 * Handles wallpaper downloads with progress tracking
 */

import { ipcMain, BrowserWindow } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import axios from 'axios'
import { streamPipeline, logHandler } from './base'

export function registerDownloadHandlers(): void {
  /**
   * 下载壁纸
   */
  ipcMain.handle(
    'download-wallpaper',
    async (
      _event,
      {
        url,
        filename,
        saveDir,
      }: {
        url: string
        filename: string
        saveDir: string
      },
    ) => {
      try {
        // 确保目录存在
        if (!fs.existsSync(saveDir)) {
          fs.mkdirSync(saveDir, { recursive: true })
        }

        const filePath = path.join(saveDir, filename)

        // 如果文件已存在，添加序号
        let finalPath = filePath
        let counter = 1
        while (fs.existsSync(finalPath)) {
          const ext = path.extname(filename)
          const nameWithoutExt = filename.replace(ext, '')
          finalPath = path.join(saveDir, `${nameWithoutExt}_${counter}${ext}`)
          counter++
        }

        // 下载文件
        const response = await axios({
          method: 'GET',
          url: url,
          responseType: 'stream',
          timeout: 60000, // 60秒超时
        })

        await streamPipeline(response.data, fs.createWriteStream(finalPath))

        return {
          success: true,
          filePath: finalPath,
          error: null,
        }
      } catch (error: any) {
        logHandler('download-wallpaper', `Error: ${error.message}`, 'error')
        return {
          success: false,
          filePath: null,
          error: error.message,
        }
      }
    },
  )

  /**
   * 开始下载任务（带进度回调）
   */
  ipcMain.handle(
    'start-download-task',
    async (
      _event,
      {
        taskId,
        url,
        filename,
        saveDir,
      }: {
        taskId: string
        url: string
        filename: string
        saveDir: string
      },
    ) => {
      try {
        // 确保目录存在
        if (!fs.existsSync(saveDir)) {
          fs.mkdirSync(saveDir, { recursive: true })
        }

        const filePath = path.join(saveDir, filename)

        // 如果文件已存在，直接完成
        if (fs.existsSync(filePath)) {
          // 通知渲染进程任务完成
          const windows = BrowserWindow.getAllWindows()
          if (windows.length > 0) {
            windows[0].webContents.send('download-progress', {
              taskId,
              progress: 100,
              offset: fs.statSync(filePath).size,
              speed: 0,
              state: 'completed',
              filePath,
            })
          }

          return {
            success: true,
            filePath,
            message: '文件已存在',
          }
        }

        // 创建临时文件
        const tempPath = filePath + '.download'

        // 下载文件并跟踪进度
        const response = await axios({
          method: 'GET',
          url,
          responseType: 'stream',
          timeout: 60000,
        })

        const totalSize = parseInt(String(response.headers['content-length'] || '0'), 10)

        let downloadedSize = 0
        let lastTime = Date.now()
        let lastSize = 0

        const writer = fs.createWriteStream(tempPath)

        response.data.on('data', (chunk: Buffer) => {
          downloadedSize += chunk.length

          // 每100ms更新一次进度
          const now = Date.now()
          if (now - lastTime >= 100) {
            const speed = (downloadedSize - lastSize) / ((now - lastTime) / 1000)
            const progress = totalSize > 0 ? (downloadedSize / totalSize) * 100 : 0

            // 发送进度到渲染进程
            const windows = BrowserWindow.getAllWindows()
            if (windows.length > 0) {
              const progressData = {
                taskId,
                progress: Math.min(progress, 99), // 最多99%，完成时设为100%
                offset: downloadedSize,
                speed,
                state: 'downloading',
                totalSize,
              }
              windows[0].webContents.send('download-progress', progressData)
            }

            lastTime = now
            lastSize = downloadedSize
          }
        })

        // 使用pipeline确保流正确关闭
        await streamPipeline(response.data, writer)

        // 重命名临时文件为正式文件
        fs.renameSync(tempPath, filePath)

        const finalSize = fs.statSync(filePath).size

        // 通知渲染进程任务完成
        const windows = BrowserWindow.getAllWindows()
        if (windows.length > 0) {
          const completeData = {
            taskId,
            progress: 100,
            offset: finalSize,
            speed: 0,
            state: 'completed',
            filePath,
          }
          windows[0].webContents.send('download-progress', completeData)
        }

        return {
          success: true,
          filePath,
          size: finalSize,
        }
      } catch (error: any) {
        logHandler('start-download-task', `Error: ${error.message}`, 'error')

        // 清理临时文件
        const tempPath = path.join(saveDir, filename + '.download')
        if (fs.existsSync(tempPath)) {
          try {
            fs.unlinkSync(tempPath)
          } catch (e) {
            // 忽略删除错误
          }
        }

        // 通知渲染进程下载失败
        const windows = BrowserWindow.getAllWindows()
        if (windows.length > 0) {
          windows[0].webContents.send('download-progress', {
            taskId,
            progress: 0,
            offset: 0,
            speed: 0,
            state: 'waiting',
            error: error.message || '下载失败',
          })
        }

        return {
          success: false,
          error: error.message || '下载失败',
        }
      }
    },
  )
}
