/**
 * 收藏下拉菜单管理 composable
 *
 * 封装收藏夹下拉菜单的显示、隐藏、定位逻辑
 */

import { ref, type Ref } from 'vue'
import type { WallpaperItem } from '@/types'

/**
 * 下拉菜单位置
 */
export interface DropdownPosition {
  x: number
  y: number
}

/**
 * 下拉菜单状态
 */
export interface DropdownState {
  /** 是否显示下拉菜单 */
  visible: Ref<boolean>
  /** 下拉菜单位置 */
  position: Ref<DropdownPosition>
  /** 当前操作的壁纸 */
  wallpaper: Ref<WallpaperItem | null>
}

/**
 * 下拉菜单操作
 */
export interface DropdownActions {
  /** 显示下拉菜单 */
  show: (item: WallpaperItem, event: MouseEvent) => void
  /** 关闭下拉菜单 */
  close: () => void
  /** 处理点击外部事件 */
  handleClickOutside: (event: MouseEvent) => void
}

/**
 * useFavoriteDropdown 返回值
 */
export interface UseFavoriteDropdownReturn extends DropdownState, DropdownActions {}

/**
 * 收藏下拉菜单管理 composable
 *
 * @example
 * ```typescript
 * const dropdown = useFavoriteDropdown()
 *
 * // 显示下拉菜单
 * dropdown.show(wallpaper, event)
 *
 * // 模板中使用
 * <CollectionDropdown
 *   :visible="dropdown.visible.value"
 *   :position="dropdown.position.value"
 *   :wallpaper-data="dropdown.wallpaper.value"
 *   @close="dropdown.close"
 * />
 * ```
 */
export function useFavoriteDropdown(): UseFavoriteDropdownReturn {
  // 状态
  const visible = ref<boolean>(false)
  const position = ref<DropdownPosition>({ x: 0, y: 0 })
  const wallpaper = ref<WallpaperItem | null>(null)

  /**
   * 显示下拉菜单
   */
  function show(item: WallpaperItem, event: MouseEvent): void {
    // 如果点击同一张图片，关闭下拉菜单
    if (visible.value && wallpaper.value?.id === item.id) {
      close()
      return
    }

    // 如果已经显示其他壁纸的下拉菜单，先关闭再打开
    if (visible.value) {
      visible.value = false
      // 使用 requestAnimationFrame 确保动画流畅
      requestAnimationFrame(() => {
        openDropdown(item, event)
      })
    } else {
      // 首次打开
      openDropdown(item, event)
    }
  }

  /**
   * 打开下拉菜单（内部方法）
   */
  function openDropdown(item: WallpaperItem, event: MouseEvent): void {
    wallpaper.value = item
    const rect = (event.target as HTMLElement).getBoundingClientRect()
    position.value = {
      x: rect.left,
      y: rect.bottom + 4,
    }

    // 延迟设置 visible，让 Transition 组件检测到变化
    requestAnimationFrame(() => {
      visible.value = true
    })
  }

  /**
   * 关闭下拉菜单
   */
  function close(): void {
    visible.value = false
  }

  /**
   * 处理点击外部事件
   */
  function handleClickOutside(event: MouseEvent): void {
    if (!visible.value) return

    const target = event.target as HTMLElement
    // 检查是否点击在下拉菜单或收藏按钮外部
    if (!target.closest('.collection-dropdown') && !target.closest('.thumb-favorite-btn')) {
      close()
    }
  }

  return {
    // 状态
    visible,
    position,
    wallpaper,

    // 方法
    show,
    close,
    handleClickOutside,
  }
}
