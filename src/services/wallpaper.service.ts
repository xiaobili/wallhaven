/**
 * 壁纸服务
 * 封装壁纸相关的业务逻辑
 */

import type { IpcResponse } from '@/types/ipc'
import type { GetParams, CustomParams, WallpaperItem, WallpaperMeta } from '@/types'
import { LRUCache } from 'lru-cache'
import { apiClient } from '@/clients'
import { favoritesRepository, settingsRepository, wallpaperRepository } from '@/repositories'

/**
 * 壁纸搜索结果
 */
export interface WallpaperSearchResult {
  data: WallpaperItem[]
  meta: WallpaperMeta
}

/**
 * 缓存项
 */
interface CacheItem {
  data: unknown
  timestamp: number
}

/**
 * 壁纸服务实现类
 */
class WallpaperServiceImpl {
  /** 缓存存储 (PERF-02: 使用 lru-cache) */
  private cache = new LRUCache<string, CacheItem>({
    maxSize: 50 * 1024 * 1024, // 50MB 内存限制
    ttl: 5 * 60 * 1000, // 5 分钟 TTL
    sizeCalculation: (value: CacheItem) => {
      // 估算缓存项大小
      return JSON.stringify(value.data).length
    },
  })

  /** 缓存命中统计 */
  private hits = 0
  private misses = 0

  /** 收藏状态缓存 (PERF-03) */
  private favoriteStatusCache = new Map<string, 0 | 1 | 2>()

  /**
   * 生成缓存键
   * @param url - 请求 URL
   * @param params - 请求参数
   * @returns 缓存键
   */
  private generateCacheKey(url: string, params?: unknown): string {
    return `${url}:${JSON.stringify(params || {})}`
  }

  /**
   * 从缓存获取数据
   * @param key - 缓存键
   * @returns 缓存数据，不存在或已过期返回 null
   */
  private getFromCache<T>(key: string): T | null {
    const item = this.cache.get(key)
    if (item) {
      this.hits++
      return item.data as T
    }
    this.misses++
    return null
  }

  /**
   * 设置缓存
   * @param key - 缓存键
   * @param data - 缓存数据
   */
  private setCache(key: string, data: unknown): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    })
  }

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
   * @returns 搜索结果
   */
  async search(params: GetParams | null): Promise<IpcResponse<WallpaperSearchResult>> {
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

      // 检查缓存
      const cacheKey = this.generateCacheKey('/search', filteredParams)
      const cachedData = this.getFromCache<WallpaperSearchResult>(cacheKey)
      if (cachedData) {
        return { success: true, data: cachedData }
      }

      // 获取 API Key
      const apiKey = await this.getApiKey()
      // 调用 API
      const result = await apiClient.get<WallpaperSearchResult>('/search', filteredParams, apiKey)

      // 成功时注入 is_favorite 字段并缓存结果
      if (result.success && result.data) {
        // 注入收藏状态 (PERF-03: 使用缓存)
        if (result.data.data.length > 0) {
          const wallpaperIds = result.data.data.map((item) => item.id)

          // 分离已缓存和未缓存的 ID
          const cachedStatus: Record<string, 0 | 1 | 2> = {}
          const uncachedIds: string[] = []

          for (const id of wallpaperIds) {
            if (this.favoriteStatusCache.has(id)) {
              cachedStatus[id] = this.favoriteStatusCache.get(id)!
            } else {
              uncachedIds.push(id)
            }
          }

          // 只查询未缓存的 ID
          if (uncachedIds.length > 0) {
            const statusMapResult = await favoritesRepository.getFavoriteStatusMap(uncachedIds)
            if (statusMapResult.success && statusMapResult.data) {
              // 更新缓存
              for (const [id, status] of Object.entries(statusMapResult.data)) {
                this.favoriteStatusCache.set(id, status)
              }
            }
          }

          // 合并缓存和查询结果
          const statusMap = { ...cachedStatus }
          for (const [id, status] of this.favoriteStatusCache) {
            if (wallpaperIds.includes(id)) {
              statusMap[id] = status
            }
          }

          result.data.data = result.data.data.map((item) => ({
            ...item,
            is_favorite: statusMap[item.id] ?? 0,
          }))
        }

        this.setCache(cacheKey, result.data)
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
      // 检查缓存
      const cacheKey = this.generateCacheKey(`/w/${id}`)
      const cachedData = this.getFromCache<WallpaperItem>(cacheKey)
      if (cachedData) {
        return { success: true, data: cachedData }
      }

      // 获取 API Key
      const apiKey = await this.getApiKey()

      // 调用 API
      const result = await apiClient.get<WallpaperItem>(`/w/${id}`, undefined, apiKey)

      // 成功时缓存结果
      if (result.success && result.data) {
        this.setCache(cacheKey, result.data)
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
   * 清空缓存
   */
  clearCache(): void {
    this.cache.clear()
  }

  /**
   * 清除收藏状态缓存 (PERF-03)
   */
  clearFavoriteStatusCache(): void {
    this.favoriteStatusCache.clear()
  }

  /**
   * 获取缓存统计信息 (PERF-02)
   * @returns 缓存命中率和大小信息
   */
  getCacheStats(): { hits: number; misses: number; hitRate: number; size: number; calculatedSize: number } {
    return {
      hits: this.hits,
      misses: this.misses,
      hitRate: this.hits + this.misses > 0 ? this.hits / (this.hits + this.misses) : 0,
      size: this.cache.size,
      calculatedSize: this.cache.calculatedSize ?? 0,
    }
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
