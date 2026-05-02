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
import { useAlert, useSettings } from '@/composables'
import type { WallpaperItem } from '@/types'

/**
 * 下载结果接口
 */
export interface DownloadResult {
  success: boolean
  filePath: string | null
  error: string | null
}

/**
 * useWallpaperSetter 返回值接口
 */
export interface UseWallpaperSetterReturn {
  /** 是否正在设置 */
  loading: Ref<boolean>
  /** 设置壁纸 */
  setWallpaper: (imagePath: string) => Promise<boolean>
  /** 下载壁纸文件 */
  downloadWallpaperFile: (imgItem: WallpaperItem) => Promise<DownloadResult>
  /** 从 URL 设置壁纸（下载后设置） */
  setBgFromUrl: (imgItem: WallpaperItem) => Promise<void>
}

/**
 * 壁纸设置 Composable
 *
 * @returns 设置状态和操作方法
 */
export function useWallpaperSetter(): UseWallpaperSetterReturn {
  const { showError, showSuccess } = useAlert()
  const loading = ref(false)
  const { settings, selectFolder, update: updateSettings } = useSettings()

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

  /**
   * 下载壁纸文件
   * @param imgItem - 壁纸项
   * @returns 下载结果
   */
  const downloadWallpaperFile = async (imgItem: WallpaperItem): Promise<DownloadResult> => {
    // 读取下载目录
    let downloadPath = settings.value.downloadPath

    // 如果没有设置下载目录，让用户选择
    if (!downloadPath) {
      const selectResult = await selectFolder()
      if (!selectResult.success || !selectResult.data) {
        return { success: false, filePath: null, error: '未选择下载目录' }
      }
      downloadPath = selectResult.data
      await updateSettings({ downloadPath: selectResult.data })
    }

    // 提取文件扩展名
    const extMatch = imgItem.path.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/i)
    const ext = extMatch?.[0] || '.jpg'
    const filename = `wallhaven-${imgItem.id}${ext}`

    // 动态导入 electronClient（避免 vitest 环境报错）
    const { electronClient } = await import('@/clients')
    const result = await electronClient.downloadWallpaper({
      url: imgItem.path,
      filename,
      saveDir: downloadPath,
    })

    return {
      success: result.success,
      filePath: result.data || null,
      error: result.error?.message || null,
    }
  }

  /**
   * 从 URL 设置壁纸（下载后自动设置）
   * @param imgItem - 壁纸项
   */
  const setBgFromUrl = async (imgItem: WallpaperItem): Promise<void> => {
    try {
      const downloadResult = await downloadWallpaperFile(imgItem)

      if (!downloadResult.success || !downloadResult.filePath) {
        showError('下载壁纸失败: ' + (downloadResult.error || '未知错误'))
        return
      }

      await setWallpaper(downloadResult.filePath)
    } catch (error) {
      console.error('设置壁纸错误:', error)
      showError('设置壁纸失败: ' + (error instanceof Error ? error.message : '未知错误'))
    }
  }

  return {
    loading,
    setWallpaper,
    downloadWallpaperFile,
    setBgFromUrl,
  }
}
