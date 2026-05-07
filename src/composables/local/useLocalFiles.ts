/**
 * 本地文件操作 Composable
 *
 * 封装本地文件操作逻辑，协调 SettingsService
 * 提供读取目录、打开文件夹、删除文件功能
 *
 * @example
 * ```typescript
 * const { readDirectory, openFolder, deleteFile } = useLocalFiles()
 *
 * // 读取目录
 * const result = await readDirectory('/path/to/folder')
 * if (result.success) {
 *   console.log('文件列表:', result.data)
 * }
 *
 * // 打开文件夹
 * await openFolder('/path/to/folder')
 *
 * // 删除文件
 * await deleteFile('/path/to/file.jpg')
 * ```
 */

import { ref, computed } from 'vue'
import { useAlert } from '@/composables'
import { settingsService } from '@/services'
import type { IpcResponse, LocalFile } from '@/types/ipc'
import type { LocalWallpaper } from '@/components/LocalWallpaperMain.vue'

/**
 * useLocalFiles 返回值接口
 */
export interface UseLocalFilesReturn {
  /** 读取目录内容 */
  readDirectory: (dirPath: string, page?: number, pageSize?: number) => Promise<IpcResponse<LocalFile[]>>
  /** 在系统文件管理器中打开文件夹 */
  openFolder: (folderPath: string) => Promise<IpcResponse<void>>
  /** 删除文件 */
  deleteFile: (filePath: string) => Promise<IpcResponse<void>>
  /** 当前页码（从 1 开始） */
  currentPage: import('vue').Ref<number>
  /** 总页数 */
  totalPages: import('vue').ComputedRef<number>
  /** 每页数量 */
  pageSize: import('vue').Ref<number>
  /** 文件总数 */
  total: import('vue').Ref<number>
  /** 跳转到指定页面（支持缓存） */
  goToPage: (dirPath: string, page: number) => Promise<LocalWallpaper[]>
  /** 清除页面缓存 */
  clearCache: () => void
  /** 当前页的壁纸列表（给 preview 导航使用，限制在当前页） */
  localWallpapers: import('vue').Ref<LocalWallpaper[]>
}

/**
 * 本地文件操作 Composable
 *
 * @returns 文件操作方法
 */
export function useLocalFiles(): UseLocalFilesReturn {
  const { showError } = useAlert()

  // 分页状态
  const currentPage = ref(1)
  const pageSize = ref(50)
  const total = ref(0)
  const totalPages = computed(() => Math.ceil(total.value / pageSize.value) || 1)

  // 页面缓存
  /** 页面缓存: Map<页码, LocalWallpaper[]> */
  const pageCache = new Map<number, LocalWallpaper[]>()
  const localWallpapers = ref<LocalWallpaper[]>([])

  /**
   * 清除页面缓存
   */
  const clearCache = (): void => {
    pageCache.clear()
    localWallpapers.value = []
    currentPage.value = 1
  }

  /**
   * 跳转到指定页面（支持缓存）
   * @param dirPath - 目录路径
   * @param page - 页码（从 1 开始）
   * @returns 当前页壁纸列表
   */
  const goToPage = async (dirPath: string, page: number): Promise<LocalWallpaper[]> => {
    // 缓存命中：直接返回缓存数据
    if (pageCache.has(page)) {
      currentPage.value = page
      localWallpapers.value = pageCache.get(page)!
      return localWallpapers.value
    }

    // 缓存未命中：调用 readDirectory 获取数据
    const result = await readDirectory(dirPath, page, pageSize.value)

    if (!result.success || !result.data) {
      localWallpapers.value = []
      return []
    }

    // 映射 LocalFile[] 到 LocalWallpaper[]
    const mapped: LocalWallpaper[] = result.data.map((file) => ({
      name: file.name,
      path: file.path,
      thumbnailPath: file.thumbnailPath || '',
      size: file.size,
      modifiedTime: new Date(file.modifiedAt).toISOString(),
      width: file.width,
      height: file.height,
    }))

    // 存入缓存
    pageCache.set(page, mapped)
    localWallpapers.value = mapped

    return mapped
  }

  /**
   * 读取目录内容
   * @param dirPath - 目录路径
   * @param page - 页码（从 1 开始，可选）
   * @param pageSizeParam - 每页数量（可选，默认 50）
   * @returns 文件列表
   */
  const readDirectory = async (dirPath: string, page?: number, pageSizeParam?: number): Promise<IpcResponse<LocalFile[]>> => {
    const result = await settingsService.readDirectory(dirPath, page, pageSizeParam)

    if (!result.success) {
      showError(result.error?.message || '读取目录失败')
    }

    // 更新分页状态
    if (result.pagination) {
      currentPage.value = result.pagination.page
      pageSize.value = result.pagination.pageSize
      total.value = result.pagination.total
      // totalPages 是 computed，自动更新
    }

    return result
  }

  /**
   * 在系统文件管理器中打开文件夹
   * @param folderPath - 文件夹路径
   */
  const openFolder = async (folderPath: string): Promise<IpcResponse<void>> => {
    const result = await settingsService.openFolder(folderPath)

    if (!result.success) {
      showError(result.error?.message || '打开文件夹失败')
    }

    return result
  }

  /**
   * 删除文件
   * @param filePath - 文件路径
   */
  const deleteFile = async (filePath: string): Promise<IpcResponse<void>> => {
    const result = await settingsService.deleteFile(filePath)

    if (!result.success) {
      showError(result.error?.message || '删除文件失败')
    }

    return result
  }

  return {
    readDirectory,
    openFolder,
    deleteFile,
    currentPage,
    totalPages,
    pageSize,
    total,
    goToPage,
    clearCache,
    localWallpapers,
  }
}
