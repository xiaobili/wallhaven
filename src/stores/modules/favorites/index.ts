import { defineStore } from 'pinia'
import { ref, computed, shallowRef } from 'vue'
import type { FavoriteItem, Collection, PageData, PageCache } from '@/types'
import { favoritesService, collectionsService } from '@/services'
import { favoritesRepository } from '@/repositories'

/**
 * 收藏状态类型
 * 0 = 未收藏, 1 = 已收藏(单收藏夹), 2 = 已收藏(多收藏夹)
 */
export type FavoriteStatus = 0 | 1 | 2

/**
 * 收藏数据 Store
 *
 * 使用 Pinia 管理收藏项和收藏夹的共享状态，
 * 确保所有组件访问同一份响应式数据
 */
export const useFavoritesStore = defineStore('favorites', () => {
  // ==================== 状态 ====================

  /** 收藏项列表 */
  const favorites = ref<FavoriteItem[]>([])

  /** 收藏夹列表 */
  const collections = ref<Collection[]>([])

  /** 加载状态 */
  const loading = ref(false)

  /** 错误信息 */
  const error = ref<string | null>(null)

  // ==================== 收藏状态缓存 ====================

  /** 收藏状态缓存 (wallpaperId -> 0|1|2) - ARCH-02 */
  const favoriteStatusCache = ref<Map<string, FavoriteStatus>>(new Map())

  // ==================== 分页状态 ====================

  /** 当前页数据 */
  const currentPageData = shallowRef<PageData>({
    data: [],
    totalPage: 0,
    currentPage: 0,
  })

  /** 页面缓存（最多 5 页） */
  const pageCache = shallowRef<PageCache>(new Map())

  /** 总条目数 */
  const totalCount = ref<number>(0)

  /** 当前筛选的收藏夹 ID */
  const currentCollectionId = ref<string | null>(null)

  // ==================== 响应式计数 ====================

  /** 收藏计数（_total 为去重后的全部计数，其他为各收藏夹计数） */
  const counts = ref<Record<string, number>>({ _total: 0 })

  // ==================== 计算属性 ====================

  /** 收藏的壁纸 ID 集合（O(1) 查询） */
  const favoriteIds = computed(() => new Set(favorites.value.map((f) => f.wallpaperId)))

  /** 唯一壁纸数量（去重后）—— 从 counts 获取 */
  const uniqueWallpaperCount = computed(() => counts.value._total ?? 0)

  // ==================== 方法 ====================

  /**
   * 加载收藏项
   */
  async function loadFavorites(): Promise<void> {
    loading.value = true
    error.value = null
    const result = await favoritesService.getAll()
    if (result.success && result.data) {
      favorites.value = result.data
    } else {
      error.value = result.error?.message || '加载收藏失败'
    }
    loading.value = false
  }

  /**
   * 加载收藏夹
   */
  async function loadCollections(): Promise<void> {
    const result = await collectionsService.getAll()
    if (result.success && result.data) {
      collections.value = result.data
    }
  }

  /**
   * 加载所有数据
   */
  async function loadAll(): Promise<void> {
    await Promise.all([loadFavorites(), loadCollections(), loadCounts()])
  }

  /**
   * 加载收藏计数（从 Repository 获取）
   */
  async function loadCounts(): Promise<void> {
    const result = await favoritesRepository.getCounts()
    if (result.success && result.data) {
      counts.value = result.data
    }
  }

  /**
   * 检查壁纸是否已收藏
   */
  function isFavorite(wallpaperId: string): boolean {
    return favoriteIds.value.has(wallpaperId)
  }

  /**
   * 检查壁纸是否在指定收藏夹中
   */
  function isInCollection(wallpaperId: string, collectionId: string): boolean {
    return favorites.value.some(
      (f) => f.wallpaperId === wallpaperId && f.collectionId === collectionId,
    )
  }

  /**
   * 获取收藏夹的壁纸数量（从 counts 获取）
   */
  function getCollectionCount(collectionId: string): number {
    return counts.value[collectionId] ?? 0
  }

  /**
   * 获取指定收藏夹的收藏项
   */
  function getByCollection(collectionId: string): FavoriteItem[] {
    return favorites.value.filter((f) => f.collectionId === collectionId)
  }

  /**
   * 获取壁纸所属的收藏夹名称列表
   */
  function getCollectionNamesForWallpaper(wallpaperId: string): string[] {
    const items = favorites.value.filter((f) => f.wallpaperId === wallpaperId)
    const collectionIds = items.map((f) => f.collectionId)
    return collections.value.filter((c) => collectionIds.includes(c.id)).map((c) => c.name)
  }

  /**
   * 添加收藏项
   */
  async function addFavorite(
    wallpaperId: string,
    collectionId: string,
    wallpaperData: any,
  ): Promise<boolean> {
    const result = await favoritesService.add(wallpaperId, collectionId, wallpaperData)
    if (result.success) {
      await loadFavorites()
      return true
    }
    return false
  }

  /**
   * 移除收藏项
   */
  async function removeFavorite(wallpaperId: string, collectionId: string): Promise<boolean> {
    const result = await favoritesService.remove(wallpaperId, collectionId)
    if (result.success) {
      await loadFavorites()
      return true
    }
    return false
  }

  /**
   * 移动收藏项
   */
  async function moveFavorite(
    wallpaperId: string,
    fromCollectionId: string,
    toCollectionId: string,
  ): Promise<boolean> {
    const result = await favoritesService.move(wallpaperId, fromCollectionId, toCollectionId)
    if (result.success) {
      await loadFavorites()
      return true
    }
    return false
  }

  /**
   * 清除缓存（用于强制刷新）
   */
  function clearCache(): void {
    favorites.value = []
    collections.value = []
    favoriteStatusCache.value.clear()
  }

  // ==================== 收藏状态缓存方法 (ARCH-02) ====================

  /**
   * 获取收藏状态
   * @param wallpaperId - 壁纸 ID
   * @returns 收藏状态，未缓存返回 undefined
   */
  function getFavoriteStatus(wallpaperId: string): FavoriteStatus | undefined {
    return favoriteStatusCache.value.get(wallpaperId)
  }

  /**
   * 设置收藏状态
   * @param wallpaperId - 壁纸 ID
   * @param status - 收藏状态
   */
  function setFavoriteStatus(wallpaperId: string, status: FavoriteStatus): void {
    favoriteStatusCache.value.set(wallpaperId, status)
  }

  /**
   * 清除收藏状态缓存
   */
  function clearFavoriteStatusCache(): void {
    favoriteStatusCache.value.clear()
  }

  /**
   * 批量加载收藏状态
   * @param ids - 壁纸 ID 列表
   */
  async function loadFavoriteStatusMap(ids: string[]): Promise<void> {
    if (ids.length === 0) return
    const result = await favoritesRepository.getFavoriteStatusMap(ids)
    if (result.success && result.data) {
      for (const [id, status] of Object.entries(result.data)) {
        favoriteStatusCache.value.set(id, status)
      }
    }
  }

  // ==================== 分页辅助方法 ====================

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
    if (cache.size >= 5 && !cache.has(page)) {
      const firstKey = cache.keys().next().value
      if (firstKey !== undefined) {
        cache.delete(firstKey)
      }
    }
    cache.set(page, data)
    pageCache.value = cache
  }

  return {
    // 状态
    favorites,
    collections,
    loading,
    error,

    // 分页状态
    currentPageData,
    pageCache,
    totalCount,
    currentCollectionId,

    // 响应式计数
    counts,

    // 计算属性
    favoriteIds,
    uniqueWallpaperCount,

    // 方法
    loadFavorites,
    loadCollections,
    loadAll,
    loadCounts,
    isFavorite,
    isInCollection,
    getCollectionCount,
    getByCollection,
    getCollectionNamesForWallpaper,
    addFavorite,
    removeFavorite,
    moveFavorite,
    clearCache,

    // 分页辅助方法
    createEmptyPageData,
    clearPageCache,
    getCachedPage,
    setCachedPage,

    // 收藏状态缓存 (ARCH-02)
    favoriteStatusCache,
    getFavoriteStatus,
    setFavoriteStatus,
    clearFavoriteStatusCache,
    loadFavoriteStatusMap,
  }
})
