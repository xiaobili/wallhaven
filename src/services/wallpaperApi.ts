// API Service 层 - 统一管理 Wallhaven API 调用

import axios, { type AxiosResponse, type CancelTokenSource } from 'axios'
import type { GetParams } from '@/types'
import { useWallpaperStore } from '@/stores/wallpaper'

/**
 * 创建 axios 实例
 */
const apiClient = axios.create({
  baseURL: '/api',
  timeout: 15000, // 增加超时时间到15秒
  headers: {
    'Content-Type': 'application/json',
  },
})

/**
 * 简单的内存缓存（用于API响应）
 */
interface CacheItem {
  data: any
  timestamp: number
  ttl: number // Time to live in milliseconds
}

const apiCache = new Map<string, CacheItem>()
const CACHE_TTL = 5 * 60 * 1000 // 5分钟缓存

/**
 * 生成缓存key
 */
const generateCacheKey = (url: string, params?: any): string => {
  return `${url}:${JSON.stringify(params || {})}`
}

/**
 * 从缓存获取数据
 */
const getFromCache = (key: string): any | null => {
  const item = apiCache.get(key)
  if (!item) return null

  // 检查是否过期
  if (Date.now() - item.timestamp > item.ttl) {
    apiCache.delete(key)
    return null
  }

  return item.data
}

/**
 * 设置缓存
 */
const setCache = (key: string, data: any): void => {
  // 限制缓存大小
  if (apiCache.size > 50) {
    const firstKey = apiCache.keys().next().value
    if (firstKey) apiCache.delete(firstKey)
  }

  apiCache.set(key, {
    data,
    timestamp: Date.now(),
    ttl: CACHE_TTL,
  })
}

/**
 * 清除缓存
 */
export const clearApiCache = (): void => {
  apiCache.clear()
}

/**
 * 判断是否为生产环境（Electron 打包后）
 */
const isProduction = () => {
  // 在 Electron 中，可以通过检查 window.electronAPI 是否存在来判断
  // import.meta.env.PROD 是 Vite 提供的环境变量
  const hasElectronAPI = typeof (window as any).electronAPI !== 'undefined'
  const isProd = import.meta.env.PROD

  return hasElectronAPI && isProd
}

/**
 * 通过 Electron IPC 调用 Wallhaven API（生产环境）
 */
const callWallhavenAPIViaIPC = async (endpoint: string, params: any) => {
  const electronAPI = (window as any).electronAPI

  if (!electronAPI || !electronAPI.wallhavenApiRequest) {
    throw new Error('Electron API not available')
  }

  console.log('[API] Using Electron IPC for:', endpoint)

  // 从 Pinia Store 获取 API Key 并添加到参数中
  const wallpaperStore = useWallpaperStore()
  const apiKey = wallpaperStore.settings.apiKey

  const result = await electronAPI.wallhavenApiRequest({
    endpoint,
    params: params,
    apiKey: apiKey !== '' || apiKey !== null ? apiKey : undefined,
  })

  if (!result.success) {
    const error: any = new Error(result.error || 'API request failed')
    error.code = 'ELECTRON_API_ERROR'
    error.response = { status: result.status }
    throw error
  }

  return result.data
}

/**
 * 请求拦截器
 */
apiClient.interceptors.request.use(
  (config) => {
    console.log('[API Request]', config.method?.toUpperCase(), config.url, config.params)

    // 从 Pinia Store 获取 API Key 并添加到请求头
    const wallpaperStore = useWallpaperStore()
    if (wallpaperStore.settings.apiKey) {
      config.headers['X-API-Key'] = wallpaperStore.settings.apiKey
      console.log('[API] Adding X-API-Key header')
    }

    return config
  },
  (error) => {
    console.error('[API Request Error]', error)
    return Promise.reject(error)
  },
)

/**
 * 响应拦截器 - 直接返回 data 并缓存
 */
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    console.log('[API Response]', response.config.url, response.status)

    // 缓存GET请求的响应
    if (response.config.method === 'get') {
      const cacheKey = generateCacheKey(response.config.url || '', response.config.params)
      setCache(cacheKey, response.data)
    }

    return response.data
  },
  (error) => {
    console.error('[API Response Error]', {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      url: error.config?.url,
    })

    // 提供更友好的错误信息
    if (error.code === 'ECONNABORTED') {
      console.error('请求超时，请检查网络连接')
    } else if (error.response?.status === 401) {
      console.error('API Key 无效或已过期')
    } else if (error.response?.status === 403) {
      console.error('访问被拒绝，可能需要 API Key')
    } else if (error.response?.status === 404) {
      console.error('API 端点不存在')
    } else if (!error.response) {
      console.error('网络错误，请检查网络连接或代理配置')
    }

    return Promise.reject(error)
  },
)

// 存储当前请求的cancel token
let currentCancelTokenSource: CancelTokenSource | null = null

/**
 * 取消正在进行的请求
 */
export const cancelCurrentRequest = (): void => {
  if (currentCancelTokenSource) {
    currentCancelTokenSource.cancel('Request cancelled by user')
    currentCancelTokenSource = null
  }
}

/**
 * 搜索壁纸（带缓存和取消机制）
 * @param params 搜索参数
 * @returns 壁纸数据
 */
export const searchWallpapers = async (params: GetParams | null): Promise<any> => {
  try {
    // 生成缓存key
    const cacheKey = generateCacheKey('/search', params)

    // 尝试从缓存获取
    const cachedData = getFromCache(cacheKey)
    if (cachedData) {
      console.log('[API] Using cached data for search')
      return cachedData
    }

    // 取消之前的请求
    cancelCurrentRequest()

    // 创建新的cancel token
    currentCancelTokenSource = axios.CancelToken.source()

    // 生产环境使用 Electron IPC
    if (isProduction()) {
      const data = await callWallhavenAPIViaIPC('/search', params)
      setCache(cacheKey, data)
      return data
    }

    // 开发环境使用 axios 代理
    const response = await apiClient.get('/search', {
      params,
      cancelToken: currentCancelTokenSource.token,
    })

    return response as unknown as any
  } catch (error: any) {
    // 忽略取消的请求
    if (axios.isCancel(error)) {
      console.log('[API] Request cancelled')
      return null
    }

    console.error('搜索壁纸失败:', error)
    throw error
  }
}

/**
 * 获取单个壁纸详情
 * @param id 壁纸ID
 * @returns 壁纸详情
 */
export const getWallpaperDetail = async (id: string): Promise<any> => {
  try {
    // 生成缓存key
    const cacheKey = generateCacheKey(`/w/${id}`, {})

    // 尝试从缓存获取
    const cachedData = getFromCache(cacheKey)
    if (cachedData) {
      console.log('[API] Using cached data for wallpaper detail')
      return cachedData
    }

    // 生产环境使用 Electron IPC
    if (isProduction()) {
      const data = await callWallhavenAPIViaIPC(`/w/${id}`, {})
      setCache(cacheKey, data)
      return data
    }

    // 开发环境使用 axios 代理
    const response = await apiClient.get(`/w/${id}`)
    return response as unknown as any
  } catch (error) {
    console.error('获取壁纸详情失败:', error)
    throw error
  }
}

export default apiClient
