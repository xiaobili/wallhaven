/**
 * 壁纸服务
 * 封装壁纸相关的业务逻辑（ARCH-02: 无状态服务）
 */

import type { IpcResponse } from '@/types/ipc'
import type { GetParams, CustomParams, WallpaperItem, WallpaperMeta } from '@/types'
import { apiClient } from '@/clients'
import { settingsRepository, wallpaperRepository } from '@/repositories'

/**
 * 壁纸搜索结果
 */
export interface WallpaperSearchResult {
  data: WallpaperItem[]
  meta: WallpaperMeta
}

/**
 * 壁纸服务实现类
 * ARCH-02: 转为无状态服务，缓存已迁移到 Store
 */
class WallpaperServiceImpl {
  /**
   * 获取 API Key
   * @returns API Key，未设置返回 undefined
   */
  private async getApiKey(): Promise<string | undefined> {
    const result = await settingsRepository.get()
    if (result.success && result.data) {
      return result.data.apiKey || undefined
    }
    return undefined
  }

  /**
   * 搜索壁纸
   * @param params - 搜索参数
   * @param options - 可选参数（包含 AbortSignal）
   * @returns 搜索结果
   */
  async search(
    params: GetParams | null,
    options?: { signal?: AbortSignal },
  ): Promise<IpcResponse<WallpaperSearchResult>> {
    try {
      // 过滤空值参数
      const filteredParams: Record<string, unknown> = {}
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== null && value !== undefined && value !== '') {
            filteredParams[key] = value
          }
        })
      }

      // 动态导入 Store 避免循环依赖
      const { useFavoritesStore } = await import('@/stores')
      const { useWallpaperStore } = await import('@/stores')
      const favoritesStore = useFavoritesStore()
      const wallpaperStore = useWallpaperStore()

      // 检查缓存
      const cacheKey = wallpaperStore.generateCacheKey('/search', filteredParams)
      const cachedData = wallpaperStore.getCachedSearch<WallpaperSearchResult>(cacheKey)
      if (cachedData) {
        return { success: true, data: cachedData }
      }

      // 检查是否已取消
      if (options?.signal?.aborted) {
        return {
          success: false,
          error: {
            code: 'ABORTED',
            message: '搜索请求已取消',
          },
        }
      }

      // 获取 API Key
      const apiKey = await this.getApiKey()
      // 调用 API
      const result = await apiClient.get<WallpaperSearchResult>(
        '/search',
        filteredParams,
        apiKey,
        options,
      )

      // 成功时注入 is_favorite 字段并缓存结果
      if (result.success && result.data) {
        // 注入收藏状态 (ARCH-02: 使用 Store 缓存)
        if (result.data.data.length > 0) {
          const wallpaperIds = result.data.data.map((item) => item.id)

          // 分离已缓存和未缓存的 ID
          const cachedStatus: Record<string, 0 | 1 | 2> = {}
          const uncachedIds: string[] = []

          for (const id of wallpaperIds) {
            const cached = favoritesStore.getFavoriteStatus(id)
            if (cached !== undefined) {
              cachedStatus[id] = cached
            } else {
              uncachedIds.push(id)
            }
          }

          // 只查询未缓存的 ID
          if (uncachedIds.length > 0) {
            await favoritesStore.loadFavoriteStatusMap(uncachedIds)
          }

          // 构建最终状态映射
          const statusMap: Record<string, 0 | 1 | 2> = { ...cachedStatus }
          for (const id of wallpaperIds) {
            const status = favoritesStore.getFavoriteStatus(id)
            if (status !== undefined) {
              statusMap[id] = status
            }
          }

          result.data.data = result.data.data.map((item) => ({
            ...item,
            is_favorite: statusMap[item.id] ?? 0,
          }))
        }

        // 设置搜索缓存
        wallpaperStore.setCachedSearch(cacheKey, result.data)
      }

      return result
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'SEARCH_ERROR',
          message: error instanceof Error ? error.message : '搜索壁纸失败',
        },
      }
    }
  }

  /**
   * 获取壁纸详情
   * @param id - 壁纸 ID
   * @returns 壁纸详情
   */
  async getDetail(id: string): Promise<IpcResponse<WallpaperItem>> {
    try {
      // 动态导入 Store
      const { useWallpaperStore } = await import('@/stores')
      const wallpaperStore = useWallpaperStore()

      // 检查缓存
      const cacheKey = wallpaperStore.generateCacheKey(`/w/${id}`)
      const cachedData = wallpaperStore.getCachedSearch<WallpaperItem>(cacheKey)
      if (cachedData) {
        return { success: true, data: cachedData }
      }

      // 获取 API Key
      const apiKey = await this.getApiKey()

      // 调用 API
      const result = await apiClient.get<WallpaperItem>(`/w/${id}`, undefined, apiKey)

      // 成功时缓存结果
      if (result.success && result.data) {
        wallpaperStore.setCachedSearch(cacheKey, result.data)
      }

      return result
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'GET_DETAIL_ERROR',
          message: error instanceof Error ? error.message : '获取壁纸详情失败',
        },
      }
    }
  }

  /**
   * 保存查询参数
   * @param params - 查询参数
   * @returns 操作结果
   */
  async saveQueryParams(params: CustomParams): Promise<IpcResponse<void>> {
    // 确保 selector 为 0
    return wallpaperRepository.setQueryParams({ ...params, selector: 0 })
  }

  /**
   * 加载查询参数
   * @returns 查询参数，未设置返回 null
   */
  async loadQueryParams(): Promise<IpcResponse<CustomParams | null>> {
    return wallpaperRepository.getQueryParams()
  }

  /**
   * 清空缓存（已迁移到 Store，此方法保留用于兼容）
   */
  clearCache(): void {
    // 缓存已迁移到 Store，此方法保留用于 API 兼容
    // 调用方应使用 useWallpaperStore().clearSearchCache()
  }

  /**
   * 清除收藏状态缓存（已迁移到 Store，此方法保留用于兼容）
   */
  clearFavoriteStatusCache(): void {
    // 缓存已迁移到 Store，此方法保留用于 API 兼容
    // 调用方应使用 useFavoritesStore().clearFavoriteStatusCache()
  }

  /**
   * 设置桌面壁纸
   * @param imagePath - 图片文件路径
   */
  async setWallpaper(imagePath: string): Promise<IpcResponse<void>> {
    return wallpaperRepository.setWallpaper(imagePath)
  }
}

/** 壁纸服务单例 */
export const wallpaperService = new WallpaperServiceImpl()
