import { app, BrowserWindow, shell, protocol } from 'electron'
import { join, dirname, extname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { existsSync, readFileSync } from 'node:fs'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { store } from './store'

// 获取当前文件的目录路径
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// 将 store 实例导出供其他模块使用
export { store }

// Splash 窗口实例
let splashWindow: BrowserWindow | null = null
let splashMinTimePromise: Promise<void> | null = null
let splashTimeoutId: NodeJS.Timeout | null = null

// 导入IPC handlers (modular)
import { registerAllHandlers, verifyHandlers } from './ipc/handlers/index'

/**
 * 注册自定义协议用于加载本地文件
 * 使用 wallhaven:// 协议访问本地文件
 */
function registerLocalFileProtocol() {
  // MIME 类型映射表
  const mimeTypes: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.bmp': 'image/bmp',
    '.ico': 'image/x-icon',
  }

  protocol.handle('wallhaven', (request) => {
    const url = request.url.replace(/^wallhaven:\/\//, '')
    try {
      const filePath = decodeURIComponent(url)

      // 检查文件是否存在
      if (!existsSync(filePath)) {
        return new Response(null, { status: 404 })
      }

      // 读取文件内容
      const fileContent = readFileSync(filePath)

      // 检测 MIME 类型
      const ext = extname(filePath).toLowerCase()
      const mimeType = mimeTypes[ext] || 'application/octet-stream'

      // 返回文件内容
      return new Response(fileContent, {
        status: 200,
        headers: {
          'Content-Type': mimeType,
        },
      })
    } catch (error) {
      console.error('[Protocol] Failed to handle request:', error)
      return new Response(null, { status: 500 })
    }
  })
}

const windowWidth = 1900
const windowHeight = 800

function createWindow(): void {
  // 解析 preload 脚本路径（注意：electron-vite 输出 .mjs 文件）
  const preloadPath = join(__dirname, '..', 'preload', 'index.mjs')

  // 调试：检查文件是否存在
  console.log('[Electron] __dirname:', __dirname)
  console.log('[Electron] Preload path:', preloadPath)
  console.log('[Electron] Preload exists:', existsSync(preloadPath))

  if (!existsSync(preloadPath)) {
    console.error('[Electron] Preload script not found at:', preloadPath)
    console.error('[Electron] Please run "npm run build" first or check electron.vite.config.ts')
  }

  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    show: false,
    frame: false, // 移除默认标题栏，使用自定义UI
    autoHideMenuBar: true,
    //...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: preloadPath,
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  // Set initial opacity to 0 for fade-in transition
  mainWindow.setOpacity(0)

  mainWindow.on('ready-to-show', async () => {
    // Wait for BOTH minimum time AND window readiness
    await splashMinTimePromise

    // Show main window first (with opacity 0, invisible)
    mainWindow.show()

    // Animate fade: splash out, main in
    // Use interval-based opacity animation for smooth transition
    const fadeSteps = 20
    const fadeInterval = 10 // 10ms per step = 200ms total
    let step = 0

    const fadeAnimation = setInterval(() => {
      step++
      const progress = step / fadeSteps

      // Fade out splash (1 -> 0)
      splashWindow?.setOpacity(1 - progress)
      // Fade in main (0 -> 1)
      mainWindow.setOpacity(progress)

      if (step >= fadeSteps) {
        clearInterval(fadeAnimation)
        // Close splash after fade completes
        splashWindow?.close()
        splashWindow = null
        // Cleanup timer reference
        splashTimeoutId = null
        splashMinTimePromise = null
      }
    }, fadeInterval)

    // 在开发模式下打开开发者工具
    if (is.dev) {
      mainWindow.webContents.openDevTools()
    }
  })

  mainWindow.webContents.setWindowOpenHandler((details: any) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '..', 'renderer', 'index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // 注册自定义协议（必须在 app.whenReady 之后）
  registerLocalFileProtocol()

  // Set app user model id for windows
  electronApp.setAppUserModelId('com.wallhaven')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_: any, window: any) => {
    optimizer.watchWindowShortcuts(window)
  })

  // 创建 Splash 窗口
  splashWindow = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    frame: false,
    resizable: false,
    center: true,
    show: false,
    backgroundColor: '#1a1a1a',
    webPreferences: {
      sandbox: false,
    },
  })

  splashWindow.loadFile(join(__dirname, '..', 'renderer', 'splash.html'))

  splashWindow.on('ready-to-show', () => {
    splashWindow?.show()
  })

  // Minimum 1 second splash display timer
  splashMinTimePromise = new Promise((resolve) => {
    splashTimeoutId = setTimeout(resolve, 3000)
  })

  createWindow()

  // Register and verify all IPC handlers
  registerAllHandlers()
  verifyHandlers()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  // Cleanup splash timer if still pending
  if (splashTimeoutId) {
    clearTimeout(splashTimeoutId)
    splashTimeoutId = null
  }
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
