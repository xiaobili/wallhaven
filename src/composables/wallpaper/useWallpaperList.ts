/**
 * 壁纸列表管理 composable
 *
 * 封装壁纸列表的状态管理和业务逻辑
 * 协调 WallpaperService 和 WallpaperStore
 */

import { computed, onUnmounted, type ComputedRef } from 'vue'
import type { TotalPageData, GetParams, CustomParams, PageData } from '@/types'
import { useWallpaperStore } from '@/stores/modules/wallpaper'
import { wallpaperService, type WallpaperSearchResult } from '@/services'
import { useAlert } from '@/composables'

/**
 * 将 WallpaperSearchResult 转换为 PageData 格式
 */
function toPageData(result: WallpaperSearchResult): PageData {
  return {
    data: result.data,
    totalPage: result.meta.last_page,
    currentPage: result.meta.current_page,
  }
}

/**
 * useWallpaperList 返回值接口
 */
export interface UseWallpaperListReturn {
  // 状态（ComputedRef）
  wallpapers: ComputedRef<TotalPageData>
  currentPageData: ComputedRef<PageData>
  totalCount: ComputedRef<number>
  loading: ComputedRef<boolean>
  error: ComputedRef<boolean>
  queryParams: ComputedRef<GetParams | null>
  savedParams: ComputedRef<CustomParams | null>

  // 方法
  fetch: (params: GetParams | null) => Promise<boolean>
  goToPage: (page: number) => Promise<boolean>
  loadMore: () => Promise<boolean>
  refresh: () => Promise<boolean>
  clearCache: () => void
  reset: () => void
  saveCustomParams: (params: CustomParams) => Promise<boolean>
  loadSavedParams: () => Promise<CustomParams | null>
  updateItemFavoriteStatus: (wallpaperId: string, isFavorite: number) => void
}

/**
 * 创建壁纸列表管理 composable
 *
 * @returns 壁纸列表状态和方法
 *
 * @example
 * ```typescript
 * const { wallpapers, loading, fetch, loadMore } = useWallpaperList()
 *
 * // 获取壁纸
 * await fetch({ q: 'nature', page: 1 })
 *
 * // 加载更多
 * await loadMore()
 * ```
 */
export function useWallpaperList(): UseWallpaperListReturn {
  const store = useWallpaperStore()
  const { showError } = useAlert()

  /** 上次查询参数（用于检测变化） */
  let lastQueryParams: GetParams | null = null

  /** 搜索请求 AbortController (QUAL-03) */
  let searchAbortController: AbortController | null = null

  /**
   * 检查搜索参数是否变化
   */
  function isParamsChanged(params: GetParams | null): boolean {
    return JSON.stringify(lastQueryParams) !== JSON.stringify(params)
  }

  /**
   * 获取壁纸列表
   * @param params - 搜索参数
   * @returns 是否成功
   */
  const fetch = async (params: GetParams | null): Promise<boolean> => {
    // 取消前一个请求 (QUAL-03)
    searchAbortController?.abort()

    // 检测搜索条件是否变化
    if (isParamsChanged(params)) {
      store.clearPageCache()
      lastQueryParams = params ? { ...params } : null
    }

    // 创建新的 AbortController (QUAL-03)
    searchAbortController = new AbortController()

    store.loading = true
    store.error = false

    try {
      const result = await wallpaperService.search(params, {
        signal: searchAbortController.signal,
      })

      // 如果请求被取消，静默返回 (QUAL-03)
      if (!result.success && result.error?.code === 'ABORTED') {
        console.debug('Search request aborted:', params)
        return false
      }

      if (!result.success) {
        showError(result.error?.message || '获取壁纸失败')
        store.error = true
        store.loading = false
        return false
      }

      store.queryParams = params
      lastQueryParams = params ? { ...params } : null

      const pageData = toPageData(result.data!)
      store.totalPageData = {
        sections: [pageData],
        totalPage: pageData.totalPage,
        currentPage: pageData.currentPage,
      }

      // 同时更新分页状态
      store.setCachedPage(pageData.currentPage, pageData)
      store.currentPageData = { ...pageData }
      store.totalCount = result.data!.meta.total

      store.loading = false
      return true
    } catch (error) {
      // 处理取消错误 (QUAL-03)
      if (error instanceof Error && error.name === 'AbortError') {
        console.debug('Search request aborted:', params)
        return false
      }

      showError(error instanceof Error ? error.message : '获取壁纸失败')
      store.error = true
      store.loading = false
      return false
    } finally {
      searchAbortController = null
    }
  }

  /**
   * 跳转到指定页
   * @param page - 页码（1-based）
   * @returns 是否成功
   */
  const goToPage = async (page: number): Promise<boolean> => {
    // 边界检查
    if (page < 1) return false

    const cachedTotalPage = store.currentPageData.totalPage
    if (cachedTotalPage > 0 && page > cachedTotalPage) return false

    // 检查缓存
    const cached = store.getCachedPage(page)
    if (cached) {
      store.currentPageData = { ...cached }
      // 同步更新 totalPageData 以触发 WallpaperList 组件更新
      store.totalPageData = {
        sections: [cached],
        totalPage: cached.totalPage,
        currentPage: cached.currentPage,
      }
      return true
    }

    // 从 API 加载时添加取消支持 (QUAL-03)
    searchAbortController?.abort()
    searchAbortController = new AbortController()

    store.loading = true
    store.error = false

    try {
      const params: GetParams = { ...store.queryParams, page } as GetParams
      const result = await wallpaperService.search(params, {
        signal: searchAbortController.signal,
      })

      // 处理取消 (QUAL-03)
      if (!result.success && result.error?.code === 'ABORTED') {
        console.debug('Page load request aborted:', page)
        return false
      }

      if (!result.success) {
        showError(result.error?.message || '获取壁纸失败')
        store.error = true
        store.loading = false
        return false
      }

      const pageData = toPageData(result.data!)
      store.setCachedPage(page, pageData)
      store.currentPageData = { ...pageData }
      // 同步更新 totalPageData 以触发 WallpaperList 组件更新
      store.totalPageData = {
        sections: [pageData],
        totalPage: pageData.totalPage,
        currentPage: pageData.currentPage,
      }
      store.totalCount = result.data!.meta.total
      store.loading = false
      return true
    } catch (error) {
      // 处理取消错误 (QUAL-03)
      if (error instanceof Error && error.name === 'AbortError') {
        console.debug('Page load request aborted:', page)
        return false
      }

      showError(error instanceof Error ? error.message : '获取壁纸失败')
      store.error = true
      store.loading = false
      return false
    } finally {
      searchAbortController = null
    }
  }

  /**
   * 加载更多壁纸
   * @returns 是否成功
   */
  const loadMore = async (): Promise<boolean> => {
    if (!store.queryParams || store.loading) return false

    // 检查是否已加载所有页面
    if (
      store.totalPageData.totalPage > 0 &&
      store.totalPageData.currentPage >= store.totalPageData.totalPage
    ) {
      return false
    }

    // 添加取消支持 (QUAL-03)
    searchAbortController?.abort()
    searchAbortController = new AbortController()

    store.loading = true

    try {
      const nextPage = store.totalPageData.currentPage + 1
      const params = { ...store.queryParams, page: nextPage }

      const result = await wallpaperService.search(params, {
        signal: searchAbortController.signal,
      })

      // 处理取消 (QUAL-03)
      if (!result.success && result.error?.code === 'ABORTED') {
        console.debug('Load more request aborted')
        return false
      }

      if (!result.success) {
        showError(result.error?.message || '加载更多失败')
        store.loading = false
        return false
      }

      // result.data 已在成功检查后确认存在
      const pageData = toPageData(result.data!)
      store.totalPageData = {
        ...store.totalPageData,
        sections: [...store.totalPageData.sections, pageData],
        currentPage: pageData.currentPage,
      }
      store.loading = false
      return true
    } catch (error) {
      // 处理取消错误 (QUAL-03)
      if (error instanceof Error && error.name === 'AbortError') {
        console.debug('Load more request aborted')
        return false
      }

      showError(error instanceof Error ? error.message : '加载更多失败')
      store.loading = false
      return false
    } finally {
      searchAbortController = null
    }
  }

  /**
   * 重置状态
   */
  const reset = (): void => {
    store.totalPageData = {
      sections: [],
      totalPage: 0,
      currentPage: 0,
    }
    store.currentPageData = { data: [], totalPage: 0, currentPage: 0 }
    store.pageCache = new Map()
    store.totalCount = 0
    store.queryParams = null
    store.error = false
    lastQueryParams = null
  }

  /**
   * 刷新当前页
   * @returns 是否成功
   */
  const refresh = async (): Promise<boolean> => {
    const currentPage = store.currentPageData.currentPage
    if (currentPage < 1) return false

    // 清除当前页缓存
    const cache = store.pageCache
    cache.delete(currentPage)
    store.pageCache = cache

    return goToPage(currentPage)
  }

  /**
   * 清空页面缓存
   */
  const clearCache = (): void => {
    store.clearPageCache()
  }

  /**
   * 保存自定义搜索参数
   * @param params - 自定义参数
   * @returns 是否成功
   */
  const saveCustomParams = async (params: CustomParams): Promise<boolean> => {
    const result = await wallpaperService.saveQueryParams(params)

    if (!result.success) {
      showError(result.error?.message || '保存参数失败')
      return false
    }

    store.savedParams = { ...params, selector: 0 }
    return true
  }

  /**
   * 加载保存的自定义搜索参数
   * @returns 保存的参数，未设置返回 null
   */
  const loadSavedParams = async (): Promise<CustomParams | null> => {
    // 优先从内存中获取
    if (store.savedParams) {
      return store.savedParams
    }

    const result = await wallpaperService.loadQueryParams()

    if (!result.success) {
      showError(result.error?.message || '加载参数失败')
      return null
    }

    if (result.data) {
      store.savedParams = result.data
      return result.data
    }

    return null
  }

  /**
   * 更新当前页中某个壁纸的收藏状态
   * @param wallpaperId - 壁纸 ID
   * @param isFavorite - 新的收藏状态值 (0, 1, 2)
   */
  const updateItemFavoriteStatus = (wallpaperId: string, isFavorite: number): void => {
    const currentData = store.currentPageData
    const itemIndex = currentData.data.findIndex((item) => item.id === wallpaperId)

    if (itemIndex === -1) return

    // 创建新的数据对象以触发 shallowRef 更新
    const newData = [...currentData.data]
    const item = newData[itemIndex]
    if (item) {
      newData[itemIndex] = { ...item, is_favorite: isFavorite as 0 | 1 | 2 }
    }

    store.currentPageData = {
      ...currentData,
      data: newData,
    }

    // 同时更新缓存
    const page = currentData.currentPage
    const cachedPage = store.getCachedPage(page)
    if (cachedPage) {
      const cachedData = [...cachedPage.data]
      const cachedIndex = cachedData.findIndex((item) => item.id === wallpaperId)
      if (cachedIndex !== -1) {
        const cachedItem = cachedData[cachedIndex]
        if (cachedItem) {
          cachedData[cachedIndex] = { ...cachedItem, is_favorite: isFavorite as 0 | 1 | 2 }
          store.setCachedPage(page, { ...cachedPage, data: cachedData })
        }
      }
    }
  }

  // 组件卸载时取消进行中的请求 (QUAL-03)
  onUnmounted(() => {
    searchAbortController?.abort()
  })

  return {
    // 状态
    wallpapers: computed(() => store.totalPageData),
    currentPageData: computed(() => store.currentPageData),
    totalCount: computed(() => store.totalCount),
    loading: computed(() => store.loading),
    error: computed(() => store.error),
    queryParams: computed(() => store.queryParams),
    savedParams: computed(() => store.savedParams),

    // 方法
    fetch,
    goToPage,
    loadMore,
    refresh,
    clearCache,
    reset,
    saveCustomParams,
    loadSavedParams,
    updateItemFavoriteStatus,
  }
}
