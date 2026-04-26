/**
 * 设置服务
 * 封装设置相关的业务逻辑，提供内存缓存优化
 */

import type { IpcResponse } from '@/shared/types/ipc'
import type { AppSettings, WallpaperFit } from '@/types'
import { settingsRepository, type CacheInfo, type ClearCacheResult } from '@/repositories'

/**
 * 默认应用设置
 */
const DEFAULT_SETTINGS: AppSettings = {
  downloadPath: '',
  maxConcurrentDownloads: 3,
  apiKey: '',
  wallpaperFit: 'fill' as WallpaperFit,
}

/**
 * 设置服务实现类
 */
class SettingsServiceImpl {
  /** 内存缓存的设置 */
  private cachedSettings: AppSettings | null = null

  /**
   * 获取应用设置
   * 优先返回内存缓存，避免重复 IPC 调用
   * @returns 返回设置数据，如果未设置则返回 null
   */
  async get(): Promise<IpcResponse<AppSettings | null>> {
    // 优先返回缓存
    if (this.cachedSettings) {
      return { success: true, data: this.cachedSettings }
    }

    // 从 Repository 获取
    const result = await settingsRepository.get()

    // 成功时更新缓存
    if (result.success && result.data) {
      this.cachedSettings = result.data
    }

    return result
  }

  /**
   * 保存应用设置
   * 同时更新内存缓存
   * @param settings - 应用设置对象
   */
  async set(settings: AppSettings): Promise<IpcResponse<void>> {
    const result = await settingsRepository.set(settings)

    // 成功时更新缓存
    if (result.success) {
      this.cachedSettings = { ...settings }
    }

    return result
  }

  /**
   * 更新部分设置
   * 合并现有设置与传入的部分设置
   * @param partial - 部分设置对象
   */
  async update(partial: Partial<AppSettings>): Promise<IpcResponse<void>> {
    // 获取当前设置
    const currentResult = await this.get()

    // 构建当前设置（如果没有则使用默认值）
    const current: AppSettings = currentResult.success && currentResult.data
      ? currentResult.data
      : this.getDefaults()

    // 合并设置
    const merged: AppSettings = { ...current, ...partial }

    // 保存合并后的设置
    return this.set(merged)
  }

  /**
   * 获取默认设置
   * @returns 默认设置对象的副本
   */
  getDefaults(): AppSettings {
    return { ...DEFAULT_SETTINGS }
  }

  /**
   * 重置设置为默认值
   */
  async reset(): Promise<IpcResponse<void>> {
    // 清除缓存
    this.cachedSettings = null

    // 保存默认设置
    return this.set(this.getDefaults())
  }

  /**
   * 清除内存缓存
   * 下次获取设置时将从 Repository 重新加载
   */
  clearCache(): void {
    this.cachedSettings = null
  }

  // ============================================
  // 缓存管理方法
  // ============================================

  /**
   * 选择文件夹
   * @returns 返回选中的文件夹路径，取消则返回 null
   */
  async selectFolder(): Promise<IpcResponse<string | null>> {
    return settingsRepository.selectFolder()
  }

  /**
   * 清理应用缓存
   * 同时清除内存中的设置缓存
   * @param downloadPath - 下载目录路径
   */
  async clearAppCache(downloadPath?: string): Promise<IpcResponse<ClearCacheResult>> {
    // 清除内存缓存
    this.cachedSettings = null
    return settingsRepository.clearAppCache(downloadPath)
  }

  /**
   * 清空应用存储
   * 同时清除内存中的设置缓存
   */
  async clearStore(): Promise<IpcResponse<void>> {
    // 清除内存缓存
    this.cachedSettings = null
    return settingsRepository.clearStore()
  }

  /**
   * 获取缓存信息
   * @param downloadPath - 下载目录路径
   */
  async getCacheInfo(downloadPath?: string): Promise<IpcResponse<CacheInfo>> {
    return settingsRepository.getCacheInfo(downloadPath)
  }
}

/** 设置服务单例 */
export const settingsService = new SettingsServiceImpl()
