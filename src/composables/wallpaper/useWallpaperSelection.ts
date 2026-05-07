/**
 * 壁纸选择管理 composable
 *
 * 封装壁纸多选、全选、批量下载等逻辑
 */

import { ref, computed, type ComputedRef, type Ref } from 'vue'
import type { WallpaperItem, TotalPageData } from '@/types'
import { useDownload } from '../download/useDownload'

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
 * 选择操作选项
 */
export interface SelectionOptions {
  /** 成功提示函数（可选，由调用者提供以使用正确的 Alert 实例） */
  showSuccess?: (message: string) => void
  /** 错误提示函数 */
  showError?: (message: string) => void
  /** 警告提示函数 */
  showWarning?: (message: string) => void
}

/**
 * 选择操作
 */
export interface SelectionActions {
  /** 切换单个壁纸选择状态 */
  toggle: (item: WallpaperItem) => void
  /** 全选/取消全选某个分区的壁纸 */
  selectAll: (payload: { ids: string[]; items: WallpaperItem[]; selected: boolean }) => void
  /** 清空选择 */
  clear: () => void
  /** 批量下载选中的壁纸 */
  downloadSelected: () => Promise<void>
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
 * @param options 可选的提示函数（传入以使用正确的 Alert 实例）
 *
 * @example
 * ```typescript
 * const { showSuccess, showError, showWarning } = useAlert()
 * const selection = useWallpaperSelection({ showSuccess, showError, showWarning })
 *
 * // 切换选择
 * selection.toggle('wallpaper-123')
 *
 * // 批量下载
 * await selection.downloadSelected(wallpapers)
 * ```
 */
export function useWallpaperSelection(options?: SelectionOptions): UseWallpaperSelectionReturn {
  const { addTask, startDownload } = useDownload()

  // 使用传入的提示函数，或创建默认的（仅 console.log）
  const showSuccess = options?.showSuccess ?? ((msg: string) => console.log('[Success]', msg))
  const showError = options?.showError ?? ((msg: string) => console.error('[Error]', msg))
  const showWarning = options?.showWarning ?? ((msg: string) => console.warn('[Warning]', msg))

  // 状态
  const selectedIds = ref<string[]>([])
  const downloading = ref<boolean>(false)
  /** 选中壁纸的完整数据映射，跨页面保留 */
  const selectedItemsMap = new Map<string, WallpaperItem>()

  // 计算属性
  const selectedCount = computed(() => selectedIds.value.length)

  /**
   * 切换壁纸选择状态（存储完整壁纸数据，跨页面保留）
   */
  function toggle(item: WallpaperItem): void {
    const index = selectedIds.value.indexOf(item.id)
    if (index > -1) {
      selectedIds.value.splice(index, 1)
      selectedItemsMap.delete(item.id)
    } else {
      selectedIds.value.push(item.id)
      selectedItemsMap.set(item.id, item)
    }
  }

  /**
   * 全选/取消全选（存储完整壁纸数据，跨页面保留）
   */
  function selectAll(payload: { ids: string[]; items: WallpaperItem[]; selected: boolean }): void {
    if (payload.selected) {
      // 添加所有未选中的 ID 并存储完整数据
      payload.ids.forEach((id, i) => {
        if (!selectedIds.value.includes(id)) {
          selectedIds.value.push(id)
          const item = payload.items[i]
          if (item) {
            selectedItemsMap.set(id, item)
          }
        }
      })
    } else {
      // 移除该分区的所有 ID 及其数据
      for (const id of payload.ids) {
        selectedItemsMap.delete(id)
      }
      selectedIds.value = selectedIds.value.filter((id) => !payload.ids.includes(id))
    }
  }

  /**
   * 清空选择
   */
  function clear(): void {
    selectedIds.value = []
    selectedItemsMap.clear()
  }

  /**
   * 检查是否已选中
   */
  function isSelected(wallpaperId: string): boolean {
    return selectedIds.value.includes(wallpaperId)
  }

  /**
   * 批量下载选中的壁纸（从已存储的选中数据中读取，不依赖当前页面数据）
   */
  async function downloadSelected(): Promise<void> {
    if (selectedIds.value.length === 0) {
      showWarning('请先选择要下载的壁纸')
      return
    }

    downloading.value = true

    try {
      // 从存储的选中壁纸数据映射中获取，跨页面保留
      const selectedItems = selectedIds.value
        .map((id) => selectedItemsMap.get(id))
        .filter((item): item is WallpaperItem => item !== undefined)

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
