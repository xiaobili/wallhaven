/**
 * 应用基础错误类
 * 提供统一的错误结构，包含错误码和上下文信息
 */

import type { AppErrorOptions as AppErrorOptionsBase } from './types'

// Re-export for convenience
export type AppErrorOptions = AppErrorOptionsBase

/**
 * 应用基础错误类
 *
 * @example
 * ```typescript
 * throw new AppError('操作失败', {
 *   code: 'OPERATION_FAILED',
 *   context: { userId: 123 }
 * })
 * ```
 */
export class AppError extends Error {
  /**
   * 错误码，用于错误分类
   */
  readonly code: string

  /**
   * 错误上下文，用于调试和日志
   */
  readonly context?: Record<string, unknown>

  /**
   * 原始错误，用于错误链追踪
   */
  readonly cause?: Error

  constructor(message: string, options?: AppErrorOptions) {
    super(message)
    this.name = 'AppError'
    this.code = options?.code ?? 'UNKNOWN_ERROR'
    this.context = options?.context
    this.cause = options?.cause

    // 确保原型链正确（TypeScript 编译到 ES5 时需要）
    Object.setPrototypeOf(this, AppError.prototype)
  }

  /**
   * 序列化为 JSON
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      context: this.context,
      cause: this.cause?.message,
    }
  }

  /**
   * 转换为字符串
   */
  toString(): string {
    let result = `${this.name} [${this.code}]: ${this.message}`
    if (this.context) {
      result += ` (context: ${JSON.stringify(this.context)})`
    }
    return result
  }
}
