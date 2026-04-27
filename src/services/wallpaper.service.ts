/**
 * 壁纸服务
 * 封装壁纸相关的业务逻辑
 */

import type { IpcResponse } from '@/shared/types/ipc'
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
  /** 缓存存储 */
  private cache = new Map<string, CacheItem>()

  /** 缓存有效期：5分钟 */
  private readonly CACHE_TTL = 5 * 60 * 1000

  /** 最大缓存条数 */
  private readonly MAX_CACHE_SIZE = 50

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
    if (!item) return null

    // 检查是否过期
    if (Date.now() - item.timestamp > this.CACHE_TTL) {
      this.cache.delete(key)
      return null
    }

    return item.data as T
  }

  /**
   * 设置缓存
   * @param key - 缓存键
   * @param data - 缓存数据
   */
  private setCache(key: string, data: unknown): void {
    // 限制缓存大小，超过限制时删除最旧条目
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      const firstKey = this.cache.keys().next().value
      if (firstKey) {
        this.cache.delete(firstKey)
      }
    }

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

      // 成功时缓存结果
      if (result.success && result.data) {
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
   * 设置桌面壁纸
   * @param imagePath - 图片文件路径
   */
  async setWallpaper(imagePath: string): Promise<IpcResponse<void>> {
    return wallpaperRepository.setWallpaper(imagePath)
  }
}

/** 壁纸服务单例 */
export const wallpaperService = new WallpaperServiceImpl()
