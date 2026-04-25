/**
 * Store 操作错误类
 */

import { AppError, type AppErrorOptions } from './AppError'

/**
 * StoreError 构造选项
 */
export interface StoreErrorOptions extends AppErrorOptions {
  key?: string
  operation?: 'get' | 'set' | 'delete' | 'clear'
}

/**
 * Store 操作错误
 *
 * @example
 * ```typescript
 * throw new StoreError('读取设置失败', {
 *   key: 'user-preferences',
 *   operation: 'get',
 *   context: { reason: '文件不存在' }
 * })
 * ```
 */
export class StoreError extends AppError {
  /**
   * 操作的键名
   */
  readonly key?: string

  /**
   * 操作类型
   */
  readonly operation?: 'get' | 'set' | 'delete' | 'clear'

  constructor(message: string, options?: StoreErrorOptions) {
    super(message, {
      code: options?.code ?? 'STORE_ERROR',
      context: options?.context,
      cause: options?.cause,
    })
    this.name = 'StoreError'
    this.key = options?.key
    this.operation = options?.operation

    Object.setPrototypeOf(this, StoreError.prototype)
  }

  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      key: this.key,
      operation: this.operation,
    }
  }
}
