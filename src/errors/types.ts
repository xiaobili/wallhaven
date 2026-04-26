/**
 * 错误类相关类型定义
 */

/**
 * AppError 构造选项
 */
export interface AppErrorOptions {
  code?: string
  context?: Record<string, unknown>
  cause?: Error
}

/**
 * IpcError 构造选项
 */
export interface IpcErrorOptions extends AppErrorOptions {
  channel?: string
}

/**
 * StoreError 构造选项
 */
export interface StoreErrorOptions extends AppErrorOptions {
  key?: string
  operation?: 'get' | 'set' | 'delete' | 'clear'
}

/**
 * NetworkError 构造选项
 */
export interface NetworkErrorOptions extends AppErrorOptions {
  statusCode?: number
  url?: string
  timeout?: boolean
}

/**
 * 错误码常量
 */
export const ErrorCodes = {
  // 通用错误
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',

  // IPC 错误
  IPC_ERROR: 'IPC_ERROR',
  IPC_HANDLER_NOT_FOUND: 'IPC_HANDLER_NOT_FOUND',
  IPC_RESPONSE_PARSE_ERROR: 'IPC_RESPONSE_PARSE_ERROR',
  IPC_TIMEOUT: 'IPC_TIMEOUT',

  // Store 错误
  STORE_ERROR: 'STORE_ERROR',
  STORE_READ_ERROR: 'STORE_READ_ERROR',
  STORE_WRITE_ERROR: 'STORE_WRITE_ERROR',
  STORE_DELETE_ERROR: 'STORE_DELETE_ERROR',

  // 网络错误
  NETWORK_ERROR: 'NETWORK_ERROR',
  NETWORK_TIMEOUT: 'NETWORK_TIMEOUT',
  NETWORK_UNAUTHORIZED: 'NETWORK_UNAUTHORIZED',
  NETWORK_FORBIDDEN: 'NETWORK_FORBIDDEN',
  NETWORK_NOT_FOUND: 'NETWORK_NOT_FOUND',
  NETWORK_SERVER_ERROR: 'NETWORK_SERVER_ERROR',

  // 断点续传错误
  RESUME_INVALID_OFFSET: 'RESUME_INVALID_OFFSET',
  RESUME_FILE_NOT_FOUND: 'RESUME_FILE_NOT_FOUND',
  RESUME_STATE_CORRUPTED: 'RESUME_STATE_CORRUPTED',
  RESUME_SERVER_UNSUPPORTED: 'RESUME_SERVER_UNSUPPORTED',
} as const

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes]
