/**
 * Window Control IPC Handlers
 */

import { ipcMain, BrowserWindow } from 'electron'

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
