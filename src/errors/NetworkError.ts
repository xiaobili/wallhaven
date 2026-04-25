/**
 * 网络请求错误类
 */

import { AppError, type AppErrorOptions } from './AppError'

/**
 * NetworkError 构造选项
 */
export interface NetworkErrorOptions extends AppErrorOptions {
  statusCode?: number
  url?: string
  timeout?: boolean
}

/**
 * 网络请求错误
 *
 * @example
 * ```typescript
 * throw new NetworkError('请求超时', {
 *   timeout: true,
 *   url: 'https://wallhaven.cc/api/v1/search',
 *   context: { timeout: 15000 }
 * })
 * ```
 */
export class NetworkError extends AppError {
  /**
   * HTTP 状态码
   */
  readonly statusCode?: number

  /**
   * 请求 URL
   */
  readonly url?: string

  /**
   * 是否为超时错误
   */
  readonly timeout: boolean

  constructor(message: string, options?: NetworkErrorOptions) {
    super(message, {
      code: options?.code ?? 'NETWORK_ERROR',
      context: options?.context,
      cause: options?.cause,
    })
    this.name = 'NetworkError'
    this.statusCode = options?.statusCode
    this.url = options?.url
    this.timeout = options?.timeout ?? false

    Object.setPrototypeOf(this, NetworkError.prototype)
  }

  /**
   * 获取用户友好的错误消息
   */
  getUserMessage(): string {
    if (this.timeout) {
      return '网络请求超时，请检查网络连接'
    }

    if (this.statusCode === 401) {
      return '认证失败，请检查 API Key'
    }

    if (this.statusCode === 403) {
      return '访问被拒绝'
    }

    if (this.statusCode === 404) {
      return '请求的资源不存在'
    }

    if (this.statusCode && this.statusCode >= 500) {
      return '服务器错误，请稍后重试'
    }

    if (!this.statusCode) {
      return '网络连接失败，请检查网络'
    }

    return this.message
  }

  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      statusCode: this.statusCode,
      url: this.url,
      timeout: this.timeout,
    }
  }
}
