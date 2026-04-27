---
phase: 14
plan: 2
status: complete
completed: 2026-04-27
---

# Plan 14-02: 扩展 Service 层 - Summary

## Completed Tasks

### Task 1: 扩展 wallpaperService

**文件**: `src/services/wallpaper.service.ts`

添加 `setWallpaper` 方法：
- 接受 `imagePath: string` 参数
- 返回 `Promise<IpcResponse<void>>`
- 直接调用 `wallpaperRepository.setWallpaper`

### Task 2: 扩展 settingsService

**文件**: `src/services/settings.service.ts`

添加三个方法：
- `openFolder(folderPath: string)` - 在系统文件管理器中打开文件夹
- `readDirectory(dirPath: string)` - 读取目录内容，返回 `LocalFile[]`
- `deleteFile(filePath: string)` - 删除文件

**变更说明**:
- 导入 `LocalFile` 类型
- 所有方法调用对应的 Repository 方法
- 返回统一的 `IpcResponse<T>` 格式

## Verification

- [x] TypeScript 编译通过 (`npm run type-check`)
- [x] 所有方法正确调用 Repository
- [x] 返回类型统一为 IpcResponse<T>

## Commit

```
feat(14-02): 扩展 Service 层添加 Repository 调用方法
f85ba62
```

## Files Modified

- `src/services/wallpaper.service.ts`
- `src/services/settings.service.ts`
