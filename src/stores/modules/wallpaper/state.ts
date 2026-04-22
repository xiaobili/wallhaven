// Wallhaven 壁纸状态定义

import { ref, reactive } from 'vue'
import type { TotalPageData, GetParams, CustomParams } from '@/types'

/**
 * 应用设置接口
 */
export interface AppSettings {
  // 下载设置
  downloadPath: string
  maxConcurrentDownloads: number
  
  // API 设置
  apiKey: string
  
  // 桌面设置
  wallpaperFit: 'fill' | 'fit' | 'stretch' | 'tile' | 'center' | 'span'
}

/**
 * 创建默认设置
 */
export function createDefaultSettings(): AppSettings {
  return {
    downloadPath: '',
    maxConcurrentDownloads: 3,
    apiKey: '',
    wallpaperFit: 'fill',
  }
}

/**
 * 创建壁纸状态的初始值
 */
export function createInitialState() {
  const totalPageData = reactive<TotalPageData>({
    totalPage: 0,
    currentPage: 0,
    sections: [],
  })

  const loading = ref<boolean>(false)
  const error = ref<boolean>(false)
  const queryParams = ref<GetParams | null>(null)
  const savedParams = ref<CustomParams | null>(null)
  
  // 设置状态
  const settings = reactive<AppSettings>(createDefaultSettings())

  return {
    totalPageData,
    loading,
    error,
    queryParams,
    savedParams,
    settings,
  }
}
