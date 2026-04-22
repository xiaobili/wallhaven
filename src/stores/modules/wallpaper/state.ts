// Wallhaven 壁纸状态定义

import { ref, reactive } from 'vue'
import type { TotalPageData, GetParams, CustomParams } from '@/types'

/**
 * 创建壁纸状态的初始值
 */
export function createInitialState() {
  const totalPageData = reactive<TotalPageData>({
    totalPage: 0,
    currentPage: 0,
    sections: [],
  })

  const loading = ref<boolean>(false)
  const error = ref<boolean>(false)
  const queryParams = ref<GetParams | null>(null)
  const savedParams = ref<CustomParams | null>(null)

  return {
    totalPageData,
    loading,
    error,
    queryParams,
    savedParams,
  }
}
