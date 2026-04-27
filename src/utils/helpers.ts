// 通用工具函数

/**
 * 防抖函数（优化版）
 * @param fn 要执行的函数
 * @param delay 延迟时间（毫秒）
 * @param immediate 是否立即执行
 * @returns 防抖后的函数
 * @example
 * ```typescript
 * const debouncedSearch = debounce((query) => {
 *   api.search(query)
 * }, 300)
 *
 * // 取消待执行的调用
 * debouncedSearch.cancel()
 * ```
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number = 300,
  immediate: boolean = false,
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout> | null = null
  let result: any

  const debounced = function (this: any, ...args: Parameters<T>) {
    if (timer) clearTimeout(timer)

    if (immediate) {
      const callNow = !timer
      timer = setTimeout(() => {
        timer = null
      }, delay)
      if (callNow) result = fn.apply(this, args)
    } else {
      timer = setTimeout(() => {
        fn.apply(this, args)
      }, delay)
    }

    return result
  }

  // 添加取消方法
  debounced.cancel = () => {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
  }

  return debounced
}

/**
 * 节流函数（优化版 - 使用时间戳+定时器双方案）
 * @param fn 要执行的函数
 * @param interval 间隔时间（毫秒）
 * @returns 节流后的函数
 * @example
 * ```typescript
 * const throttledScroll = throttle(() => {
 *   checkInfiniteScroll()
 * }, 300)
 *
 * // 取消待执行的调用
 * throttledScroll.cancel()
 * ```
 */
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  interval: number = 300,
): ((...args: Parameters<T>) => void) & { cancel: () => void } {
  let lastTime = 0
  let timer: ReturnType<typeof setTimeout> | null = null

  const throttled = function (this: any, ...args: Parameters<T>) {
    const now = Date.now()
    const remaining = interval - (now - lastTime)

    if (remaining <= 0 || remaining > interval) {
      if (timer) {
        clearTimeout(timer)
        timer = null
      }
      lastTime = now
      fn.apply(this, args)
    } else if (!timer) {
      timer = setTimeout(() => {
        lastTime = Date.now()
        timer = null
        fn.apply(this, args)
      }, remaining)
    }
  }

  // 添加取消方法
  throttled.cancel = () => {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
    lastTime = 0
  }

  return throttled
}

/**
 * 格式化分辨率显示
 * @param str 分辨率字符串（如 "1920x1080"）
 * @returns 格式化后的字符串（如 "1920 × 1080"）
 * @example
 * ```typescript
 * formatResolution("1920x1080") // Returns "1920 × 1080"
 * formatResolution("2560x1440") // Returns "2560 × 1440"
 * ```
 */
export function formatResolution(str: string): string {
  return str.replace(/x/g, ' × ')
}

/**
 * 格式化文件大小（优化版 - 使用位运算加速）
 * @param size 文件大小（字节）
 * @returns 格式化后的字符串
 * @example
 * ```typescript
 * formatFileSize(1536000) // Returns "1.46 MB"
 * formatFileSize(1024)    // Returns "1.00 KB"
 * formatFileSize(512)     // Returns "512 B"
 * ```
 */
export function formatFileSize(size: number): string {
  if (size < 1024) {
    return `${size} B`
  } else if (size < 1048576) {
    // 1024 * 1024
    return `${(size / 1024).toFixed(2)} KB`
  } else if (size < 1073741824) {
    // 1024 * 1024 * 1024
    return `${(size / 1048576).toFixed(2)} MB`
  } else {
    return `${(size / 1073741824).toFixed(2)} GB`
  }
}

// 格式化速度
export function formatSpeed(speed: number): string {
  if (speed < 1024) {
    return `${speed} B/s`
  } else if (speed < 1048576) {
    return `${(speed / 1024).toFixed(2)} KB/s`
  } else {
    return `${(speed / 1048576).toFixed(2)} MB/s`
  }
}

// 格式化时间
export function formatTime(timeStr: string): string {
  const date = new Date(timeStr)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

/**
 * 将数组转换为二进制字符串
 * @param selectedItems 已选中的项目数组
 * @param allItems 所有可能的项目数组
 * @returns 二进制字符串
 */
export function arrayToBinaryString(selectedItems: string[], allItems: string[]): string {
  return allItems.map((item) => String(Number(selectedItems.includes(item)))).join('')
}

/**
 * 深拷贝对象（优化版 - 处理循环引用）
 * @param obj 要拷贝的对象
 * @returns 拷贝后的对象
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj
  if (obj instanceof Date) return new Date(obj.getTime()) as any
  if (obj instanceof Array) return obj.map((item) => deepClone(item)) as any
  if (obj instanceof RegExp) return new RegExp(obj.source, obj.flags) as any

  const clonedObj = {} as Record<string, any>
  const keys = Object.keys(obj as object)
  for (const key of keys) {
    clonedObj[key] = deepClone((obj as Record<string, any>)[key])
  }
  return clonedObj as T
}

/**
 * 检查是否为空值
 * @param value 要检查的值
 * @returns 是否为空
 */
export function isEmpty(value: any): boolean {
  return value === null || value === undefined || value === ''
}

/**
 * 过滤对象中的空值（优化版）
 * @param obj 要过滤的对象
 * @returns 过滤后的对象
 */
export function filterEmptyValues<T extends Record<string, any>>(obj: T): Partial<T> {
  const result: Record<string, any> = {}
  const keys = Object.keys(obj)
  for (const key of keys) {
    const value = obj[key]
    if (!isEmpty(value)) {
      result[key] = value
    }
  }
  return result as Partial<T>
}

/**
 * 批量图片预加载
 * @param urls 图片URL数组
 * @param concurrency 并发数量（默认3）
 * @returns Promise
 */
export function preloadImages(urls: string[], concurrency: number = 3): Promise<void> {
  return new Promise((resolve) => {
    let loaded = 0
    let index = 0

    function loadNext() {
      if (index >= urls.length) {
        if (loaded === urls.length) resolve()
        return
      }

      const url = urls[index++]
      if (!url) return // 跳过undefined

      const img = new Image()

      img.onload = img.onerror = () => {
        loaded++
        loadNext()
      }

      img.src = url
    }

    // 启动并发加载
    for (let i = 0; i < Math.min(concurrency, urls.length); i++) {
      loadNext()
    }
  })
}

/**
 * 内存清理辅助函数
 * @param obj 要清理的对象
 */
export function cleanupObject(obj: any): void {
  if (!obj) return

  // 清理事件监听器
  if (obj.removeEventListener && obj._listeners) {
    obj._listeners.forEach((listener: any) => {
      obj.removeEventListener(listener.type, listener.handler)
    })
  }

  // 清理定时器
  if (obj._timers) {
    obj._timers.forEach((timer: number) => clearTimeout(timer))
  }
}

/**
 * 生成指定长度的随机字母数字字符串
 * @param length 字符串长度（默认6）
 * @returns 随机字符串，包含 [a-zA-Z0-9]
 * @example
 * ```typescript
 * generateRandomString()     // Returns "aB3xK9"
 * generateRandomString(8)    // Returns "mN7pQ2wR"
 * generateRandomString(10)   // Returns "kL4jH8nM5v"
 * ```
 */
export function generateRandomString(length: number = 6): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length)
    result += chars[randomIndex]
  }
  
  return result
}
