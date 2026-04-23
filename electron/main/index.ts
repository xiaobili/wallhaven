import { app, BrowserWindow, shell, protocol } from 'electron'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { existsSync } from 'node:fs'
//import icon from '../../resources/icon.png?asset'

// 获取当前文件的目录路径
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// 导入IPC handlers
import './ipc/handlers'

/**
 * 注册自定义协议用于加载本地文件
 * 使用 wallhaven:// 协议访问本地文件
 */
function registerLocalFileProtocol() {
  protocol.registerFileProtocol('wallhaven', (request, callback) => {
    const url = request.url.replace(/^wallhaven:\/\//, '')
    try {
      return callback(decodeURIComponent(url))
    } catch (error) {
      console.error('[Protocol] Failed to register protocol:', error)
      callback({ error: -2 }) // net::FAILED
    }
  })
}

function createWindow(): void {
  // 解析 preload 脚本路径（注意：electron-vite 输出 .mjs 文件）
  const preloadPath = join(__dirname, '..', 'preload', 'index.mjs')

  // 调试：检查文件是否存在
  console.log('[Electron] __dirname:', __dirname)
  console.log('[Electron] Preload path:', preloadPath)
  console.log('[Electron] Preload exists:', existsSync(preloadPath))

  if (!existsSync(preloadPath)) {
    console.error('[Electron] ❌ Preload script not found at:', preloadPath)
    console.error('[Electron] Please run "npm run build" first or check electron.vite.config.ts')
  }

  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1900,
    height: 800,
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

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()

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

  createWindow()

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
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
