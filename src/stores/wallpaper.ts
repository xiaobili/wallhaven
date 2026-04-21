// Wallhaven 壁纸状态管理

import { defineStore } from 'pinia'
import { ref, reactive } from 'vue'
import type { TotalPageData, GetParams, WallpaperItem } from '@/types'
import { searchWallpapers } from '@/services/wallpaperApi'

export const useWallpaperStore = defineStore('wallpaper', () => {
  // State
  const totalPageData = reactive<TotalPageData>({
    totalPage: 0,
    currentPage: 0,
    sections: [],
  })

  const loading = ref<boolean>(false)
  const error = ref<boolean>(false)
  const queryParams = ref<GetParams | null>(null)

  // Actions
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

      // 清空旧数据并设置新数据
      totalPageData.sections = []
      totalPageData.sections.push(data)
      // 确保转换为数字类型，避免 NaN 问题
      totalPageData.totalPage = Number(data.meta.last_page) || 0
      totalPageData.currentPage = Number(data.meta.current_page) || 0
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
      const currentPage = Number(totalPageData.currentPage) || 0
      const nextPage = currentPage + 1

      const params = {
        ...queryParams.value,
        page: nextPage,
      }

      const data = await searchWallpapers(params)
      // 追加新数据
      totalPageData.sections.push(data)
      // 确保转换为数字类型
      totalPageData.currentPage = Number(data.meta.current_page) || 0
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
    totalPageData.sections = []
    totalPageData.totalPage = 0
    totalPageData.currentPage = 0
    queryParams.value = null
    error.value = false
  }

  return {
    // State
    totalPageData,
    loading,
    error,
    queryParams,

    // Actions
    fetchWallpapers,
    loadMoreWallpapers,
    resetState,
  }
})
