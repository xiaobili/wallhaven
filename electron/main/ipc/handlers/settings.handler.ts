/**
 * Settings Storage IPC Handlers
 */

import { ipcMain } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import { logHandler } from './base'

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
    logHandler('save-settings', `Error: ${error.message}`, 'error')
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
    logHandler('load-settings', `Error: ${error.message}`, 'error')
    return { success: false, error: error.message, settings: null }
  }
})
