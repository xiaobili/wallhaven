/**
 * 设置服务
 * 封装设置相关的业务逻辑（ARCH-02: 无状态服务）
 */

import type { IpcResponse, LocalFile } from '@/types/ipc'
import type { AppSettings, WallpaperFit } from '@/types'
import { settingsRepository, type ClearCacheResult } from '@/repositories'
import type { CacheInfo } from '@/types/ipc'

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
 * ARCH-02: 转为无状态服务，缓存已迁移到 Store
 */
class SettingsServiceImpl {
  /**
   * 获取应用设置
   * @returns 返回设置数据，如果未设置则返回 null
   */
  async get(): Promise<IpcResponse<AppSettings | null>> {
    return settingsRepository.get()
  }

  /**
   * 保存应用设置
   * @param settings - 应用设置对象
   */
  async set(settings: AppSettings): Promise<IpcResponse<void>> {
    return settingsRepository.set(settings)
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
    const current: AppSettings =
      currentResult.success && currentResult.data ? currentResult.data : this.getDefaults()

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
    // 保存默认设置
    return this.set(this.getDefaults())
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
   * @param downloadPath - 下载目录路径
   */
  async clearAppCache(downloadPath?: string): Promise<IpcResponse<ClearCacheResult>> {
    return settingsRepository.clearAppCache(downloadPath)
  }

  /**
   * 清空应用存储
   */
  async clearStore(): Promise<IpcResponse<void>> {
    return settingsRepository.clearStore()
  }

  /**
   * 获取缓存信息
   * @param downloadPath - 下载目录路径
   */
  async getCacheInfo(downloadPath?: string): Promise<IpcResponse<CacheInfo>> {
    return settingsRepository.getCacheInfo(downloadPath)
  }

  // ============================================
  // 文件操作方法
  // ============================================

  /**
   * 在系统文件管理器中打开文件夹
   * @param folderPath - 文件夹路径
   */
  async openFolder(folderPath: string): Promise<IpcResponse<void>> {
    return settingsRepository.openFolder(folderPath)
  }

  /**
   * 读取目录内容
   * @param dirPath - 目录路径
   * @param page - 页码（从 1 开始，可选）
   * @param pageSize - 每页数量（可选，默认 50）
   * @returns 返回目录中的文件列表
   */
  async readDirectory(dirPath: string, page?: number, pageSize?: number): Promise<IpcResponse<LocalFile[]>> {
    return settingsRepository.readDirectory(dirPath, page, pageSize)
  }

  /**
   * 删除文件
   * @param filePath - 文件路径
   */
  async deleteFile(filePath: string): Promise<IpcResponse<void>> {
    return settingsRepository.deleteFile(filePath)
  }
}

/** 设置服务单例 */
export const settingsService = new SettingsServiceImpl()
