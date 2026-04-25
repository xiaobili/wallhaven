// Wallhaven 壁纸业务逻辑

import type { Ref, Reactive, ShallowRef } from 'vue'
import type { TotalPageData, GetParams, CustomParams, AppSettings } from '@/types'
import { searchWallpapers } from '@/services/wallpaperApi'
import { saveCustomParamsToStorage, getSavedParamsFromStorage } from './storage'
import { saveSettingsToStorage, getSettingsFromStorage } from './settings-storage'

/**
 * 创建壁纸 actions（优化版）
 */
export function createWallpaperActions(
  totalPageData: ShallowRef<TotalPageData>,
  loading: Ref<boolean>,
  error: Ref<boolean>,
  queryParams: Ref<GetParams | null>,
  savedParams: Ref<CustomParams | null>,
  settings: Reactive<AppSettings>,
) {
  /**
   * 搜索壁纸（替换现有数据）
   */
  async function fetchWallpapers(params: GetParams | null): Promise<void> {
    loading.value = true
    error.value = false

    try {
      // 过滤空值参数
      const finalParams = params
        ? (Object.fromEntries(
            Object.entries(params).filter(
              ([_, value]) => value !== null && value !== undefined && value !== '',
            ),
          ) as GetParams)
        : null

      queryParams.value = finalParams

      const data = await searchWallpapers(finalParams)

      // 使用新对象替换，触发 shallowRef 更新
      totalPageData.value = {
        sections: [data],
        totalPage: Number(data.meta.last_page) || 0,
        currentPage: Number(data.meta.current_page) || 0,
      }
    } catch (err) {
      console.error('获取壁纸数据失败:', err)
      error.value = true
    } finally {
      loading.value = false
    }
  }

  /**
   * 加载更多壁纸（追加数据）
   */
  async function loadMoreWallpapers(): Promise<void> {
    if (!queryParams.value || loading.value) return

    loading.value = true
    error.value = false

    try {
      // 确保 currentPage 是数字类型
      const currentPage = Number(totalPageData.value.currentPage) || 0
      const nextPage = currentPage + 1

      const params = {
        ...queryParams.value,
        page: nextPage,
      }

      const data = await searchWallpapers(params)

      // 创建新数组以触发 shallowRef 更新
      const newSections = [...totalPageData.value.sections, data]
      totalPageData.value = {
        ...totalPageData.value,
        sections: newSections,
        currentPage: Number(data.meta.current_page) || 0,
      }
    } catch (err) {
      console.error('加载更多壁纸失败:', err)
      error.value = true
    } finally {
      loading.value = false
    }
  }

  /**
   * 重置状态
   */
  function resetState(): void {
    totalPageData.value = {
      sections: [],
      totalPage: 0,
      currentPage: 0,
    }
    queryParams.value = null
    error.value = false
  }

  /**
   * 保存自定义搜索参数
   */
  async function saveCustomParams(params: CustomParams): Promise<void> {
    // 确保selector为0
    params.selector = 0
    savedParams.value = { ...params }
    // 保存到 electron-store
    await saveCustomParamsToStorage(params)
  }

  /**
   * 获取保存的自定义搜索参数
   */
  async function getSavedParams(): Promise<CustomParams | null> {
    // 优先从内存中获取
    if (savedParams.value) {
      return savedParams.value
    }

    // 否则从 electron-store 中获取
    const params = await getSavedParamsFromStorage()
    if (params) {
      // 同步到内存中
      savedParams.value = params
    }

    return params
  }

  /**
   * 更新应用设置
   */
  async function updateSettings(newSettings: Partial<AppSettings>): Promise<void> {
    // 合并新设置
    Object.assign(settings, newSettings)
    // 保存到 electron-store
    await saveSettingsToStorage(settings)
  }

  /**
   * 加载保存的应用设置
   */
  async function loadSettings(): Promise<void> {
    const savedSettings = await getSettingsFromStorage()
    if (savedSettings) {
      Object.assign(settings, savedSettings)
    }
  }

  return {
    fetchWallpapers,
    loadMoreWallpapers,
    resetState,
    saveCustomParams,
    getSavedParams,
    updateSettings,
    loadSettings,
  }
}
