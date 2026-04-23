// API Service 层 - 统一管理 Wallhaven API 调用

import axios, { type AxiosResponse } from 'axios'
import type { GetParams } from '@/types'
import { getSettingsFromStorage } from '@/stores/modules/wallpaper/settings-storage'

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
 * 请求拦截器
 */
apiClient.interceptors.request.use(
  (config) => {
    console.log('[API Request]', config.method?.toUpperCase(), config.url, config.params)
    
    // 从 localStorage 获取设置，如果存在 API Key 则添加到请求头
    const settings = getSettingsFromStorage()
    if (settings?.apiKey) {
      config.headers['X-API-Key'] = settings.apiKey
      console.log('[API] Added X-API-Key header')
    }
    
    return config
  },
  (error) => {
    console.error('[API Request Error]', error)
    return Promise.reject(error)
  },
)

/**
 * 响应拦截器 - 直接返回 data
 */
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    console.log('[API Response]', response.config.url, response.status)
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

/**
 * 搜索壁纸
 * @param params 搜索参数
 * @returns 壁纸数据
 */
export const searchWallpapers = async (params: GetParams | null): Promise<any> => {
  try {
    const response = await apiClient.get('/search', { params })
    return response as unknown as any
  } catch (error) {
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
    const response = await apiClient.get(`/w/${id}`)
    return response as unknown as any
  } catch (error) {
    console.error('获取壁纸详情失败:', error)
    throw error
  }
}

export default apiClient
