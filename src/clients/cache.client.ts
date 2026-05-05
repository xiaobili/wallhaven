/**
 * 缓存管理客户端
 * 封装应用缓存清理和信息获取
 */

import type { IpcResponse, CacheInfo } from '@/types/ipc'
import { BaseClient } from './base.client'

/**
 * 缓存客户端实现类
 */
class CacheClientImpl extends BaseClient {
  /**
   * 清理应用缓存
   */
  async clear(downloadPath?: string): Promise<
    IpcResponse<{
      thumbnailsDeleted: number
      tempFilesDeleted: number
    }>
  > {
    if (!this.isAvailable()) {
      return this.createUnavailableResponse<{
        thumbnailsDeleted: number
        tempFilesDeleted: number
      }>()
    }

    try {
      const result = await window.electronAPI.clearAppCache(downloadPath)
      if (result.success) {
        return {
          success: true,
          data: {
            thumbnailsDeleted: result.thumbnailsDeleted,
            tempFilesDeleted: result.tempFilesDeleted,
          },
        }
      }
      return {
        success: false,
        error: { code: 'CACHE_ERROR', message: result.error || 'Clear cache failed' },
      }
    } catch (error) {
      return {
        success: false,
        error: { code: 'CACHE_ERROR', message: String(error) },
      }
    }
  }

  /**
   * 获取缓存信息
   */
  async getInfo(downloadPath?: string): Promise<IpcResponse<CacheInfo>> {
    if (!this.isAvailable()) {
      return this.createUnavailableResponse<CacheInfo>()
    }

    try {
      const result = await window.electronAPI.getCacheInfo(downloadPath)
      if (result.success) {
        return { success: true, data: result.info }
      }
      return {
        success: false,
        error: { code: 'CACHE_ERROR', message: result.error || 'Get cache info failed' },
      }
    } catch (error) {
      return {
        success: false,
        error: { code: 'CACHE_ERROR', message: String(error) },
      }
    }
  }

  /**
   * 清理孤儿临时文件
   * 删除超过 7 天的临时文件和状态文件
   */
  async cleanupOrphanFiles(
    downloadPath: string,
  ): Promise<IpcResponse<{ filesDeleted: number; stateFilesDeleted: number }>> {
    if (!this.isAvailable()) {
      return this.createUnavailableResponse<{ filesDeleted: number; stateFilesDeleted: number }>()
    }

    try {
      const result = await window.electronAPI.cleanupOrphanFiles(downloadPath)
      if (result.success) {
        return {
          success: true,
          data: {
            filesDeleted: result.filesDeleted,
            stateFilesDeleted: result.stateFilesDeleted,
          },
        }
      }
      return {
        success: false,
        error: { code: 'CLEANUP_ERROR', message: result.errors?.join('; ') || 'Cleanup failed' },
      }
    } catch (error) {
      return {
        success: false,
        error: { code: 'CLEANUP_ERROR', message: String(error) },
      }
    }
  }
}

/** 缓存客户端单例 */
export const cacheClient = new CacheClientImpl()
