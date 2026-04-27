# Phase 14: ElectronAPI Layer Refactor - Research

**Created:** 2026-04-27
**Status:** Research Complete

---

## Executive Summary

Phase 14 将 LocalWallpaper.vue 和 OnlineWallpaper.vue 中的 `window.electronAPI` 直接调用重构为完整的分层架构（View → Composable → Service → Repository → Client → ElectronAPI）。

**关键发现:**
1. `electronClient` 已完整封装所有 electronAPI 方法
2. 现有 Repository 和 Service 层需要扩展方法
3. 需要新建 2 个 Composable，扩展 1 个现有 Composable
4. 无需修改 Client 层（已完整实现）

---

## 1. 当前状态分析

### 1.1 直接调用分布

**LocalWallpaper.vue (4 处):**
| 位置 | 调用 | 用途 |
|------|------|------|
| Line 68 | `window.electronAPI.readDirectory(downloadPath.value)` | 读取本地目录 |
| Line 100 | `window.electronAPI.openFolder(downloadPath.value)` | 打开文件夹 |
| Line 146 | `window.electronAPI.setWallpaper(imagePath)` | 设置壁纸 |
| Line 166 | `window.electronAPI.deleteFile(wallpaper.path)` | 删除文件 |

**OnlineWallpaper.vue (4 处，含 1 处重复):**
| 位置 | 调用 | 用途 |
|------|------|------|
| Line 251 | `window.electronAPI.setWallpaper(downloadResult.filePath)` | 设置壁纸 |
| Line 288 | `window.electronAPI.selectFolder()` | 选择文件夹 |
| Line 297 | `window.electronAPI.selectFolder()` | 选择文件夹（重复） |
| Line 314 | `window.electronAPI.downloadWallpaper({...})` | 下载壁纸 |

### 1.2 现有分层架构

```
┌─────────────────────────────────────────────────────────────────┐
│                      View Layer (需修改)                         │
│  LocalWallpaper.vue, OnlineWallpaper.vue                       │
│  ❌ 直接调用 window.electronAPI                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Composable Layer (需扩展)                      │
│  useSettings, useDownload, useAlert, useWallpaperList          │
│  需新建: useLocalFiles, useWallpaperSetter                      │
│  需扩展: useSettings.selectFolder                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Service Layer (需扩展)                        │
│  wallpaperService, settingsService, downloadService            │
│  需扩展: setWallpaper, selectFolder, openFolder, readDirectory  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Repository Layer (需扩展)                       │
│  wallpaperRepository, settingsRepository, downloadRepository   │
│  需扩展: setWallpaper, openFolder, readDirectory, deleteFile   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Client Layer (✓ 完整)                        │
│  electronClient                                                 │
│  ✓ 所有方法已封装，返回 IpcResponse<T>                           │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. 现有代码分析

### 2.1 electronClient (完整)

`src/clients/electron.client.ts` 已封装所有需要的方法：

```typescript
class ElectronClientImpl {
  // 文件操作
  async selectFolder(): Promise<IpcResponse<string | null>>
  async readDirectory(dirPath: string): Promise<IpcResponse<LocalFile[]>>
  async openFolder(folderPath: string): Promise<IpcResponse<void>>
  async deleteFile(filePath: string): Promise<IpcResponse<void>>

  // 壁纸设置
  async setWallpaper(imagePath: string): Promise<IpcResponse<void>>

  // 下载管理
  async downloadWallpaper(params: {...}): Promise<IpcResponse<string>>
}
```

**结论:** Client 层无需修改。

### 2.2 Repository 层分析

**wallpaperRepository (src/repositories/wallpaper.repository.ts):**
- 现有: `getQueryParams`, `setQueryParams`, `deleteQueryParams`
- 需扩展: `setWallpaper`

**settingsRepository (src/repositories/settings.repository.ts):**
- 现有: `get`, `set`, `delete`, `selectFolder`, `clearStore`, `clearAppCache`, `getCacheInfo`
- 需扩展: `openFolder`, `readDirectory`, `deleteFile`

**downloadRepository:**
- 已有 downloadWallpaper 相关方法，无需修改

### 2.3 Service 层分析

**wallpaperService (src/services/wallpaper.service.ts):**
- 现有: `search`, `getDetail`, `saveQueryParams`, `loadQueryParams`
- 需扩展: `setWallpaper`

**settingsService (src/services/settings.service.ts):**
- 现有: `get`, `set`, `update`, `reset`, `selectFolder`, `clearAppCache`, `clearStore`, `getCacheInfo`
- 需扩展: `openFolder`, `readDirectory`, `deleteFile`

### 2.4 Composable 层分析

**useSettings (src/composables/settings/useSettings.ts):**
- 现有: `settings`, `load`, `update`, `reset`, `getDefaults`, `editableSettings`, `startEdit`, `discardChanges`, `saveChanges`, `isDirty`
- 需扩展: `selectFolder` 方法

**useDownload (src/composables/download/useDownload.ts):**
- 已有完整的下载管理功能
- 无需修改

**需新建:**
- `useWallpaperSetter` — 封装 setWallpaper 操作
- `useLocalFiles` — 封装 readDirectory, openFolder, deleteFile

---

## 3. 迁移策略

### 3.1 方法归属决策

| electronAPI 方法 | Repository | Service | Composable |
|-----------------|------------|---------|------------|
| setWallpaper | wallpaperRepository | wallpaperService | useWallpaperSetter (新建) |
| readDirectory | settingsRepository | settingsService | useLocalFiles (新建) |
| openFolder | settingsRepository | settingsService | useLocalFiles (新建) |
| deleteFile | settingsRepository | settingsService | useLocalFiles (新建) |
| selectFolder | ✓ 已有 | ✓ 已有 | useSettings (扩展) |
| downloadWallpaper | ✓ 已有 | ✓ 已有 | useDownload (已有) |

### 3.2 分层调用路径

**setWallpaper:**
```
View → useWallpaperSetter.setWallpaper()
     → wallpaperService.setWallpaper()
     → wallpaperRepository.setWallpaper()
     → electronClient.setWallpaper()
```

**readDirectory/openFolder/deleteFile:**
```
View → useLocalFiles.readDirectory/openFolder/deleteFile()
     → settingsService.readDirectory/openFolder/deleteFile()
     → settingsRepository.readDirectory/openFolder/deleteFile()
     → electronClient.readDirectory/openFolder/deleteFile()
```

**selectFolder:**
```
View → useSettings.selectFolder()
     → settingsService.selectFolder()
     → settingsRepository.selectFolder()
     → electronClient.selectFolder()
```

---

## 4. 文件变更清单

### 4.1 需要修改的文件

| 文件 | 变更类型 | 说明 |
|------|----------|------|
| `src/repositories/wallpaper.repository.ts` | 扩展 | 添加 `setWallpaper` 方法 |
| `src/repositories/settings.repository.ts` | 扩展 | 添加 `openFolder`, `readDirectory`, `deleteFile` 方法 |
| `src/services/wallpaper.service.ts` | 扩展 | 添加 `setWallpaper` 方法 |
| `src/services/settings.service.ts` | 扩展 | 添加 `openFolder`, `readDirectory`, `deleteFile` 方法 |
| `src/composables/settings/useSettings.ts` | 扩展 | 添加 `selectFolder` 方法返回 |
| `src/composables/index.ts` | 扩展 | 导出新 Composables |
| `src/views/LocalWallpaper.vue` | 修改 | 移除直接调用，使用 Composables |
| `src/views/OnlineWallpaper.vue` | 修改 | 移除直接调用，使用 Composables |

### 4.2 需要新建的文件

| 文件 | 说明 |
|------|------|
| `src/composables/wallpaper/useWallpaperSetter.ts` | 封装 setWallpaper 操作 |
| `src/composables/local/useLocalFiles.ts` | 封装本地文件操作 |

---

## 5. 技术风险

### 5.1 低风险
- Client 层已完整实现，无需修改
- 现有架构模式清晰，只需遵循
- 无功能变更，纯架构迁移

### 5.2 注意事项
- 确保返回值格式统一 (`IpcResponse<T>`)
- 保持错误处理一致性
- Composable 需要正确导出

---

## 6. 验收标准

1. ✓ LocalWallpaper.vue 无直接 `window.electronAPI` 调用
2. ✓ OnlineWallpaper.vue 无直接 `window.electronAPI` 调用
3. ✓ TypeScript 编译通过
4. ✓ 所有现有功能行为不变

---

## RESEARCH COMPLETE
