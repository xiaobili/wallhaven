/**
 * API 客户端
 * 封装 HTTP 请求逻辑，支持开发/生产两种模式
 */

import axios, { type AxiosRequestConfig, type AxiosError } from 'axios'
import type { IpcResponse } from '@/shared/types/ipc'
import { ErrorCodes } from '@/errors'

/**
 * API 客户端实现类
 */
class ApiClientImpl {
  private axiosInstance = axios.create({
    baseURL: '/api',
    timeout: 15000,
    headers: { 'Content-Type': 'application/json' },
  })

  /**
   * 检查是否为生产环境
   */
  private isProduction(): boolean {
    return (
      typeof window !== 'undefined' &&
      !!window.electronAPI &&
      import.meta.env.PROD
    )
  }

  /**
   * 根据错误类型获取错误码
   */
  private getErrorCode(error: unknown): string {
    if (!axios.isAxiosError(error)) {
      return ErrorCodes.NETWORK_ERROR
    }

    const axiosError = error as AxiosError

    if (axiosError.code === 'ECONNABORTED') {
      return ErrorCodes.NETWORK_TIMEOUT
    }

    if (axiosError.response) {
      const status = axiosError.response.status
      if (status === 401) return ErrorCodes.NETWORK_UNAUTHORIZED
      if (status === 403) return ErrorCodes.NETWORK_FORBIDDEN
      if (status === 404) return ErrorCodes.NETWORK_NOT_FOUND
      if (status >= 500) return ErrorCodes.NETWORK_SERVER_ERROR
    }

    return ErrorCodes.NETWORK_ERROR
  }

  /**
   * 获取错误消息
   */
  private getErrorMessage(error: unknown): string {
    if (axios.isAxiosError(error)) {
      return error.message || 'Network error'
    }
    return String(error)
  }

  /**
   * GET 请求
   */
  async get<T>(
    url: string,
    params?: Record<string, unknown>,
    apiKey?: string
  ): Promise<IpcResponse<T>> {
    try {
      // 生产环境：通过 Electron IPC 代理
      if (this.isProduction() && window.electronAPI) {
        const result = await window.electronAPI.wallhavenApiRequest({
          endpoint: url,
          params,
          apiKey,
        })

        if (result.success && result.data !== null) {
          return { success: true, data: result.data as T }
        }
        return {
          success: false,
          error: {
            code:
              result.status === 401
                ? ErrorCodes.NETWORK_UNAUTHORIZED
                : 'API_ERROR',
            message: result.error || 'API request failed',
          },
        }
      }

      // 开发环境：直接 axios 请求
      const config: AxiosRequestConfig = { params }
      if (apiKey) {
        config.headers = { 'X-API-Key': apiKey }
      }

      const response = await this.axiosInstance.get<T>(url, config)
      return { success: true, data: response.data }
    } catch (error) {
      return {
        success: false,
        error: {
          code: this.getErrorCode(error),
          message: this.getErrorMessage(error),
        },
      }
    }
  }

  /**
   * POST 请求
   */
  async post<T>(
    url: string,
    data?: unknown,
    apiKey?: string
  ): Promise<IpcResponse<T>> {
    try {
      // 生产环境：通过 Electron IPC 代理
      if (this.isProduction() && window.electronAPI) {
        const result = await window.electronAPI.wallhavenApiRequest({
          endpoint: url,
          params: { method: 'POST', body: data },
          apiKey,
        })

        if (result.success && result.data !== null) {
          return { success: true, data: result.data as T }
        }
        return {
          success: false,
          error: {
            code: 'API_ERROR',
            message: result.error || 'API request failed',
          },
        }
      }

      // 开发环境：直接 axios 请求
      const config: AxiosRequestConfig = {}
      if (apiKey) {
        config.headers = { 'X-API-Key': apiKey }
      }

      const response = await this.axiosInstance.post<T>(url, data, config)
      return { success: true, data: response.data }
    } catch (error) {
      return {
        success: false,
        error: {
          code: this.getErrorCode(error),
          message: this.getErrorMessage(error),
        },
      }
    }
  }
}

export const apiClient = new ApiClientImpl()
