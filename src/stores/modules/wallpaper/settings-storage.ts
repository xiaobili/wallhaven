// Wallhaven 设置本地存储管理

import type { AppSettings } from './state'

const SETTINGS_STORAGE_KEY = 'wallhaven_app_settings'

/**
 * 保存应用设置到 localStorage
 */
export function saveSettingsToStorage(settings: AppSettings): void {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings))
  } catch (err) {
    console.error('保存应用设置到 localStorage 失败:', err)
  }
}

/**
 * 从 localStorage 获取保存的应用设置
 */
export function getSettingsFromStorage(): AppSettings | null {
  try {
    const stored = localStorage.getItem(SETTINGS_STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored) as AppSettings
    }
  } catch (err) {
    console.error('从 localStorage 获取应用设置失败:', err)
  }

  return null
}
