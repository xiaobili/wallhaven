// API Service 层 - 统一管理 Wallhaven API 调用

import axios, { type AxiosResponse } from 'axios'
import type { GetParams } from '@/types'

/**
 * 创建 axios 实例
 */
const apiClient = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

/**
 * 请求拦截器
 */
apiClient.interceptors.request.use(
  (config) => {
    // 可以在这里添加 token 等认证信息
    return config
  },
  (error) => {
    return Promise.reject(error)
  },
)

/**
 * 响应拦截器 - 直接返回 data
 */
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response.data
  },
  (error) => {
    console.error('API 请求错误:', error.message)
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
