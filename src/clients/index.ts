/**
 * Clients 层统一导出
 *
 * 重构后的架构：
 * - base.client.ts      基础客户端类（内部使用）
 * - store.client.ts     Store 操作
 * - file.client.ts      文件操作
 * - download.client.ts  下载管理
 * - favorites.client.ts 收藏功能
 * - window.client.ts    窗口控制
 * - wallpaper.client.ts 壁纸设置
 * - cache.client.ts     缓存管理
 * - api.client.ts       API 代理
 * - constants.ts        存储键常量
 */

// ==================== 常量 ====================
export { STORAGE_KEYS, type StorageKey } from './constants'

// ==================== 功能客户端 ====================
export { storeClient } from './store.client'
export { fileClient } from './file.client'
export { downloadClient } from './download.client'
export { favoritesClient } from './favorites.client'
export { windowClient } from './window.client'
export { wallpaperClient } from './wallpaper.client'
export { cacheClient } from './cache.client'
export { apiClient } from './api.client'

// ==================== 兼容层 ====================
/**
 * electronClient - 兼容旧代码的聚合客户端
 *
 * 这个对象聚合了所有功能客户端的方法，保持向后兼容。
 * 新代码应该直接使用具体的功能客户端（如 downloadClient、favoritesClient）。
 */
import { storeClient } from './store.client'
import { fileClient } from './file.client'
import { downloadClient } from './download.client'
import { favoritesClient } from './favorites.client'
import { windowClient } from './window.client'
import { wallpaperClient } from './wallpaper.client'
import { cacheClient } from './cache.client'

export const electronClient = {
  // Store 操作
  storeGet: <T>(key: string) => storeClient.get<T>(key),
  storeSet: (key: string, value: unknown) => storeClient.set(key, value),
  storeDelete: (key: string) => storeClient.delete(key),
  storeClear: () => storeClient.clear(),

  // 文件操作
  selectFolder: () => fileClient.selectFolder(),
  readDirectory: (dirPath: string) => fileClient.readDirectory(dirPath),
  openFolder: (folderPath: string) => fileClient.openFolder(folderPath),
  deleteFile: (filePath: string) => fileClient.deleteFile(filePath),
  fileExists: (filePath: string) => fileClient.fileExists(filePath),

  // 下载管理
  downloadWallpaper: (params: { url: string; filename: string; saveDir: string }) =>
    downloadClient.downloadWallpaper(params),
  startDownloadTask: (params: {
    taskId: string
    url: string
    filename: string
    saveDir: string
  }) => downloadClient.startTask(params),
  pauseDownloadTask: (taskId: string) => downloadClient.pauseTask(taskId),
  cancelDownloadTask: (taskId: string) => downloadClient.cancelTask(taskId),
  resumeDownloadTask: (params: Parameters<typeof downloadClient.resumeTask>[0]) =>
    downloadClient.resumeTask(params),
  getPendingDownloads: () => downloadClient.getPendingDownloads(),
  onDownloadProgress: (callback: Parameters<typeof downloadClient.onProgress>[0]) =>
    downloadClient.onProgress(callback),
  removeDownloadProgressListener: (
    callback: Parameters<typeof downloadClient.removeProgressListener>[0],
  ) => downloadClient.removeProgressListener(callback),

  // 收藏功能
  favoritesGetCollections: () => favoritesClient.getCollections(),
  favoritesCreateCollection: (name: string) => favoritesClient.createCollection(name),
  favoritesRenameCollection: (id: string, name: string) =>
    favoritesClient.renameCollection(id, name),
  favoritesDeleteCollection: (id: string) => favoritesClient.deleteCollection(id),
  favoritesSetDefaultCollection: (id: string) => favoritesClient.setDefaultCollection(id),
  favoritesGetByCollection: (collectionId?: string) => favoritesClient.getByCollection(collectionId),
  favoritesAdd: (wallpaperId: string, collectionId: string, wallpaperData: unknown) =>
    favoritesClient.add(wallpaperId, collectionId, wallpaperData as Parameters<typeof favoritesClient.add>[2]),
  favoritesRemove: (wallpaperId: string, collectionId: string) =>
    favoritesClient.remove(wallpaperId, collectionId),
  favoritesMove: (wallpaperId: string, fromCollectionId: string, toCollectionId: string) =>
    favoritesClient.move(wallpaperId, fromCollectionId, toCollectionId),
  favoritesIsFavorite: (wallpaperId: string) => favoritesClient.isFavorite(wallpaperId),
  favoritesGetCollectionsForWallpaper: (wallpaperId: string) =>
    favoritesClient.getCollectionsForWallpaper(wallpaperId),
  favoritesGetPaginated: (params: Parameters<typeof favoritesClient.getPaginated>[0]) =>
    favoritesClient.getPaginated(params),
  favoritesGetCounts: () => favoritesClient.getCounts(),
  favoritesGetStatusMap: (wallpaperIds: string[]) => favoritesClient.getStatusMap(wallpaperIds),

  // 窗口控制
  minimizeWindow: () => windowClient.minimize(),
  maximizeWindow: () => windowClient.maximize(),
  closeWindow: () => windowClient.close(),
  isMaximized: () => windowClient.isMaximized(),

  // 壁纸设置
  setWallpaper: (imagePath: string) => wallpaperClient.set(imagePath),

  // 缓存管理
  clearAppCache: (downloadPath?: string) => cacheClient.clear(downloadPath),
  getCacheInfo: (downloadPath?: string) => cacheClient.getInfo(downloadPath),
  cleanupOrphanFiles: (downloadPath: string) => cacheClient.cleanupOrphanFiles(downloadPath),
}
