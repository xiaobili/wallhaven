/**
 * Composables 统一导出
 */

export { useAlert, type AlertType, type AlertState, type UseAlertReturn } from './core/useAlert'

// Wallpaper
export { useWallpaperList, type UseWallpaperListReturn } from './wallpaper/useWallpaperList'
export {
  useWallpaperSetter,
  type UseWallpaperSetterReturn,
  type DownloadResult,
} from './wallpaper/useWallpaperSetter'
export {
  useWallpaperSelection,
  type UseWallpaperSelectionReturn,
  type SelectionState,
  type SelectionActions,
  flattenWallpapers,
} from './wallpaper/useWallpaperSelection'
export { useWallpaperDownload, type UseWallpaperDownloadReturn } from './wallpaper/useWallpaperDownload'

// Download
export { useDownload, type UseDownloadReturn } from './download/useDownload'

// Settings
export { useSettings, type UseSettingsReturn } from './settings/useSettings'

// Local Files
export { useLocalFiles, type UseLocalFilesReturn } from './local/useLocalFiles'

// Favorites
export { useCollections, type UseCollectionsReturn } from './favorites/useCollections'
export { useFavorites, type UseFavoritesReturn } from './favorites/useFavorites'
export {
  useFavoriteDropdown,
  type UseFavoriteDropdownReturn,
  type DropdownPosition,
  type DropdownState,
  type DropdownActions,
} from './favorites/useFavoriteDropdown'

// Animation
export {
  useImageTransition,
  type SlideDirection,
  type NavigationDirection,
  type UseImageTransitionReturn,
} from './animation/useImageTransition'
