/**
 * 收藏项管理 Composable
 * 封装收藏项状态管理逻辑，提供 O(1) 收藏状态查询
 *
 * 使用 Pinia Store 共享状态，确保所有组件访问同一份数据
 */

import { computed, type ComputedRef } from 'vue'
import { useFavoritesStore } from '@/stores/modules/favorites'
import { favoritesService } from '@/services'
import { useAlert } from '@/composables'
import type { FavoriteItem, WallpaperItem } from '@/types'

export interface UseFavoritesReturn {
  favorites: ComputedRef<FavoriteItem[]>
  favoriteIds: ComputedRef<Set<string>>
  loading: ComputedRef<boolean>
  error: ComputedRef<string | null>
  uniqueWallpaperCount: ComputedRef<number>
  load: () => Promise<void>
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

  const add = async (
    wallpaperId: string,
    collectionId: string,
    wallpaperData: WallpaperItem,
  ): Promise<boolean> => {
    const result = await favoritesService.add(wallpaperId, collectionId, wallpaperData)
    if (result.success) {
      await load()
      showSuccess('已添加到收藏')
      return true
    }
    showError(result.error?.message || '添加收藏失败')
    return false
  }

  const remove = async (wallpaperId: string, collectionId: string): Promise<boolean> => {
    const result = await favoritesService.remove(wallpaperId, collectionId)
    if (result.success) {
      await load()
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
      await load()
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

  return {
    favorites: computed(() => store.favorites),
    favoriteIds: computed(() => store.favoriteIds),
    loading: computed(() => store.loading),
    error: computed(() => store.error),
    uniqueWallpaperCount: computed(() => store.uniqueWallpaperCount),
    load,
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
