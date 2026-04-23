// Wallhaven 壁纸本地存储管理

import type { CustomParams } from '@/types'
import { storeGet, storeSet } from '@/utils/store'

const STORAGE_KEY = 'wallpaperQueryParams'

/**
 * 保存自定义搜索参数到 electron-store
 */
export async function saveCustomParamsToStorage(params: CustomParams): Promise<void> {
  try {
    await storeSet(STORAGE_KEY, params)
  } catch (err) {
    console.error('保存自定义搜索参数到 electron-store 失败:', err)
  }
}

/**
 * 从 electron-store 获取保存的自定义搜索参数
 */
export async function getSavedParamsFromStorage(): Promise<CustomParams | null> {
  try {
    const stored = await storeGet<CustomParams>(STORAGE_KEY)
    return stored
  } catch (err) {
    console.error('从 electron-store 获取自定义搜索参数失败:', err)
  }

  return null
}
