/**
 * 收藏夹管理 Composable
 * 封装收藏夹状态管理逻辑
 */

import { computed, ref, type ComputedRef } from 'vue'
import { collectionsService } from '@/services'
import { useAlert } from '@/composables'
import type { Collection } from '@/types'

/**
 * useCollections 返回值接口
 */
export interface UseCollectionsReturn {
  collections: ComputedRef<Collection[]>
  loading: ComputedRef<boolean>
  error: ComputedRef<string | null>
  load: () => Promise<void>
  create: (name: string) => Promise<boolean>
  rename: (id: string, name: string) => Promise<boolean>
  delete: (id: string) => Promise<boolean>
  getById: (id: string) => Collection | undefined
  getDefault: () => Collection | undefined
  setDefault: (id: string) => Promise<boolean>
}

export function useCollections(): UseCollectionsReturn {
  const { showError, showSuccess } = useAlert()
  const collections = ref<Collection[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

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

  const create = async (name: string): Promise<boolean> => {
    const result = await collectionsService.create(name)
    if (result.success) {
      await load()
      showSuccess(`收藏夹 "${name}" 创建成功`)
      return true
    }
    showError(result.error?.message || '创建收藏夹失败')
    return false
  }

  const rename = async (id: string, name: string): Promise<boolean> => {
    const result = await collectionsService.rename(id, name)
    if (result.success) {
      await load()
      showSuccess('收藏夹重命名成功')
      return true
    }
    showError(result.error?.message || '重命名收藏夹失败')
    return false
  }

  const deleteCollection = async (id: string): Promise<boolean> => {
    const result = await collectionsService.delete(id)
    if (result.success) {
      await load()
      showSuccess('收藏夹删除成功')
      return true
    }
    showError(result.error?.message || '删除收藏夹失败')
    return false
  }

  const getById = (id: string): Collection | undefined => collections.value.find(c => c.id === id)
  const getDefault = (): Collection | undefined => collections.value.find(c => c.isDefault)

  const setDefault = async (id: string): Promise<boolean> => {
    const result = await collectionsService.setDefault(id)
    if (result.success) {
      await load()
      showSuccess('已设为默认收藏夹')
      return true
    }
    showError(result.error?.message || '设置默认收藏夹失败')
    return false
  }

  return {
    collections: computed(() => collections.value),
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    load, create, rename, delete: deleteCollection, getById, getDefault, setDefault,
  }
}
