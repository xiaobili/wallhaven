import { defineStore } from 'pinia'
import { ref, reactive, shallowRef } from 'vue'
import type { TotalPageData, GetParams, CustomParams, AppSettings, WallpaperFit } from '@/types'

/**
 * 创建默认设置
 */
function createDefaultSettings(): AppSettings {
  return {
    downloadPath: '',
    maxConcurrentDownloads: 3,
    apiKey: '',
    wallpaperFit: 'fill' as WallpaperFit,
  }
}

export const useWallpaperStore = defineStore('wallpaper', () => {
  // ==================== 状态 ====================

  /** 壁纸数据（使用 shallowRef 优化性能） */
  const totalPageData = shallowRef<TotalPageData>({
    totalPage: 0,
    currentPage: 0,
    sections: [],
  })

  /** 加载状态 */
  const loading = ref<boolean>(false)

  /** 错误状态 */
  const error = ref<boolean>(false)

  /** 当前查询参数 */
  const queryParams = ref<GetParams | null>(null)

  /** 已保存的自定义参数 */
  const savedParams = ref<CustomParams | null>(null)

  /** 应用设置 */
  const settings = reactive<AppSettings>(createDefaultSettings())

  // ==================== 方法（由 Composable 调用） ====================

  /**
   * 重置状态
   */
  function resetState(): void {
    totalPageData.value = { totalPage: 0, currentPage: 0, sections: [] }
    queryParams.value = null
    error.value = false
  }

  return {
    // 状态
    totalPageData,
    loading,
    error,
    queryParams,
    savedParams,
    settings,

    // 方法
    resetState,
  }
})
