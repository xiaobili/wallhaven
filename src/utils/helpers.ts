// 通用工具函数

/**
 * 防抖函数
 * @param fn 要执行的函数
 * @param delay 延迟时间（毫秒）
 * @returns 防抖后的函数
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number = 300,
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout> | null = null

  return function (this: any, ...args: Parameters<T>) {
    if (timer) {
      clearTimeout(timer)
    }

    timer = setTimeout(() => {
      fn.apply(this, args)
      timer = null
    }, delay)
  }
}

/**
 * 节流函数
 * @param fn 要执行的函数
 * @param interval 间隔时间（毫秒）
 * @returns 节流后的函数
 */
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  interval: number = 300,
): (...args: Parameters<T>) => void {
  let lastTime = 0

  return function (this: any, ...args: Parameters<T>) {
    const now = Date.now()

    if (now - lastTime >= interval) {
      lastTime = now
      fn.apply(this, args)
    }
  }
}

/**
 * 格式化分辨率显示
 * @param str 分辨率字符串（如 "1920x1080"）
 * @returns 格式化后的字符串（如 "1920 × 1080"）
 */
export function formatResolution(str: string): string {
  return str.replace(/x/g, ' × ')
}

/**
 * 格式化文件大小
 * @param size 文件大小（字节）
 * @returns 格式化后的字符串
 */
export function formatFileSize(size: number): string {
  if (size < 1024) {
    return `${size} B`
  } else if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(2)} KB`
  } else if (size < 1024 * 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(2)} MB`
  } else {
    return `${(size / (1024 * 1024 * 1024)).toFixed(2)} GB`
  }
}

// 格式化速度
export function formatSpeed(speed: number): string {
  if (speed < 1024) {
    return `${speed} B/s`
  } else if (speed < 1024 * 1024) {
    return `${(speed / 1024).toFixed(2)} KB/s`
  } else {
    return `${(speed / (1024 * 1024)).toFixed(2)} MB/s`
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
 * 深拷贝对象
 * @param obj 要拷贝的对象
 * @returns 拷贝后的对象
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj))
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
 * 过滤对象中的空值
 * @param obj 要过滤的对象
 * @returns 过滤后的对象
 */
export function filterEmptyValues<T extends Record<string, any>>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([_, value]) => !isEmpty(value)),
  ) as Partial<T>
}
