/**
 * 收藏项管理 Composable
 * 封装收藏项状态管理逻辑，提供 O(1) 收藏状态查询
 *
 * 使用 Pinia Store 共享状态，确保所有组件访问同一份数据
 */

import { computed, type ComputedRef } from 'vue'
import { useFavoritesStore } from '@/stores/modules/favorites'
import { favoritesService } from '@/services'
import { favoritesRepository } from '@/repositories'
import { useAlert } from '@/composables'
import type { FavoriteItem, WallpaperItem, PageData } from '@/types'

export interface UseFavoritesReturn {
  // 分页状态
  currentPageData: ComputedRef<PageData>
  totalCount: ComputedRef<number>
  hasMore: ComputedRef<boolean>
  loading: ComputedRef<boolean>
  error: ComputedRef<string | null>

  // 计数
  counts: ComputedRef<Record<string, number>>
  uniqueWallpaperCount: ComputedRef<number>

  // 分页方法
  goToPage: (page: number, collectionId?: string) => Promise<boolean>
  refresh: () => Promise<boolean>
  clearCache: () => void
  loadCounts: () => Promise<void>

  // 全量加载（兼容旧接口）
  load: () => Promise<void>

  // 收藏操作
  favorites: ComputedRef<FavoriteItem[]>
  favoriteIds: ComputedRef<Set<string>>
  add: (wallpaperId: string, collectionId: string, wallpaperData: WallpaperItem) => Promise<boolean>
  remove: (wallpaperId: string, collectionId: string) => Promise<boolean>
  move: (wallpaperId: string, fromCollectionId: string, toCollectionId: string) => Promise<boolean>
  isFavorite: (wallpaperId: string) => boolean
  isInCollection: (wallpaperId: string, collectionId: string) => boolean
  getCollectionsForWallpaper: (wallpaperId: string) => string[]
  getByCollection: (collectionId: string) => FavoriteItem[]
  getCollectionCount: (collectionId: string) => number
}

export function useFavorites(): UseFavoritesReturn {
  const { showError, showSuccess } = useAlert()
  const store = useFavoritesStore()

  const load = async (): Promise<void> => {
    await store.loadFavorites()
    if (store.error) {
      showError(store.error)
    }
  }

  const isFavorite = (wallpaperId: string): boolean => store.isFavorite(wallpaperId)

  const isInCollection = (wallpaperId: string, collectionId: string): boolean =>
    store.isInCollection(wallpaperId, collectionId)

  /**
   * 跳转到指定页
   * @param page - 页码（1-based）
   * @param collectionId - 可选，按收藏夹过滤
   * @returns 是否成功
   */
  const goToPage = async (page: number, collectionId?: string): Promise<boolean> => {
    // 边界检查
    if (page < 1) return false

    const cachedTotalPage = store.currentPageData.totalPage
    if (cachedTotalPage > 0 && page > cachedTotalPage) return false

    // 检查收藏夹是否变化
    const targetCollectionId = collectionId ?? null
    if (store.currentCollectionId !== targetCollectionId) {
      store.clearPageCache()
      store.currentCollectionId = targetCollectionId
    }

    // 检查缓存
    const cached = store.getCachedPage(page)
    if (cached) {
      store.currentPageData = { ...cached }
      return true
    }

    // 从 Repository 加载
    store.loading = true
    store.error = null

    const limit = 24
    const offset = (page - 1) * limit
    const result = await favoritesRepository.getFavoritesPaginated({
      limit,
      offset,
      collectionId: targetCollectionId ?? undefined,
    })

    if (!result.success) {
      showError(result.error?.message || '获取收藏失败')
      store.error = result.error?.message || '获取收藏失败'
      store.loading = false
      return false
    }

    const { items, total } = result.data!
    const totalPage = Math.ceil(total / limit)

    const pageData: PageData = {
      data: items.map((item) => item.wallpaperData),
      totalPage,
      currentPage: page,
    }

    store.setCachedPage(page, pageData)
    store.currentPageData = { ...pageData }
    store.totalCount = total
    store.loading = false
    return true
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

    return goToPage(currentPage, store.currentCollectionId ?? undefined)
  }

  /**
   * 清空页面缓存
   */
  const clearCache = (): void => {
    store.clearPageCache()
  }

  /**
   * 加载收藏计数
   */
  const loadCounts = async (): Promise<void> => {
    await store.loadCounts()
  }

  const add = async (
    wallpaperId: string,
    collectionId: string,
    wallpaperData: WallpaperItem,
  ): Promise<boolean> => {
    const result = await favoritesService.add(wallpaperId, collectionId, wallpaperData)
    if (result.success) {
      await store.loadFavorites()
      await loadCounts()
      // 清除页面缓存，确保 FavoritesPage 刷新数据
      store.clearPageCache()
      showSuccess('已添加到收藏')
      return true
    }
    showError(result.error?.message || '添加收藏失败')
    return false
  }

  const remove = async (wallpaperId: string, collectionId: string): Promise<boolean> => {
    const result = await favoritesService.remove(wallpaperId, collectionId)
    if (result.success) {
      await store.loadFavorites()
      await loadCounts()
      // 清除页面缓存，确保 FavoritesPage 刷新数据
      store.clearPageCache()
      showSuccess('已从收藏移除')
      return true
    }
    showError(result.error?.message || '移除收藏失败')
    return false
  }

  const move = async (
    wallpaperId: string,
    fromCollectionId: string,
    toCollectionId: string,
  ): Promise<boolean> => {
    const result = await favoritesService.move(wallpaperId, fromCollectionId, toCollectionId)
    if (result.success) {
      await store.loadFavorites()
      await loadCounts()
      // 清除页面缓存，确保 FavoritesPage 刷新数据
      store.clearPageCache()
      showSuccess('已移动到其他收藏夹')
      return true
    }
    showError(result.error?.message || '移动收藏失败')
    return false
  }

  const getCollectionsForWallpaper = (wallpaperId: string): string[] =>
    store.getCollectionNamesForWallpaper(wallpaperId)

  const getByCollection = (collectionId: string): FavoriteItem[] =>
    store.getByCollection(collectionId)

  const getCollectionCount = (collectionId: string): number =>
    store.getCollectionCount(collectionId)

  const hasMore = computed(() => {
    const current = store.currentPageData.currentPage
    const total = store.currentPageData.totalPage
    return current > 0 && current < total
  })

  return {
    // 分页状态
    currentPageData: computed(() => store.currentPageData),
    totalCount: computed(() => store.totalCount),
    hasMore,
    loading: computed(() => store.loading),
    error: computed(() => store.error),

    // 计数
    counts: computed(() => store.counts),
    uniqueWallpaperCount: computed(() => store.uniqueWallpaperCount),

    // 分页方法
    goToPage,
    refresh,
    clearCache,
    loadCounts,

    // 全量加载（兼容旧接口）
    load,

    // 收藏操作
    favorites: computed(() => store.favorites),
    favoriteIds: computed(() => store.favoriteIds),
    add,
    remove,
    move,
    isFavorite,
    isInCollection,
    getCollectionsForWallpaper,
    getByCollection,
    getCollectionCount,
  }
}
