/**
 * 文件操作客户端
 * 封装文件系统相关操作
 */

import type { IpcResponse, LocalFile } from '@/types/ipc'
import { BaseClient } from './base.client'

/**
 * 文件客户端实现类
 */
class FileClientImpl extends BaseClient {
  /**
   * 选择文件夹
   */
  async selectFolder(): Promise<IpcResponse<string | null>> {
    if (!this.isAvailable()) {
      return this.createUnavailableResponse<string | null>()
    }

    try {
      const path = await window.electronAPI.selectFolder()
      return { success: true, data: path }
    } catch (error) {
      return {
        success: false,
        data: null,
        error: { code: 'SELECT_FOLDER_ERROR', message: String(error) },
      }
    }
  }

  /**
   * 读取目录
   */
  async readDirectory(dirPath: string, page?: number, pageSize?: number): Promise<IpcResponse<LocalFile[]>> {
    if (!this.isAvailable()) {
      return this.createUnavailableResponse<LocalFile[]>()
    }

    try {
      const result = await window.electronAPI.readDirectory(dirPath, page, pageSize)
      if (result.error) {
        return {
          success: false,
          data: [],
          pagination: { total: result.total, page: result.page, pageSize: result.pageSize },
          error: { code: 'READ_DIRECTORY_ERROR', message: result.error },
        }
      }
      return {
        success: true,
        data: result.files as LocalFile[],
        pagination: { total: result.total, page: result.page, pageSize: result.pageSize },
      }
    } catch (error) {
      return {
        success: false,
        data: [],
        error: { code: 'READ_DIRECTORY_ERROR', message: String(error) },
      }
    }
  }

  /**
   * 打开文件夹
   */
  async openFolder(folderPath: string): Promise<IpcResponse<void>> {
    if (!this.isAvailable()) {
      return this.createUnavailableResponse<void>()
    }

    try {
      const result = await window.electronAPI.openFolder(folderPath)
      if (result.success) {
        return { success: true }
      }
      return {
        success: false,
        error: { code: 'OPEN_FOLDER_ERROR', message: result.error || 'Open folder failed' },
      }
    } catch (error) {
      return {
        success: false,
        error: { code: 'OPEN_FOLDER_ERROR', message: String(error) },
      }
    }
  }

  /**
   * 删除文件
   */
  async deleteFile(filePath: string): Promise<IpcResponse<void>> {
    if (!this.isAvailable()) {
      return this.createUnavailableResponse<void>()
    }

    try {
      const result = await window.electronAPI.deleteFile(filePath)
      if (result.success) {
        return { success: true }
      }
      return {
        success: false,
        error: { code: 'DELETE_FILE_ERROR', message: result.error || 'Delete file failed' },
      }
    } catch (error) {
      return {
        success: false,
        error: { code: 'DELETE_FILE_ERROR', message: String(error) },
      }
    }
  }

  /**
   * 检查文件是否存在
   */
  async fileExists(filePath: string): Promise<IpcResponse<boolean>> {
    if (!this.isAvailable()) {
      return this.createUnavailableResponse<boolean>()
    }

    try {
      const result = await window.electronAPI.checkFileExists(filePath)
      if (result.success) {
        return { success: true, data: result.exists }
      }
      return {
        success: false,
        data: false,
        error: {
          code: 'FILE_EXISTS_ERROR',
          message: result.error || 'File existence check failed',
        },
      }
    } catch (error) {
      return {
        success: false,
        data: false,
        error: { code: 'FILE_EXISTS_ERROR', message: String(error) },
      }
    }
  }
}

/** 文件客户端单例 */
export const fileClient = new FileClientImpl()
