/**
 * Store 客户端
 * 封装 electron-store 的 CRUD 操作
 */

import type { IpcResponse } from '@/types/ipc'
import { BaseClient } from './base.client'
import { ErrorCodes } from '@/errors'

/**
 * Store 客户端实现类
 */
class StoreClientImpl extends BaseClient {
  /**
   * 从 electron-store 获取数据
   */
  async get<T>(key: string): Promise<IpcResponse<T | null>> {
    if (!this.isAvailable()) {
      return this.createUnavailableResponse<T | null>()
    }

    try {
      const result = await window.electronAPI.storeGet(key)
      if (result.success) {
        return { success: true, data: result.value as T }
      }
      return {
        success: false,
        data: null,
        error: {
          code: ErrorCodes.STORE_READ_ERROR,
          message: result.error || 'Store get failed',
        },
      }
    } catch (error) {
      return {
        success: false,
        data: null,
        error: { code: ErrorCodes.STORE_ERROR, message: String(error) },
      }
    }
  }

  /**
   * 向 electron-store 保存数据
   */
  async set(key: string, value: unknown): Promise<IpcResponse<void>> {
    if (!this.isAvailable()) {
      return this.createUnavailableResponse<void>()
    }

    try {
      // 深度克隆对象，移除 Vue reactive proxy，避免 IPC 克隆错误
      const plainValue = JSON.parse(JSON.stringify(value))
      const result = await window.electronAPI.storeSet({ key, value: plainValue })
      if (result.success) {
        return { success: true }
      }
      return {
        success: false,
        error: {
          code: ErrorCodes.STORE_WRITE_ERROR,
          message: result.error || 'Store set failed',
        },
      }
    } catch (error) {
      return {
        success: false,
        error: { code: ErrorCodes.STORE_ERROR, message: String(error) },
      }
    }
  }

  /**
   * 从 electron-store 删除数据
   */
  async delete(key: string): Promise<IpcResponse<void>> {
    if (!this.isAvailable()) {
      return this.createUnavailableResponse<void>()
    }

    try {
      const result = await window.electronAPI.storeDelete(key)
      if (result.success) {
        return { success: true }
      }
      return {
        success: false,
        error: {
          code: ErrorCodes.STORE_DELETE_ERROR,
          message: result.error || 'Store delete failed',
        },
      }
    } catch (error) {
      return {
        success: false,
        error: { code: ErrorCodes.STORE_ERROR, message: String(error) },
      }
    }
  }

  /**
   * 清空 electron-store 所有数据
   */
  async clear(): Promise<IpcResponse<void>> {
    if (!this.isAvailable()) {
      return this.createUnavailableResponse<void>()
    }

    try {
      const result = await window.electronAPI.storeClear()
      if (result.success) {
        return { success: true }
      }
      return {
        success: false,
        error: { code: ErrorCodes.STORE_ERROR, message: result.error || 'Store clear failed' },
      }
    } catch (error) {
      return {
        success: false,
        error: { code: ErrorCodes.STORE_ERROR, message: String(error) },
      }
    }
  }
}

/** Store 客户端单例 */
export const storeClient = new StoreClientImpl()
