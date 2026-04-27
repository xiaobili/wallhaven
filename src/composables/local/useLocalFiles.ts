/**
 * 本地文件操作 Composable
 *
 * 封装本地文件操作逻辑，协调 SettingsService
 * 提供读取目录、打开文件夹、删除文件功能
 *
 * @example
 * ```typescript
 * const { readDirectory, openFolder, deleteFile } = useLocalFiles()
 *
 * // 读取目录
 * const result = await readDirectory('/path/to/folder')
 * if (result.success) {
 *   console.log('文件列表:', result.data)
 * }
 *
 * // 打开文件夹
 * await openFolder('/path/to/folder')
 *
 * // 删除文件
 * await deleteFile('/path/to/file.jpg')
 * ```
 */

import { useAlert } from '@/composables'
import { settingsService } from '@/services'
import type { IpcResponse, LocalFile } from '@/shared/types/ipc'

/**
 * useLocalFiles 返回值接口
 */
export interface UseLocalFilesReturn {
  /** 读取目录内容 */
  readDirectory: (dirPath: string) => Promise<IpcResponse<LocalFile[]>>
  /** 在系统文件管理器中打开文件夹 */
  openFolder: (folderPath: string) => Promise<IpcResponse<void>>
  /** 删除文件 */
  deleteFile: (filePath: string) => Promise<IpcResponse<void>>
}

/**
 * 本地文件操作 Composable
 *
 * @returns 文件操作方法
 */
export function useLocalFiles(): UseLocalFilesReturn {
  const { showError } = useAlert()

  /**
   * 读取目录内容
   * @param dirPath - 目录路径
   * @returns 文件列表
   */
  const readDirectory = async (dirPath: string): Promise<IpcResponse<LocalFile[]>> => {
    const result = await settingsService.readDirectory(dirPath)

    if (!result.success) {
      showError(result.error?.message || '读取目录失败')
    }

    return result
  }

  /**
   * 在系统文件管理器中打开文件夹
   * @param folderPath - 文件夹路径
   */
  const openFolder = async (folderPath: string): Promise<IpcResponse<void>> => {
    const result = await settingsService.openFolder(folderPath)

    if (!result.success) {
      showError(result.error?.message || '打开文件夹失败')
    }

    return result
  }

  /**
   * 删除文件
   * @param filePath - 文件路径
   */
  const deleteFile = async (filePath: string): Promise<IpcResponse<void>> => {
    const result = await settingsService.deleteFile(filePath)

    if (!result.success) {
      showError(result.error?.message || '删除文件失败')
    }

    return result
  }

  return {
    readDirectory,
    openFolder,
    deleteFile,
  }
}
