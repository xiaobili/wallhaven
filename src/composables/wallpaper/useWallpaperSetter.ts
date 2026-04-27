/**
 * 壁纸设置 Composable
 *
 * 封装壁纸设置逻辑，协调 WallpaperService
 * 提供设置壁纸功能，自动显示错误/成功提示
 *
 * @example
 * ```typescript
 * const { setWallpaper, loading } = useWallpaperSetter()
 *
 * // 设置壁纸
 * const success = await setWallpaper('/path/to/image.jpg')
 * if (success) {
 *   console.log('壁纸设置成功')
 * }
 * ```
 */

import { ref, type Ref } from 'vue'
import { wallpaperService } from '@/services'
import { useAlert } from '@/composables'

/**
 * useWallpaperSetter 返回值接口
 */
export interface UseWallpaperSetterReturn {
  /** 是否正在设置 */
  loading: Ref<boolean>
  /** 设置壁纸 */
  setWallpaper: (imagePath: string) => Promise<boolean>
}

/**
 * 壁纸设置 Composable
 *
 * @returns 设置状态和操作方法
 */
export function useWallpaperSetter(): UseWallpaperSetterReturn {
  const { showError, showSuccess } = useAlert()
  const loading = ref(false)

  /**
   * 设置桌面壁纸
   * @param imagePath - 图片文件路径
   * @returns 是否设置成功
   */
  const setWallpaper = async (imagePath: string): Promise<boolean> => {
    loading.value = true

    try {
      const result = await wallpaperService.setWallpaper(imagePath)

      if (!result.success) {
        showError(result.error?.message || '设置壁纸失败')
        return false
      }

      showSuccess('壁纸设置成功')
      return true
    } catch (error) {
      showError(error instanceof Error ? error.message : '设置壁纸失败')
      return false
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    setWallpaper,
  }
}
