import { ipcMain, dialog, shell, BrowserWindow } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import axios from 'axios'
import { pipeline } from 'stream'
import { promisify } from 'util'
import sharp from 'sharp'

const streamPipeline = promisify(pipeline)

/**
 * 选择文件夹对话框
 */
ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory'],
    title: '选择下载目录'
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
    const imageFiles = files.filter(file => {
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
          height
        }
      })
    )
    
    return { error: null, files: fileDetails }
  } catch (error: any) {
    console.error('读取目录失败:', error)
    return { error: error.message, files: [] }
  }
})

/**
 * 获取图片尺寸（使用简单的文件头解析）
 */
function getImageDimensions(filePath: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const buffer = Buffer.alloc(24)
    const fd = fs.openSync(filePath, 'r')
    
    fs.read(fd, buffer, 0, 24, 0, (err, bytesRead) => {
      fs.closeSync(fd)
      
      if (err || bytesRead < 24) {
        // 读取失败，返回默认值而不是抛出错误
        resolve({ width: 0, height: 0 })
        return
      }
      
      try {
        let width = 0
        let height = 0
        
        // JPEG
        if (buffer[0] === 0xFF && buffer[1] === 0xD8) {
          let offset = 2
          while (offset < bytesRead - 9) {
            if (buffer[offset] !== 0xFF) {
              offset++
              continue
            }
            const marker = buffer[offset + 1]
            if (marker === 0xC0 || marker === 0xC1 || marker === 0xC2) {
              height = buffer.readUInt16BE(offset + 5)
              width = buffer.readUInt16BE(offset + 7)
              break
            }
            const segmentLength = buffer.readUInt16BE(offset + 2)
            if (segmentLength < 2) break
            offset += 2 + segmentLength
          }
        }
        // PNG
        else if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
          width = buffer.readUInt32BE(16)
          height = buffer.readUInt32BE(20)
        }
        // GIF
        else if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) {
          width = buffer.readUInt16LE(6)
          height = buffer.readUInt16LE(8)
        }
        // WebP
        else if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46) {
          // WebP 需要更多字节，简单返回 0
          width = 0
          height = 0
        }
        // BMP
        else if (buffer[0] === 0x42 && buffer[1] === 0x4D) {
          width = buffer.readInt32LE(18)
          height = Math.abs(buffer.readInt32LE(22))
        }
        
        // 如果解析成功且尺寸有效，返回结果
        if (width > 0 && height > 0) {
          resolve({ width, height })
        } else {
          // 无法解析或尺寸为0，返回默认值
          resolve({ width: 0, height: 0 })
        }
      } catch (e) {
        // 解析出错，返回默认值而不是拒绝
        console.warn(`[getImageDimensions] 解析失败 (${filePath}):`, e)
        resolve({ width: 0, height: 0 })
      }
    })
  })
}

/**
 * 生成图片缩略图
 * @param imagePath 原图路径
 * @param dirPath 目录路径
 * @param fileName 文件名
 * @returns 缩略图路径
 */
async function generateThumbnail(imagePath: string, dirPath: string, fileName: string): Promise<string> {
  try {
    // 创建缩略图缓存目录
    const cacheDir = path.join(dirPath, '.thumbnails')
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true })
    }
    
    // 生成缩略图文件名（使用原文件名的hash + 扩展名）
    const ext = path.extname(fileName).toLowerCase()
    const baseName = path.basename(fileName, ext)
    const thumbnailFileName = `${baseName}_thumb.jpg` // 统一转为jpg格式
    const thumbnailFilePath = path.join(cacheDir, thumbnailFileName)
    
    // 如果缩略图已存在，直接返回
    if (fs.existsSync(thumbnailFilePath)) {
      return thumbnailFilePath
    }
    
    // 使用 sharp 生成缩略图
    await sharp(imagePath)
      .resize(300, 200, {
        fit: 'cover', // 裁剪并填充，保持比例
        position: 'center' // 从中心裁剪
      })
      .jpeg({ quality: 80 }) // 转换为JPEG，质量80%
      .toFile(thumbnailFilePath)
    
    console.log(`[Thumbnail] Generated: ${thumbnailFileName}`)
    return thumbnailFilePath
  } catch (error) {
    console.warn(`[Thumbnail] Failed to generate for ${fileName}:`, error)
    // 失败时返回空字符串，前端将使用原图
    return ''
  }
}

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
    console.error('删除文件失败:', error)
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
    console.error('打开文件夹失败:', error)
    return { success: false, error: error.message }
  }
})

/**
 * 下载壁纸
 */
ipcMain.handle('download-wallpaper', async (_event, { url, filename, saveDir }: { 
  url: string
  filename: string
  saveDir: string
}) => {
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
      timeout: 60000 // 60秒超时
    })
    
    await streamPipeline(response.data, fs.createWriteStream(finalPath))
    
    return { 
      success: true, 
      filePath: finalPath,
      error: null 
    }
  } catch (error: any) {
    console.error('下载壁纸失败:', error)
    return { 
      success: false, 
      filePath: null,
      error: error.message 
    }
  }
})

/**
 * 设置桌面壁纸
 * 注意：需要安装 wallpaper 包
 */
ipcMain.handle('set-wallpaper', async (_event, imagePath: string) => {
  try {
    if (!fs.existsSync(imagePath)) {
      return { success: false, error: '图片文件不存在' }
    }
    
    // 动态导入 wallpaper 包（使用命名导出）
    const { setWallpaper } = await import('wallpaper')
    await setWallpaper(imagePath)
    
    return { success: true, error: null }
  } catch (error: any) {
    console.error('设置壁纸失败:', error)
    return { success: false, error: error.message }
  }
})

/**
 * 保存应用设置到本地存储
 */
ipcMain.handle('save-settings', async (_event, settings: any) => {
  try {
    const { app } = await import('electron')
    const userDataPath = app.getPath('userData')
    const settingsPath = path.join(userDataPath, 'settings.json')
    
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2))
    return { success: true }
  } catch (error: any) {
    console.error('保存设置失败:', error)
    return { success: false, error: error.message }
  }
})

/**
 * 加载应用设置
 */
ipcMain.handle('load-settings', async () => {
  try {
    const { app } = await import('electron')
    const userDataPath = app.getPath('userData')
    const settingsPath = path.join(userDataPath, 'settings.json')
    
    if (!fs.existsSync(settingsPath)) {
      return { success: true, settings: null }
    }
    
    const data = fs.readFileSync(settingsPath, 'utf-8')
    const settings = JSON.parse(data)
    
    return { success: true, settings }
  } catch (error: any) {
    console.error('加载设置失败:', error)
    return { success: false, error: error.message, settings: null }
  }
})

/**
 * 开始下载任务（带进度回调）
 */
ipcMain.handle('start-download-task', async (_event, { taskId, url, filename, saveDir }: {
  taskId: string
  url: string
  filename: string
  saveDir: string
}) => {
  console.log('[Main Process] 开始下载任务:', { taskId, url, filename, saveDir })
  
  try {
    // 确保目录存在
    if (!fs.existsSync(saveDir)) {
      console.log('[Main Process] 创建下载目录:', saveDir)
      fs.mkdirSync(saveDir, { recursive: true })
    }
    
    const filePath = path.join(saveDir, filename)
    console.log('[Main Process] 文件路径:', filePath)
    
    // 如果文件已存在，直接完成
    if (fs.existsSync(filePath)) {
      console.log('[Main Process] 文件已存在，直接完成')
      // 通知渲染进程任务完成
      const { BrowserWindow } = await import('electron')
      const windows = BrowserWindow.getAllWindows()
      if (windows.length > 0) {
        windows[0].webContents.send('download-progress', {
          taskId,
          progress: 100,
          offset: fs.statSync(filePath).size,
          speed: 0,
          state: 'completed',
          filePath
        })
      }
      
      return { 
        success: true, 
        filePath,
        message: '文件已存在'
      }
    }
    
    // 创建临时文件
    const tempPath = filePath + '.download'
    console.log('[Main Process] 临时文件路径:', tempPath)
    
    // 下载文件并跟踪进度
    console.log('[Main Process] 开始网络请求:', url)
    const response = await axios({
      method: 'GET',
      url,
      responseType: 'stream',
      timeout: 60000
    })
    
    const totalSize = parseInt(String(response.headers['content-length'] || '0'), 10)
    console.log('[Main Process] 文件大小:', totalSize, 'bytes')
    
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
        const { BrowserWindow } = require('electron')
        const windows = BrowserWindow.getAllWindows()
        if (windows.length > 0) {
          const progressData = {
            taskId,
            progress: Math.min(progress, 99), // 最多99%，完成时设为100%
            offset: downloadedSize,
            speed,
            state: 'downloading',
            totalSize
          }
          console.log('[Main Process] 发送进度:', progressData.progress.toFixed(2) + '%')
          windows[0].webContents.send('download-progress', progressData)
        }
        
        lastTime = now
        lastSize = downloadedSize
      }
    })
    
    // 使用pipeline确保流正确关闭
    console.log('[Main Process] 下载完成，重命名文件')
    await streamPipeline(response.data, writer)
    
    // 重命名临时文件为正式文件
    fs.renameSync(tempPath, filePath)
    
    const finalSize = fs.statSync(filePath).size
    console.log('[Main Process] 文件大小:', finalSize, 'bytes')
    
    // 通知渲染进程任务完成
    const { BrowserWindow } = await import('electron')
    const windows = BrowserWindow.getAllWindows()
    if (windows.length > 0) {
      const completeData = {
        taskId,
        progress: 100,
        offset: finalSize,
        speed: 0,
        state: 'completed',
        filePath
      }
      console.log('[Main Process] 发送完成事件:', completeData)
      windows[0].webContents.send('download-progress', completeData)
    }
    
    return { 
      success: true, 
      filePath,
      size: finalSize
    }
  } catch (error: any) {
    console.error('下载任务失败:', error)
    
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
    const { BrowserWindow } = await import('electron')
    const windows = BrowserWindow.getAllWindows()
    if (windows.length > 0) {
      windows[0].webContents.send('download-progress', {
        taskId,
        progress: 0,
        offset: 0,
        speed: 0,
        state: 'waiting',
        error: error.message || '下载失败'
      })
    }
    
    return { 
      success: false, 
      error: error.message || '下载失败'
    }
  }
})

/**
 * Wallhaven API 代理
 * 用于生产环境中绕过 CORS 限制
 */
ipcMain.handle('wallhaven-api-request', async (_event, { endpoint, params }: {
  endpoint: string
  params?: any
}) => {
  try {
    const apiKey = params?.apiKey
    
    // 构建请求URL
    const url = `https://wallhaven.cc/api/v1${endpoint}`
    
    console.log('[Wallhaven API Proxy] Request:', url, 'Params:', params)
    
    // 发起请求
    const response = await axios.get(url, {
      params: params ? { ...params, apiKey: undefined } : {}, // 移除 apiKey 参数
      headers: {
        'User-Agent': 'Wallhaven-Desktop-App/1.0',
        ...(apiKey ? { 'X-API-Key': apiKey } : {})
      },
      timeout: 15000
    })
    
    console.log('[Wallhaven API Proxy] Response status:', response.status)
    
    return {
      success: true,
      data: response.data
    }
  } catch (error: any) {
    console.error('[Wallhaven API Proxy] Error:', error.message)
    
    return {
      success: false,
      error: error.message,
      status: error.response?.status,
      data: null
    }
  }
})

/**
 * 窗口控制 - 最小化
 */
ipcMain.handle('window-minimize', async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  if (win) {
    win.minimize()
  }
})

/**
 * 窗口控制 - 最大化/还原
 */
ipcMain.handle('window-maximize', async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  if (win) {
    if (win.isMaximized()) {
      win.unmaximize()
    } else {
      win.maximize()
    }
  }
})

/**
 * 窗口控制 - 关闭
 */
ipcMain.handle('window-close', async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  if (win) {
    win.close()
  }
})

/**
 * 窗口控制 - 检查是否最大化
 */
ipcMain.handle('window-is-maximized', async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  return win ? win.isMaximized() : false
})
