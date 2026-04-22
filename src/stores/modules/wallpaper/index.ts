// Wallhaven 壁纸状态管理主入口

import { defineStore } from 'pinia'
import { createInitialState } from './state'
import { createWallpaperActions } from './actions'

export const useWallpaperStore = defineStore('wallpaper', () => {
  // State
  const state = createInitialState()

  // Actions
  const actions = createWallpaperActions(
    state.totalPageData,
    state.loading,
    state.error,
    state.queryParams,
    state.savedParams,
    state.settings,
  )

  return {
    // State
    ...state,

    // Actions
    ...actions,
  }
})
