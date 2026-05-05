/**
 * 壁纸选择管理 composable
 *
 * 封装壁纸多选、全选、批量下载等逻辑
 */

import { ref, computed, type ComputedRef, type Ref } from 'vue'
import type { WallpaperItem, TotalPageData } from '@/types'
import { useDownload } from '../download/useDownload'
import { useAlert } from '../core/useAlert'

/**
 * 选择状态
 */
export interface SelectionState {
  /** 已选中的壁纸 ID 列表 */
  selectedIds: Ref<string[]>
  /** 是否正在批量下载 */
  downloading: Ref<boolean>
  /** 已选中的数量 */
  selectedCount: ComputedRef<number>
}

/**
 * 选择操作
 */
export interface SelectionActions {
  /** 切换单个壁纸选择状态 */
  toggle: (wallpaperId: string) => void
  /** 全选/取消全选某个分区的壁纸 */
  selectAll: (payload: { ids: string[]; selected: boolean }) => void
  /** 清空选择 */
  clear: () => void
  /** 批量下载选中的壁纸 */
  downloadSelected: (wallpapers: TotalPageData) => Promise<void>
  /** 检查壁纸是否已选中 */
  isSelected: (wallpaperId: string) => boolean
}

/**
 * useWallpaperSelection 返回值
 */
export interface UseWallpaperSelectionReturn extends SelectionState, SelectionActions {}

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
 * 从 TotalPageData 中获取所有壁纸的扁平列表
 */
export function flattenWallpapers(data: TotalPageData): WallpaperItem[] {
  const allWallpapers: WallpaperItem[] = []
  data.sections.forEach((section) => {
    allWallpapers.push(...section.data)
  })
  return allWallpapers
}

/**
 * 壁纸选择管理 composable
 *
 * @example
 * ```typescript
 * const selection = useWallpaperSelection()
 *
 * // 切换选择
 * selection.toggle('wallpaper-123')
 *
 * // 批量下载
 * await selection.downloadSelected(wallpapers)
 * ```
 */
export function useWallpaperSelection(): UseWallpaperSelectionReturn {
  const { addTask, startDownload } = useDownload()
  const { showSuccess, showError, showWarning } = useAlert()

  // 状态
  const selectedIds = ref<string[]>([])
  const downloading = ref<boolean>(false)

  // 计算属性
  const selectedCount = computed(() => selectedIds.value.length)

  /**
   * 切换壁纸选择状态
   */
  function toggle(wallpaperId: string): void {
    const index = selectedIds.value.indexOf(wallpaperId)
    if (index > -1) {
      selectedIds.value.splice(index, 1)
    } else {
      selectedIds.value.push(wallpaperId)
    }
  }

  /**
   * 全选/取消全选
   */
  function selectAll(payload: { ids: string[]; selected: boolean }): void {
    if (payload.selected) {
      // 添加所有未选中的 ID
      for (const id of payload.ids) {
        if (!selectedIds.value.includes(id)) {
          selectedIds.value.push(id)
        }
      }
    } else {
      // 移除该分区的所有 ID
      selectedIds.value = selectedIds.value.filter((id) => !payload.ids.includes(id))
    }
  }

  /**
   * 清空选择
   */
  function clear(): void {
    selectedIds.value = []
  }

  /**
   * 检查是否已选中
   */
  function isSelected(wallpaperId: string): boolean {
    return selectedIds.value.includes(wallpaperId)
  }

  /**
   * 批量下载选中的壁纸
   */
  async function downloadSelected(wallpapers: TotalPageData): Promise<void> {
    if (selectedIds.value.length === 0) {
      showWarning('请先选择要下载的壁纸')
      return
    }

    downloading.value = true

    try {
      // 获取所有壁纸的扁平列表
      const allWallpapers = flattenWallpapers(wallpapers)

      // 筛选选中的壁纸
      const selectedItems = allWallpapers.filter((wp) => selectedIds.value.includes(wp.id))

      if (selectedItems.length === 0) {
        showError('未找到选中的壁纸信息')
        return
      }

      // 批量添加到下载队列并启动下载
      for (const item of selectedItems) {
        const taskId = addTask({
          url: item.path,
          filename: generateFilename(item),
          small: item.thumbs.small,
          resolution: item.resolution,
          size: item.file_size,
          wallpaperId: item.id,
        })
        await startDownload(taskId)
      }

      showSuccess(`已添加 ${selectedItems.length} 个下载任务到下载中心`)

      // 清空选择
      clear()
    } catch (error: any) {
      console.error('批量下载失败:', error)
      showError('批量下载失败: ' + error.message)
    } finally {
      downloading.value = false
    }
  }

  return {
    // 状态
    selectedIds,
    downloading,
    selectedCount,

    // 方法
    toggle,
    selectAll,
    clear,
    downloadSelected,
    isSelected,
  }
}
