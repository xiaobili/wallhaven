import { defineStore } from 'pinia'
import { ref, reactive, shallowRef } from 'vue'
import type { TotalPageData, GetParams, CustomParams, AppSettings, WallpaperFit, PageData, PageCache } from '@/types'
import { LRUCache } from 'lru-cache'
import { settingsService } from '@/services'
import { CACHE_CONFIG } from '@/config/constants'

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

/**
 * 搜索缓存项 (ARCH-02)
 */
interface SearchCacheItem {
  data: unknown
  timestamp: number
}

export const useWallpaperStore = defineStore('wallpaper', () => {
  // ==================== 状态 ====================

  /** 壁纸数据（使用 shallowRef 优化性能） */
  const totalPageData = shallowRef<TotalPageData>({
    totalPage: 0,
    currentPage: 0,
    sections: [],
  })

  /** 当前页数据（传统分页） */
  const currentPageData = shallowRef<PageData>({
    data: [],
    totalPage: 0,
    currentPage: 0,
  })

  /** 页面缓存（最多 5 页） */
  const pageCache = shallowRef<PageCache>(new Map())

  /** 总条目数 */
  const totalCount = ref<number>(0)

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

  // ==================== 搜索缓存 (ARCH-02) ====================

  /** 搜索结果缓存 */
  const searchCache = new LRUCache<string, SearchCacheItem>({
    maxSize: CACHE_CONFIG.SEARCH_MAX_SIZE_BYTES,
    ttl: CACHE_CONFIG.SEARCH_TTL_MS,
    sizeCalculation: (value: SearchCacheItem) => {
      return JSON.stringify(value.data).length
    },
  })

  // ==================== 方法（由 Composable 调用） ====================

  /**
   * 重置状态
   */
  function resetState(): void {
    totalPageData.value = { totalPage: 0, currentPage: 0, sections: [] }
    currentPageData.value = { data: [], totalPage: 0, currentPage: 0 }
    pageCache.value = new Map()
    totalCount.value = 0
    queryParams.value = null
    error.value = false
  }

  /**
   * 创建空的页面数据
   */
  function createEmptyPageData(): PageData {
    return { data: [], totalPage: 0, currentPage: 0 }
  }

  /**
   * 清空页面缓存
   */
  function clearPageCache(): void {
    pageCache.value = new Map()
  }

  /**
   * 获取缓存的页面数据
   */
  function getCachedPage(page: number): PageData | undefined {
    return pageCache.value.get(page)
  }

  /**
   * 设置页面缓存（FIFO 淘汰，上限 5 页）
   */
  function setCachedPage(page: number, data: PageData): void {
    const cache = pageCache.value
    // FIFO 淘汰：超过 5 页且不是更新现有页面时删除最旧的
    if (cache.size >= 5 && !cache.has(page)) {
      const firstKey = cache.keys().next().value
      if (firstKey !== undefined) {
        cache.delete(firstKey)
      }
    }
    cache.set(page, data)
    // 触发响应式更新
    pageCache.value = cache
  }

  /**
   * 从持久化存储加载应用设置
   */
  async function loadSettings(): Promise<void> {
    const result = await settingsService.get()
    if (result.success && result.data) {
      Object.assign(settings, result.data)
      console.log('[WallpaperStore] 已从存储加载设置')
    } else {
      // 加载失败时使用默认值
      Object.assign(settings, settingsService.getDefaults())
      console.warn('[WallpaperStore] 加载设置失败，使用默认值:', result.error)
    }
  }

  // ==================== 搜索缓存方法 (ARCH-02) ====================

  /**
   * 获取缓存的搜索结果
   */
  function getCachedSearch<T>(key: string): T | null {
    const item = searchCache.get(key)
    return item ? (item.data as T) : null
  }

  /**
   * 设置搜索缓存
   */
  function setCachedSearch(key: string, data: unknown): void {
    searchCache.set(key, { data, timestamp: Date.now() })
  }

  /**
   * 清除搜索缓存
   */
  function clearSearchCache(): void {
    searchCache.clear()
  }

  /**
   * 生成缓存键
   */
  function generateCacheKey(url: string, params?: unknown): string {
    return `${url}:${JSON.stringify(params || {})}`
  }

  /**
   * 获取搜索缓存统计信息
   */
  function getSearchCacheStats(): { size: number; calculatedSize: number } {
    return {
      size: searchCache.size,
      calculatedSize: searchCache.calculatedSize ?? 0,
    }
  }

  return {
    // 状态
    totalPageData,
    currentPageData,
    pageCache,
    totalCount,
    loading,
    error,
    queryParams,
    savedParams,
    settings,

    // 方法
    resetState,
    loadSettings,
    createEmptyPageData,
    clearPageCache,
    getCachedPage,
    setCachedPage,

    // 搜索缓存 (ARCH-02)
    getCachedSearch,
    setCachedSearch,
    clearSearchCache,
    generateCacheKey,
    getSearchCacheStats,
  }
})
