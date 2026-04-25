/**
 * IPC 通信错误类
 */

import { AppError, type AppErrorOptions } from './AppError'

/**
 * IpcError 构造选项
 */
export interface IpcErrorOptions extends AppErrorOptions {
  channel?: string
}

/**
 * IPC 通信错误
 *
 * @example
 * ```typescript
 * throw new IpcError('IPC 调用失败', {
 *   channel: 'select-folder',
 *   context: { args: [] }
 * })
 * ```
 */
export class IpcError extends AppError {
  /**
   * IPC 通道名称
   */
  readonly channel?: string

  constructor(message: string, options?: IpcErrorOptions) {
    super(message, {
      code: options?.code ?? 'IPC_ERROR',
      context: options?.context,
      cause: options?.cause,
    })
    this.name = 'IpcError'
    this.channel = options?.channel

    Object.setPrototypeOf(this, IpcError.prototype)
  }

  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      channel: this.channel,
    }
  }
}
