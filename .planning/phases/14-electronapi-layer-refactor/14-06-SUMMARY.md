---
phase: 14
plan: 6
status: complete
completed: 2026-04-27
---

# Plan 14-06: 迁移 Views - Summary

## Completed Tasks

### Task 1: 迁移 LocalWallpaper.vue

**文件**: `src/views/LocalWallpaper.vue`

替换所有直接 `window.electronAPI` 调用：
- `readDirectory` → `useLocalFiles().readDirectory`
- `openFolder` → `useLocalFiles().openFolder` (重命名为 `openFolderAction` 避免冲突)
- `setWallpaper` → `useWallpaperSetter().setWallpaper`
- `deleteFile` → `useLocalFiles().deleteFile`

### Task 2: 迁移 OnlineWallpaper.vue

**文件**: `src/views/OnlineWallpaper.vue`

替换所有直接 `window.electronAPI` 调用：
- `setWallpaper` → `useWallpaperSetter().setWallpaper`
- `selectFolder` → `useSettings().selectFolder`
- `downloadWallpaper` → `electronClient.downloadWallpaper` (通过动态导入)

## Verification

- [x] TypeScript 编译通过 (`npm run type-check`)
- [x] `grep -r "window.electronAPI" src/views/` 返回无匹配
- [x] 所有功能使用 composables 或 electronClient

## Commit

```
feat(14-06): 迁移 Views 移除直接 electronAPI 调用
a2fd212
```

## Files Modified

- `src/views/LocalWallpaper.vue`
- `src/views/OnlineWallpaper.vue`
