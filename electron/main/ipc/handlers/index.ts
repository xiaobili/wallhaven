/**
 * IPC Handlers Registration Entry Point
 *
 * This file imports all handler modules and provides verification
 * that all expected channels are registered.
 */

import { ipcMain } from 'electron'

// Side-effect imports - each file registers its own handlers
import './file.handler'
import './download.handler'
import './settings.handler'
import './wallpaper.handler'
import './window.handler'
import './cache.handler'
import './api.handler'
import './store.handler'

/**
 * All registered IPC channel names
 * Used for verification and documentation
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
 * Verify that all expected handlers are registered
 * Call this after app.whenReady()
 */
export function verifyHandlers(): void {
  const registered = new Set<string>()

  ipcMain.eventNames().forEach(name => {
    if (typeof name === 'string') {
      registered.add(name)
    }
  })

  const missing: string[] = []

  REGISTERED_CHANNELS.forEach(channel => {
    if (!registered.has(channel)) {
      missing.push(channel)
    }
  })

  if (missing.length > 0) {
    throw new Error(`[IPC] Missing handlers: ${missing.join(', ')}`)
  }

  console.log(`[IPC] All ${REGISTERED_CHANNELS.length} handlers verified successfully`)
}
