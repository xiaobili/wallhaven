/**
 * 下载仓储
 * 管理已完成下载记录的持久化存储
 */

import type { IpcResponse } from '@/types/ipc'
import type { FinishedDownloadItem } from '@/types'
import { electronClient, STORAGE_KEYS } from '@/clients'

/**
 * Promise-based mutex to serialize concurrent add() / remove() calls.
 * Each caller chains behind the previous one, preventing the
 * read-modify-write race: concurrent get+set interleaving would
 * silently lose data (CR-02).
 */
const serialMutex: Promise<void> = Promise.resolve()

function withSerialAccess<T>(fn: () => Promise<T>): Promise<T> {
  let release: () => void
  new Promise<void>((resolve) => {
    release = resolve
  })
  return serialMutex.then(() => fn()).finally(() => release!())
}

/**
 * 下载仓储
 */
export const downloadRepository = {
  /**
   * 获取已完成下载列表
   * @returns 返回下载记录列表，如果未设置则返回空数组
   */
  async get(): Promise<IpcResponse<FinishedDownloadItem[]>> {
    const result = await electronClient.storeGet<FinishedDownloadItem[]>(
      STORAGE_KEYS.DOWNLOAD_FINISHED_LIST,
    )

    if (result.success) {
      // 返回数据或空数组
      return { success: true, data: result.data || [] }
    }

    // 失败时返回空数组作为默认值
    return { success: false, data: [], error: result.error }
  },

  /**
   * 保存已完成下载列表
   * @param items - 下载记录列表
   */
  async set(items: FinishedDownloadItem[]): Promise<IpcResponse<void>> {
    return electronClient.storeSet(STORAGE_KEYS.DOWNLOAD_FINISHED_LIST, items)
  },

  /**
   * 添加已完成下载项（添加到列表头部）
   * @param item - 下载记录项
   */
  async add(item: FinishedDownloadItem): Promise<IpcResponse<void>> {
    return withSerialAccess(async () => {
      const result = await this.get()
      if (!result.success) {
        return { success: false, error: result.error }
      }

      const items = [item, ...(result.data ?? [])]
      return this.set(items)
    })
  },

  /**
   * 移除指定下载项
   * @param id - 下载记录 ID
   */
  async remove(id: string): Promise<IpcResponse<void>> {
    return withSerialAccess(async () => {
      const result = await this.get()
      if (!result.success) {
        return { success: false, error: result.error }
      }

      // result.data 已在 get() 中保证为数组
      const items = (result.data ?? []).filter((item) => item.id !== id)
      return this.set(items)
    })
  },

  /**
   * 清空已完成下载列表
   */
  async clear(): Promise<IpcResponse<void>> {
    return electronClient.storeDelete(STORAGE_KEYS.DOWNLOAD_FINISHED_LIST)
  },
}
