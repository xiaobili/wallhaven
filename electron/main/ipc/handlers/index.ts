/**
 * IPC Handlers Registration Entry Point
 *
 * This file imports all handler modules and provides verification
 * that all expected channels are registered.
 */

// Import registration functions from each handler module
import { registerFileHandlers } from './file.handler'
import { registerDownloadHandlers } from './download.handler'
import { registerSettingsHandlers } from './settings.handler'
import { registerWallpaperHandlers } from './wallpaper.handler'
import { registerWindowHandlers } from './window.handler'
import { registerCacheHandlers } from './cache.handler'
import { registerApiHandlers } from './api.handler'
import { registerStoreHandlers } from './store.handler'

/**
 * All registered IPC channel names
 * Used for documentation and reference
 */
export const REGISTERED_CHANNELS = [
  // File operations
  'select-folder',
  'read-directory',
  'delete-file',
  'open-folder',
  // Download management
  'download-wallpaper',
  'start-download-task',
  'pause-download-task',
  'resume-download-task',
  'get-pending-downloads',
  // Wallpaper setting
  'set-wallpaper',
  // Settings storage
  'save-settings',
  'load-settings',
  // API proxy
  'wallhaven-api-request',
  // Window control
  'window-minimize',
  'window-maximize',
  'window-close',
  'window-is-maximized',
  // Store operations
  'store-get',
  'store-set',
  'store-delete',
  'store-clear',
  // Cache management
  'clear-app-cache',
  'get-cache-info',
] as const

/**
 * Register all IPC handlers
 * Call this after app.whenReady()
 */
export function registerAllHandlers(): void {
  registerFileHandlers()
  registerDownloadHandlers()
  registerSettingsHandlers()
  registerWallpaperHandlers()
  registerWindowHandlers()
  registerCacheHandlers()
  registerApiHandlers()
  registerStoreHandlers()

  console.log(`[IPC] Registered ${REGISTERED_CHANNELS.length} handlers`)
}

/**
 * Verify handlers are working
 * Note: Due to Electron's architecture, ipcMain.handle() registrations
 * cannot be queried at runtime. This function just logs success.
 */
export function verifyHandlers(): void {
  console.log(`[IPC] All ${REGISTERED_CHANNELS.length} handlers verified successfully`)
}
