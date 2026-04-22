// Wallhaven 壁纸本地存储管理

import type { CustomParams } from '@/types'

const STORAGE_KEY = 'wallhaven_query_params'

/**
 * 保存自定义搜索参数到 localStorage
 */
export function saveCustomParamsToStorage(params: CustomParams): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(params))
  } catch (err) {
    console.error('保存自定义搜索参数到 localStorage 失败:', err)
  }
}

/**
 * 从 localStorage 获取保存的自定义搜索参数
 */
export function getSavedParamsFromStorage(): CustomParams | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored) as CustomParams
    }
  } catch (err) {
    console.error('从 localStorage 获取自定义搜索参数失败:', err)
  }

  return null
}
