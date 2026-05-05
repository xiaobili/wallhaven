/**
 * 壁纸下载管理 composable
 *
 * 封装单个壁纸下载逻辑，提供更高级的 API
 */

import { type Ref } from 'vue'
import type { WallpaperItem } from '@/types'
import { useDownload } from '../download/useDownload'
import { useAlert } from '../core/useAlert'

/**
 * useWallpaperDownload 返回值
 */
export interface UseWallpaperDownloadReturn {
  /**
   * 下载单个壁纸
   * @param item 壁纸信息
   * @throws 如果壁纸已在下载队列中
   */
  download: (item: WallpaperItem) => Promise<void>

  /**
   * 检查壁纸是否正在下载
   */
  isDownloading: (wallpaperId: string) => boolean
}

/**
 * 生成壁纸文件名
 */
function generateFilename(item: WallpaperItem): string {
  let ext = '.jpg'
  if (item.path) {
    const match = item.path.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/i)
    if (match) {
      ext = match[0]
    }
  }
  return `wallhaven-${item.id}${ext}`
}

/**
 * 壁纸下载管理 composable
 *
 * @example
 * ```typescript
 * const { download, isDownloading } = useWallpaperDownload()
 *
 * // 下载壁纸
 * await download(wallpaper)
 * ```
 */
export function useWallpaperDownload(): UseWallpaperDownloadReturn {
  const { addTask, startDownload, isDownloading: checkIsDownloading } = useDownload()
  const { showSuccess, showError } = useAlert()

  /**
   * 下载单个壁纸
   */
  async function download(item: WallpaperItem): Promise<void> {
    // 检查是否已在下载队列中
    if (checkIsDownloading(item.id)) {
      throw new Error('该壁纸已在下载队列中')
    }

    // 生成文件名
    const filename = generateFilename(item)

    // 创建下载任务
    const taskId = addTask({
      url: item.path,
      filename,
      small: item.thumbs.small,
      resolution: item.resolution,
      size: Number(item.file_size) || 0,
      wallpaperId: item.id,
    })

    // 自动开始下载
    await startDownload(taskId)

    console.log('[useWallpaperDownload] 已添加下载任务:', taskId)
  }

  /**
   * 检查壁纸是否正在下载
   */
  function isDownloading(wallpaperId: string): boolean {
    return checkIsDownloading(wallpaperId)
  }

  return {
    download,
    isDownloading,
  }
}
