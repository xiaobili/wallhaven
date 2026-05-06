/**
 * 错误类统一导出
 */

// 错误类导出
export { AppError } from './AppError'
export { IpcError } from './IpcError'
export { StoreError } from './StoreError'
export { NetworkError } from './NetworkError'

// 类型导出
export type {
  AppErrorOptions,
  IpcErrorOptions,
  StoreErrorOptions,
  NetworkErrorOptions,
} from './types'

// 错误码导出
export { ErrorCodes, type ErrorCode } from './types'

// ==================== IPC 错误处理统一化 ====================

import type { IpcErrorInfo } from '../types/ipc'

// 导出 IpcErrorInfo 类型供主进程使用
export type { IpcErrorInfo } from '../types/ipc'

/**
 * IPC 错误码常量
 * 用于统一错误返回格式
 */
export const IPC_ERROR_CODES = {
  // 通用错误
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  PARSE_ERROR: 'PARSE_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',

  // 文件操作
  FILE_NOT_FOUND: 'FILE_NOT_FOUND',
  FILE_DELETE_FAILED: 'FILE_DELETE_FAILED',

  // 下载相关
  DOWNLOAD_PATH_NOT_SET: 'DOWNLOAD_PATH_NOT_SET',
  DOWNLOAD_FAILED: 'DOWNLOAD_FAILED',

  // 壁纸设置
  WALLPAPER_FILE_NOT_FOUND: 'WALLPAPER_FILE_NOT_FOUND',
  WALLPAPER_MODULE_ERROR: 'WALLPAPER_MODULE_ERROR',

  // 任务操作
  TASK_NOT_FOUND: 'TASK_NOT_FOUND',
} as const

/**
 * 创建标准错误响应的辅助函数
 * @param code - 错误码
 * @param message - 错误消息
 * @returns 标准化的错误响应对象
 */
export function createErrorResponse(
  code: string,
  message: string,
): { success: false; error: IpcErrorInfo } {
  return {
    success: false,
    error: {
      code,
      message,
    },
  }
}
