/**
 * 设置管理 composable
 *
 * 封装设置管理逻辑，协调 SettingsService 和 WallpaperStore
 * 提供设置加载、更新、重置功能，自动显示错误/成功提示
 *
 * @example
 * ```typescript
 * const { settings, load, update, reset, getDefaults } = useSettings()
 *
 * // 加载设置
 * await load()
 *
 * // 更新设置
 * await update({ apiKey: 'new-key' })
 *
 * // 重置设置
 * await reset()
 * ```
 */

import { computed, type ComputedRef } from 'vue'
import { useWallpaperStore } from '@/stores/wallpaper'
import { settingsService } from '@/services'
import { useAlert } from '@/composables'
import type { AppSettings } from '@/types'

/**
 * useSettings 返回值接口
 */
export interface UseSettingsReturn {
  // 状态（ComputedRef）
  settings: ComputedRef<AppSettings>

  // 方法
  load: () => Promise<boolean>
  update: (partial: Partial<AppSettings>) => Promise<boolean>
  reset: () => Promise<boolean>
  getDefaults: () => AppSettings
}

/**
 * 设置管理 composable
 *
 * @returns 设置状态和操作方法
 */
export function useSettings(): UseSettingsReturn {
  const store = useWallpaperStore()
  const { showError, showSuccess } = useAlert()

  /**
   * 加载设置
   * 从 SettingsService 获取设置并更新 Store
   * @returns 是否成功加载
   */
  const load = async (): Promise<boolean> => {
    const result = await settingsService.get()

    if (result.success && result.data) {
      Object.assign(store.settings, result.data)
      return true
    }

    // 加载失败，使用默认值
    Object.assign(store.settings, settingsService.getDefaults())
    return false
  }

  /**
   * 更新设置
   * 先更新本地状态，再持久化
   * @param partial - 部分设置对象
   * @returns 是否成功更新
   */
  const update = async (partial: Partial<AppSettings>): Promise<boolean> => {
    // 先更新本地状态
    Object.assign(store.settings, partial)

    // 再持久化
    const result = await settingsService.update(partial)

    if (!result.success) {
      showError('保存设置失败')
      return false
    }

    return true
  }

  /**
   * 重置设置为默认值
   * @returns 是否成功重置
   */
  const reset = async (): Promise<boolean> => {
    const defaults = settingsService.getDefaults()
    Object.assign(store.settings, defaults)

    const result = await settingsService.reset()

    if (!result.success) {
      showError('重置设置失败')
      return false
    }

    showSuccess('已恢复默认设置')
    return true
  }

  /**
   * 获取默认设置
   * @returns 默认设置对象的副本
   */
  const getDefaults = (): AppSettings => {
    return settingsService.getDefaults()
  }

  return {
    settings: computed(() => store.settings),
    load,
    update,
    reset,
    getDefaults,
  }
}
