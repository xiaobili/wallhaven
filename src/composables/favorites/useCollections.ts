/**
 * 收藏夹管理 Composable
 *
 * 封装收藏夹管理逻辑，协调 CollectionsService
 * 提供收藏夹加载、创建、重命名、删除功能
 *
 * @example
 * ```typescript
 * const { collections, load, create, rename, delete, getById, getDefault } = useCollections()
 *
 * // 加载收藏夹列表
 * await load()
 *
 * // 创建新收藏夹
 * const success = await create('动漫')
 *
 * // 获取默认收藏夹
 * const defaultCollection = getDefault()
 * ```
 */

import { computed, ref, type ComputedRef } from 'vue'
import { collectionsService } from '@/services'
import { useAlert } from '@/composables'
import type { Collection } from '@/types'

/**
 * useCollections 返回值接口
 */
export interface UseCollectionsReturn {
  // 状态（ComputedRef）
  collections: ComputedRef<Collection[]>
  loading: ComputedRef<boolean>
  error: ComputedRef<string | null>

  // 方法
  load: () => Promise<void>
  create: (name: string) => Promise<boolean>
  rename: (id: string, name: string) => Promise<boolean>
  delete: (id: string) => Promise<boolean>
  getById: (id: string) => Collection | undefined
  getDefault: () => Collection | undefined
}

/**
 * 收藏夹管理 Composable
 *
 * 提供收藏夹的 CRUD 操作，自动管理加载状态和错误提示
 * @returns 收藏夹状态和操作方法
 */
export function useCollections(): UseCollectionsReturn {
  // 内部状态
  const collections = ref<Collection[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const { showError } = useAlert()

  /**
   * 加载收藏夹列表
   */
  const load = async (): Promise<void> => {
    loading.value = true
    error.value = null

    const result = await collectionsService.getAll()

    if (result.success && result.data) {
      collections.value = result.data
    } else {
      error.value = result.error?.message || '加载收藏夹失败'
      showError(error.value)
    }

    loading.value = false
  }

  /**
   * 创建收藏夹
   * @param name - 收藏夹名称
   * @returns 是否创建成功
   */
  const create = async (name: string): Promise<boolean> => {
    const result = await collectionsService.create(name)

    if (result.success) {
      await load()
      return true
    }

    showError(result.error?.message || '创建收藏夹失败')
    return false
  }

  /**
   * 重命名收藏夹
   * @param id - 收藏夹 ID
   * @param name - 新名称
   * @returns 是否重命名成功
   */
  const rename = async (id: string, name: string): Promise<boolean> => {
    const result = await collectionsService.rename(id, name)

    if (result.success) {
      await load()
      return true
    }

    showError(result.error?.message || '重命名收藏夹失败')
    return false
  }

  /**
   * 删除收藏夹
   * @param id - 收藏夹 ID
   * @returns 是否删除成功
   */
  const deleteCollection = async (id: string): Promise<boolean> => {
    const result = await collectionsService.delete(id)

    if (result.success) {
      await load()
      return true
    }

    showError(result.error?.message || '删除收藏夹失败')
    return false
  }

  /**
   * 根据 ID 获取收藏夹
   * @param id - 收藏夹 ID
   * @returns 收藏夹对象或 undefined
   */
  const getById = (id: string): Collection | undefined => {
    return collections.value.find(c => c.id === id)
  }

  /**
   * 获取默认收藏夹
   * @returns 默认收藏夹对象或 undefined
   */
  const getDefault = (): Collection | undefined => {
    return collections.value.find(c => c.isDefault)
  }

  return {
    // 状态
    collections: computed(() => collections.value),
    loading: computed(() => loading.value),
    error: computed(() => error.value),

    // 方法
    load,
    create,
    rename,
    delete: deleteCollection,
    getById,
    getDefault,
  }
}
