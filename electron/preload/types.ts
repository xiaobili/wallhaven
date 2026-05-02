/**
 * Preload Script Types and Channel Constants
 *
 * Re-exports IPC channel constants and types for type-safe preload usage.
 */

// Re-export IPC channel constants from shared types
export { IPC_CHANNELS } from '../../src/shared/types/ipc'

// Re-export IPC types for use in preload
export type {
  IpcResponse,
  IpcErrorInfo,
  SelectFolderResponse,
  ReadDirectoryResponse,
  LocalFile,
  OpenFolderResponse,
  DeleteFileResponse,
  FileExistsResponse,
  DownloadWallpaperRequest,
  DownloadWallpaperResponse,
  StartDownloadTaskRequest,
  ResumeDownloadParams,
  PendingDownload,
  DownloadTaskOperationRequest,
  DownloadTaskOperationResponse,
  DownloadProgressData,
  SetWallpaperResponse,
  SaveSettingsResponse,
  LoadSettingsResponse,
  WallhavenApiRequest,
  WallhavenApiResponse,
  StoreSetRequest,
  StoreGetResponse,
  StoreOperationResponse,
  CacheInfo,
  GetCacheInfoResponse,
  ClearCacheResponse,
} from '../../src/shared/types/ipc'

// Import IPC_CHANNELS to build the whitelist
import { IPC_CHANNELS } from '../../src/shared/types/ipc'

/**
 * Valid invoke channel names for whitelist validation
 * These are all the channels that can be called via ipcRenderer.invoke()
 */
export const VALID_INVOKE_CHANNELS: readonly string[] = [
  IPC_CHANNELS.SELECT_FOLDER,
  IPC_CHANNELS.READ_DIRECTORY,
  IPC_CHANNELS.OPEN_FOLDER,
  IPC_CHANNELS.DELETE_FILE,
  IPC_CHANNELS.FILE_EXISTS,
  IPC_CHANNELS.DOWNLOAD_WALLPAPER,
  IPC_CHANNELS.START_DOWNLOAD_TASK,
  IPC_CHANNELS.PAUSE_DOWNLOAD_TASK,
  IPC_CHANNELS.RESUME_DOWNLOAD_TASK,
  IPC_CHANNELS.CANCEL_DOWNLOAD_TASK,
  IPC_CHANNELS.GET_PENDING_DOWNLOADS,
  IPC_CHANNELS.SET_WALLPAPER,
  IPC_CHANNELS.SAVE_SETTINGS,
  IPC_CHANNELS.LOAD_SETTINGS,
  IPC_CHANNELS.WALLHAVEN_API_REQUEST,
  IPC_CHANNELS.WINDOW_MINIMIZE,
  IPC_CHANNELS.WINDOW_MAXIMIZE,
  IPC_CHANNELS.WINDOW_CLOSE,
  IPC_CHANNELS.WINDOW_IS_MAXIMIZED,
  IPC_CHANNELS.STORE_GET,
  IPC_CHANNELS.STORE_SET,
  IPC_CHANNELS.STORE_DELETE,
  IPC_CHANNELS.STORE_CLEAR,
  IPC_CHANNELS.CLEAR_APP_CACHE,
  IPC_CHANNELS.GET_CACHE_INFO,
] as const

/**
 * Validate that a channel is in the whitelist
 * @param channel - Channel name to validate
 * @returns true if channel is valid
 */
export function isValidInvokeChannel(channel: string): boolean {
  return VALID_INVOKE_CHANNELS.includes(channel)
}
