/**
 * Electron IPC 基础客户端
 * 提供公共辅助方法，所有功能客户端继承此类
 */

import type { IpcResponse } from '@/types/ipc'
import { ErrorCodes } from '@/errors'

/**
 * 基础客户端抽象类
 * 封装 Electron API 可用性检查和错误响应创建
 */
export abstract class BaseClient {
  /**
   * 检查 Electron API 是否可用
   */
  protected isAvailable(): boolean {
    return typeof window !== 'undefined' && !!window.electronAPI
  }

  /**
   * 创建错误响应
   */
  protected createErrorResponse<T>(code: string, message: string): IpcResponse<T> {
    return {
      success: false,
      error: { code, message },
    }
  }

  /**
   * 创建 Electron 不可用错误响应
   */
  protected createUnavailableResponse<T>(): IpcResponse<T> {
    return this.createErrorResponse<T>('ELECTRON_UNAVAILABLE', 'Electron API is not available')
  }

  /**
   * 安全执行 IPC 调用
   * 自动处理 Electron 不可用和异常情况
   */
  protected async safeCall<T>(
    operation: string,
    fn: () => Promise<IpcResponse<T>>,
  ): Promise<IpcResponse<T>> {
    if (!this.isAvailable()) {
      return this.createUnavailableResponse<T>()
    }

    try {
      return await fn()
    } catch (error) {
      return {
        success: false,
        error: {
          code: ErrorCodes.IPC_ERROR,
          message: error instanceof Error ? error.message : `${operation} failed`,
        },
      }
    }
  }
}
