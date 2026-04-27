/**
 * Window Service
 * 业务逻辑层：处理窗口控制的业务逻辑
 */

import { windowRepository } from '@/repositories'
import type { IpcResponse } from '@/shared/types/ipc'

/**
 * WindowService 实现类
 */
class WindowServiceImpl {
  /**
   * 最小化窗口
   */
  async minimize(): Promise<IpcResponse<void>> {
    const result = await windowRepository.minimize()
    if (!result.success) {
      console.error('[WindowService] 最小化窗口失败:', result.error?.message)
    }
    return result
  }

  /**
   * 最大化/还原窗口
   */
  async maximize(): Promise<IpcResponse<void>> {
    const result = await windowRepository.maximize()
    if (!result.success) {
      console.error('[WindowService] 最大化窗口失败:', result.error?.message)
    }
    return result
  }

  /**
   * 关闭窗口
   */
  async close(): Promise<IpcResponse<void>> {
    const result = await windowRepository.close()
    if (!result.success) {
      console.error('[WindowService] 关闭窗口失败:', result.error?.message)
    }
    return result
  }

  /**
   * 获取窗口最大化状态
   */
  async isMaximized(): Promise<boolean> {
    const result = await windowRepository.isMaximized()
    if (!result.success) {
      console.error('[WindowService] 获取窗口状态失败:', result.error?.message)
      return false
    }
    return result.data ?? false
  }
}

export const windowService = new WindowServiceImpl()
