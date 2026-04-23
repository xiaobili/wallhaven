// Electron Store 封装工具
// 提供统一的存储操作接口，替代 localStorage

/**
 * 从 electron-store 获取数据
 */
export async function storeGet<T = any>(key: string): Promise<T | null> {
  try {
    if (typeof window === 'undefined' || !window.electronAPI) {
      console.warn('[Store] electronAPI not available, returning null')
      return null
    }
    
    const result = await window.electronAPI.storeGet(key)
    
    if (result.success) {
      return result.value as T
    } else {
      console.error(`[Store] Failed to get key "${key}":`, result.error)
      return null
    }
  } catch (error) {
    console.error(`[Store] Error getting key "${key}":`, error)
    return null
  }
}

/**
 * 向 electron-store 保存数据
 */
export async function storeSet(key: string, value: any): Promise<boolean> {
  try {
    if (typeof window === 'undefined' || !window.electronAPI) {
      console.warn('[Store] electronAPI not available')
      return false
    }
    
    // 深度克隆对象，移除 Vue reactive proxy，避免 IPC 克隆错误
    const plainValue = JSON.parse(JSON.stringify(value))
    
    const result = await window.electronAPI.storeSet({ key, value: plainValue })
    
    if (result.success) {
      return true
    } else {
      console.error(`[Store] Failed to set key "${key}":`, result.error)
      return false
    }
  } catch (error) {
    console.error(`[Store] Error setting key "${key}":`, error)
    return false
  }
}

/**
 * 从 electron-store 删除数据
 */
export async function storeDelete(key: string): Promise<boolean> {
  try {
    if (typeof window === 'undefined' || !window.electronAPI) {
      console.warn('[Store] electronAPI not available')
      return false
    }
    
    const result = await window.electronAPI.storeDelete(key)
    
    if (result.success) {
      return true
    } else {
      console.error(`[Store] Failed to delete key "${key}":`, result.error)
      return false
    }
  } catch (error) {
    console.error(`[Store] Error deleting key "${key}":`, error)
    return false
  }
}

/**
 * 清空 electron-store 所有数据
 */
export async function storeClear(): Promise<boolean> {
  try {
    if (typeof window === 'undefined' || !window.electronAPI) {
      console.warn('[Store] electronAPI not available')
      return false
    }
    
    const result = await window.electronAPI.storeClear()
    
    if (result.success) {
      return true
    } else {
      console.error('[Store] Failed to clear store:', result.error)
      return false
    }
  } catch (error) {
    console.error('[Store] Error clearing store:', error)
    return false
  }
}
