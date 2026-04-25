/**
 * Alert 状态管理 composable
 *
 * 用于统一管理 Alert 提示框的状态和显示逻辑
 * 与现有 Alert.vue 组件配合使用
 *
 * @example
 * ```typescript
 * const { alert, showAlert, showSuccess, showError } = useAlert()
 *
 * // 显示成功提示
 * showSuccess('操作成功')
 *
 * // 显示错误提示（默认更长显示时间）
 * showError('操作失败')
 *
 * // 在模板中使用
 * // <Alert v-if="alert.visible" :type="alert.type" :message="alert.message" />
 * ```
 */

import { reactive, type Reactive } from 'vue'

/**
 * Alert 类型
 */
export type AlertType = 'success' | 'error' | 'warning' | 'info'

/**
 * Alert 状态接口
 */
export interface AlertState {
  visible: boolean
  type: AlertType
  message: string
  duration: number
}

/**
 * useAlert 返回值接口
 */
export interface UseAlertReturn {
  alert: Reactive<AlertState>
  showAlert: (message: string, type?: AlertType, duration?: number) => void
  hideAlert: () => void
  showSuccess: (message: string, duration?: number) => void
  showError: (message: string, duration?: number) => void
  showWarning: (message: string, duration?: number) => void
  showInfo: (message: string, duration?: number) => void
}

/**
 * 创建 Alert 状态管理
 *
 * @param defaultDuration 默认显示时长（毫秒），默认 3000ms
 * @returns Alert 状态和方法
 */
export function useAlert(defaultDuration = 3000): UseAlertReturn {
  const alert = reactive<AlertState>({
    visible: false,
    type: 'info',
    message: '',
    duration: defaultDuration,
  })

  /**
   * 显示 Alert
   *
   * @param message 提示消息
   * @param type 提示类型，默认 'info'
   * @param duration 显示时长（毫秒），默认使用 defaultDuration
   */
  const showAlert = (
    message: string,
    type: AlertType = 'info',
    duration: number = defaultDuration
  ): void => {
    alert.message = message
    alert.type = type
    alert.duration = duration
    alert.visible = true
  }

  /**
   * 隐藏 Alert
   */
  const hideAlert = (): void => {
    alert.visible = false
  }

  /**
   * 显示成功提示
   *
   * @param message 提示消息
   * @param duration 显示时长（毫秒），默认使用 defaultDuration
   */
  const showSuccess = (message: string, duration?: number): void => {
    showAlert(message, 'success', duration)
  }

  /**
   * 显示错误提示
   * 错误提示默认显示更长时间（5000ms）
   *
   * @param message 提示消息
   * @param duration 显示时长（毫秒），默认 5000ms
   */
  const showError = (message: string, duration = 5000): void => {
    showAlert(message, 'error', duration)
  }

  /**
   * 显示警告提示
   *
   * @param message 提示消息
   * @param duration 显示时长（毫秒），默认使用 defaultDuration
   */
  const showWarning = (message: string, duration?: number): void => {
    showAlert(message, 'warning', duration)
  }

  /**
   * 显示信息提示
   *
   * @param message 提示消息
   * @param duration 显示时长（毫秒），默认使用 defaultDuration
   */
  const showInfo = (message: string, duration?: number): void => {
    showAlert(message, 'info', duration)
  }

  return {
    alert,
    showAlert,
    hideAlert,
    showSuccess,
    showError,
    showWarning,
    showInfo,
  }
}
