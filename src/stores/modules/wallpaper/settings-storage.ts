// Wallhaven 设置本地存储管理

import type { AppSettings } from './state'
import { storeGet, storeSet } from '@/utils/store'

const SETTINGS_STORAGE_KEY = 'appSettings'

/**
 * 保存应用设置到 electron-store
 */
export async function saveSettingsToStorage(settings: AppSettings): Promise<void> {
  try {
    await storeSet(SETTINGS_STORAGE_KEY, settings)
  } catch (err) {
    console.error('保存应用设置到 electron-store 失败:', err)
  }
}

/**
 * 从 electron-store 获取保存的应用设置
 */
export async function getSettingsFromStorage(): Promise<AppSettings | null> {
  try {
    const stored = await storeGet<AppSettings>(SETTINGS_STORAGE_KEY)
    return stored
  } catch (err) {
    console.error('从 electron-store 获取应用设置失败:', err)
  }

  return null
}
