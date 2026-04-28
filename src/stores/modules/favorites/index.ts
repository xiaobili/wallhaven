import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { FavoriteItem, Collection } from '@/types'
import { favoritesService, collectionsService } from '@/services'

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

  // ==================== 计算属性 ====================

  /** 收藏的壁纸 ID 集合（O(1) 查询） */
  const favoriteIds = computed(() => new Set(favorites.value.map(f => f.wallpaperId)))

  /** 唯一壁纸数量（去重后） */
  const uniqueWallpaperCount = computed(() => favoriteIds.value.size)

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
    await Promise.all([loadFavorites(), loadCollections()])
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
    return favorites.value.some(f => f.wallpaperId === wallpaperId && f.collectionId === collectionId)
  }

  /**
   * 获取收藏夹的壁纸数量
   */
  function getCollectionCount(collectionId: string): number {
    return favorites.value.filter(f => f.collectionId === collectionId).length
  }

  /**
   * 获取指定收藏夹的收藏项
   */
  function getByCollection(collectionId: string): FavoriteItem[] {
    return favorites.value.filter(f => f.collectionId === collectionId)
  }

  /**
   * 获取壁纸所属的收藏夹名称列表
   */
  function getCollectionNamesForWallpaper(wallpaperId: string): string[] {
    const items = favorites.value.filter(f => f.wallpaperId === wallpaperId)
    const collectionIds = items.map(f => f.collectionId)
    return collections.value.filter(c => collectionIds.includes(c.id)).map(c => c.name)
  }

  /**
   * 添加收藏项
   */
  async function addFavorite(wallpaperId: string, collectionId: string, wallpaperData: any): Promise<boolean> {
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
  async function moveFavorite(wallpaperId: string, fromCollectionId: string, toCollectionId: string): Promise<boolean> {
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
  }

  return {
    // 状态
    favorites,
    collections,
    loading,
    error,

    // 计算属性
    favoriteIds,
    uniqueWallpaperCount,

    // 方法
    loadFavorites,
    loadCollections,
    loadAll,
    isFavorite,
    isInCollection,
    getCollectionCount,
    getByCollection,
    getCollectionNamesForWallpaper,
    addFavorite,
    removeFavorite,
    moveFavorite,
    clearCache,
  }
})
