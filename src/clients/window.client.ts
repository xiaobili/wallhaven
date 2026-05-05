/**
 * 窗口控制客户端
 * 封装窗口最小化、最大化、关闭等操作
 */

import type { IpcResponse } from '@/types/ipc'
import { BaseClient } from './base.client'

/**
 * 窗口客户端实现类
 */
class WindowClientImpl extends BaseClient {
  /**
   * 最小化窗口
   */
  async minimize(): Promise<IpcResponse<void>> {
    if (!this.isAvailable()) {
      return this.createUnavailableResponse<void>()
    }

    try {
      await window.electronAPI.minimizeWindow()
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: { code: 'WINDOW_CONTROL_ERROR', message: String(error) },
      }
    }
  }

  /**
   * 最大化窗口
   */
  async maximize(): Promise<IpcResponse<void>> {
    if (!this.isAvailable()) {
      return this.createUnavailableResponse<void>()
    }

    try {
      await window.electronAPI.maximizeWindow()
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: { code: 'WINDOW_CONTROL_ERROR', message: String(error) },
      }
    }
  }

  /**
   * 关闭窗口
   */
  async close(): Promise<IpcResponse<void>> {
    if (!this.isAvailable()) {
      return this.createUnavailableResponse<void>()
    }

    try {
      await window.electronAPI.closeWindow()
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: { code: 'WINDOW_CONTROL_ERROR', message: String(error) },
      }
    }
  }

  /**
   * 检查窗口是否最大化
   */
  async isMaximized(): Promise<IpcResponse<boolean>> {
    if (!this.isAvailable()) {
      return this.createUnavailableResponse<boolean>()
    }

    try {
      const maximized = await window.electronAPI.isMaximized()
      return { success: true, data: maximized }
    } catch (error) {
      return {
        success: false,
        data: false,
        error: { code: 'WINDOW_CONTROL_ERROR', message: String(error) },
      }
    }
  }
}

/** 窗口客户端单例 */
export const windowClient = new WindowClientImpl()
