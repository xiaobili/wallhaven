/**
 * Wallhaven API Proxy IPC Handler
 *
 * Used for production environments to bypass CORS restrictions.
 * Implements retry logic for transient network errors.
 */

import { ipcMain } from 'electron'
import axios from 'axios'
import { logHandler } from './base'

/**
 * Wallhaven API 代理
 * 用于生产环境中绕过 CORS 限制
 */
ipcMain.handle(
  'wallhaven-api-request',
  async (
    _event,
    {
      endpoint,
      params,
      apiKey,
    }: {
      endpoint: string
      params?: any
      apiKey?: string
    },
  ) => {
    const maxRetries = 2 // 最大重试次数（总共尝试3次）
    let lastError: any = null

    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      try {
        // SECURITY: Filter apiKey from log output
        logHandler('wallhaven-api-request', `Attempt ${attempt}/${maxRetries + 1}: ${endpoint}`)

        // 构建请求URL
        const url = `https://wallhaven.cc/api/v1${endpoint}`

        // 发起请求
        const response = await axios.get(url, {
          params: params,
          headers: {
            'User-Agent': 'Wallhaven-Desktop-App/1.0',
            ...(apiKey ? { 'X-API-Key': apiKey } : {}),
          },
          timeout: 15000,
          // 添加 HTTPS Agent 配置以处理 TLS 连接问题
          httpsAgent: new (await import('https')).Agent({
            keepAlive: true,
            keepAliveMsecs: 30000,
            maxSockets: 10,
            maxFreeSockets: 5,
            scheduling: 'fifo',
          }),
        })

        if (attempt > 1) {
          logHandler('wallhaven-api-request', `Success on attempt ${attempt}`)
        }

        return {
          success: true,
          data: response.data,
        }
      } catch (error: any) {
        lastError = error
        logHandler('wallhaven-api-request', `Error (attempt ${attempt}): ${error.message}`, 'error')

        // 检查是否是可重试的错误
        const isRetryableError =
          error.code === 'ECONNRESET' ||
          error.code === 'ETIMEDOUT' ||
          error.code === 'ECONNABORTED' ||
          error.message.includes('socket disconnected') ||
          error.message.includes('TLS') ||
          !error.response // 网络层面的错误

        // 如果不是最后一次尝试且错误可重试，则等待后重试
        if (attempt <= maxRetries && isRetryableError) {
          const delay = Math.pow(2, attempt) * 500 // 指数退避：1s, 2s
          logHandler('wallhaven-api-request', `Retrying in ${delay}ms...`)
          await new Promise(resolve => setTimeout(resolve, delay))
          continue
        }

        // 不可重试的错误或已达到最大重试次数，跳出循环
        break
      }
    }

    // 所有尝试都失败了
    logHandler('wallhaven-api-request', `All attempts failed: ${lastError?.message}`, 'error')

    return {
      success: false,
      error: lastError?.message || 'Unknown error',
      status: lastError?.response?.status,
      data: null,
    }
  },
)
