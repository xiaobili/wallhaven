/**
 * Electron Store IPC Handlers
 *
 * IMPORTANT: Uses dynamic import to avoid circular dependency with main/index.ts
 */

import { ipcMain } from 'electron'
import { logHandler } from './base'

/**
 * Electron Store - 获取值
 */
ipcMain.handle('store-get', async (_event, key: string) => {
  try {
    // CRITICAL: Dynamic import to avoid circular dependency
    const { store } = await import('../../index')
    const value = store.get(key)
    return { success: true, value }
  } catch (error: any) {
    logHandler('store-get', `Error: ${error.message}`, 'error')
    return { success: false, error: error.message, value: null }
  }
})

/**
 * Electron Store - 设置值
 */
ipcMain.handle('store-set', async (_event, { key, value }: { key: string; value: any }) => {
  try {
    const { store } = await import('../../index')
    store.set(key, value)
    return { success: true }
  } catch (error: any) {
    logHandler('store-set', `Error: ${error.message}`, 'error')
    return { success: false, error: error.message }
  }
})

/**
 * Electron Store - 删除值
 */
ipcMain.handle('store-delete', async (_event, key: string) => {
  try {
    const { store } = await import('../../index')
    // @ts-ignore - electron-store 的类型定义过于严格，但运行时支持任意字符串 key
    store.delete(key)
    return { success: true }
  } catch (error: any) {
    logHandler('store-delete', `Error: ${error.message}`, 'error')
    return { success: false, error: error.message }
  }
})

/**
 * Electron Store - 清空所有数据
 */
ipcMain.handle('store-clear', async () => {
  try {
    const { store } = await import('../../index')
    store.clear()
    return { success: true }
  } catch (error: any) {
    logHandler('store-clear', `Error: ${error.message}`, 'error')
    return { success: false, error: error.message }
  }
})
