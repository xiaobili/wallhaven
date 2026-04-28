/**
 * 收藏项管理 Composable
 * 封装收藏项状态管理逻辑，提供 O(1) 收藏状态查询
 */

import { computed, ref, type ComputedRef } from 'vue'
import { favoritesService, collectionsService } from '@/services'
import { useAlert } from '@/composables'
import type { FavoriteItem, WallpaperItem, Collection } from '@/types'

export interface UseFavoritesReturn {
  favorites: ComputedRef<FavoriteItem[]>
  favoriteIds: ComputedRef<Set<string>>
  loading: ComputedRef<boolean>
  error: ComputedRef<string | null>
  load: () => Promise<void>
  add: (wallpaperId: string, collectionId: string, wallpaperData: WallpaperItem) => Promise<boolean>
  remove: (wallpaperId: string, collectionId: string) => Promise<boolean>
  move: (wallpaperId: string, fromCollectionId: string, toCollectionId: string) => Promise<boolean>
  isFavorite: (wallpaperId: string) => boolean
  isInCollection: (wallpaperId: string, collectionId: string) => boolean
  getCollectionsForWallpaper: (wallpaperId: string) => string[]
  getByCollection: (collectionId: string) => FavoriteItem[]
}

export function useFavorites(): UseFavoritesReturn {
  const { showError, showSuccess } = useAlert()
  const favorites = ref<FavoriteItem[]>([])
  const favoriteIds = ref<Set<string>>(new Set())
  const loading = ref(false)
  const error = ref<string | null>(null)
  const cachedCollections = ref<Collection[]>([])

  const load = async (): Promise<void> => {
    loading.value = true
    error.value = null
    const result = await favoritesService.getAll()
    if (result.success && result.data) {
      favorites.value = result.data
      favoriteIds.value = new Set(result.data.map(f => f.wallpaperId))
    } else {
      error.value = result.error?.message || '加载收藏失败'
      showError(error.value)
    }
    loading.value = false
  }

  const isFavorite = (wallpaperId: string): boolean => favoriteIds.value.has(wallpaperId)

  const isInCollection = (wallpaperId: string, collectionId: string): boolean => {
    return favorites.value.some(f => f.wallpaperId === wallpaperId && f.collectionId === collectionId)
  }

  const add = async (wallpaperId: string, collectionId: string, wallpaperData: WallpaperItem): Promise<boolean> => {
    const result = await favoritesService.add(wallpaperId, collectionId, wallpaperData)
    if (result.success) {
      favoriteIds.value.add(wallpaperId)
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
      const stillInOther = favorites.value.some(f => f.wallpaperId === wallpaperId && f.collectionId !== collectionId)
      if (!stillInOther) favoriteIds.value.delete(wallpaperId)
      await load()
      showSuccess('已从收藏移除')
      return true
    }
    showError(result.error?.message || '移除收藏失败')
    return false
  }

  const move = async (wallpaperId: string, fromCollectionId: string, toCollectionId: string): Promise<boolean> => {
    const result = await favoritesService.move(wallpaperId, fromCollectionId, toCollectionId)
    if (result.success) {
      await load()
      showSuccess('已移动到其他收藏夹')
      return true
    }
    showError(result.error?.message || '移动收藏失败')
    return false
  }

  const getCollectionsForWallpaper = (wallpaperId: string): string[] => {
    const items = favorites.value.filter(f => f.wallpaperId === wallpaperId)
    const collectionIds = items.map(f => f.collectionId)
    return cachedCollections.value.filter(c => collectionIds.includes(c.id)).map(c => c.name)
  }

  const getByCollection = (collectionId: string): FavoriteItem[] => favorites.value.filter(f => f.collectionId === collectionId)

  // Load collections for getCollectionsForWallpaper
  const loadCollections = async () => {
    const result = await collectionsService.getAll()
    if (result.success && result.data) cachedCollections.value = result.data
  }
  loadCollections()

  return {
    favorites: computed(() => favorites.value),
    favoriteIds: computed(() => favoriteIds.value),
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    load, add, remove, move, isFavorite, isInCollection, getCollectionsForWallpaper, getByCollection,
  }
}
