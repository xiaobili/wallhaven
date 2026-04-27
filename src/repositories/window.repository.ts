/**
 * Window Repository
 * 封装 electronClient 的窗口控制方法，提供数据访问抽象
 */

import { electronClient } from '@/clients'
import type { IpcResponse } from '@/shared/types/ipc'

/**
 * WindowRepository 实现类
 */
class WindowRepositoryImpl {
  /**
   * 最小化窗口
   */
  async minimize(): Promise<IpcResponse<void>> {
    return electronClient.minimizeWindow()
  }

  /**
   * 最大化/还原窗口
   */
  async maximize(): Promise<IpcResponse<void>> {
    return electronClient.maximizeWindow()
  }

  /**
   * 关闭窗口
   */
  async close(): Promise<IpcResponse<void>> {
    return electronClient.closeWindow()
  }

  /**
   * 检查窗口是否最大化
   */
  async isMaximized(): Promise<IpcResponse<boolean>> {
    return electronClient.isMaximized()
  }
}

export const windowRepository = new WindowRepositoryImpl()
