/* eslint-disable @typescript-eslint/ban-ts-comment */
/**
 * Electron Store IPC Handlers
 *
 * Uses static imports — the circular dependency with index.ts was broken
 * by extracting `store` into its own module (store.ts).
 */

import { ipcMain } from 'electron'
import { store } from '../../store'
import { logHandler } from './base'
import { getQueueInstance } from './download-queue'

export function registerStoreHandlers(): void {
  /**
   * Electron Store - 获取值
   */
  ipcMain.handle('store-get', (_event, key: string) => {
    try {
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
  ipcMain.handle('store-set', (_event, { key, value }: { key: string; value: any }) => {
    try {
      store.set(key, value)

      // DL-03: Live propagation of maxConcurrentDownloads setting
      // When appSettings change (e.g., concurrency slider), re-evaluate queue
      if (key === 'appSettings') {
        getQueueInstance()?.processQueue()
      }

      return { success: true }
    } catch (error: any) {
      logHandler('store-set', `Error: ${error.message}`, 'error')
      return { success: false, error: error.message }
    }
  })

  /**
   * Electron Store - 删除值
   */
  ipcMain.handle('store-delete', (_event, key: string) => {
    try {
      // @ts-expect-error
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
  ipcMain.handle('store-clear', () => {
    try {
      store.clear()
      return { success: true }
    } catch (error: any) {
      logHandler('store-clear', `Error: ${error.message}`, 'error')
      return { success: false, error: error.message }
    }
  })
}
