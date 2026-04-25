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
