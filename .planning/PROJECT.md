# Wallhaven 壁纸浏览器 - 代码清理优化

## What This Is

Wallhaven 是一款基于 Electron + Vue 3 + TypeScript 构建的跨平台桌面壁纸浏览与下载应用。本次优化目标是清理项目中未使用的代码，减小打包体积，提高代码可维护性。

## Core Value

保守清理：只移除确定无用的代码，保留可能在未来使用的类型和工具函数，确保不影响现有功能。

## Requirements

### Validated

<!-- 现有已验证的功能 - 不影响这些 -->

- ✓ 在线壁纸搜索与浏览
- ✓ 本地壁纸管理
- ✓ 下载管理（断点续传）
- ✓ 收藏夹功能
- ✓ 应用设置

### Active

- [ ] 分析并识别真正未使用的代码
- [ ] 清理未使用的类型守卫函数
- [ ] 清理未使用的 wallpaperApi 导出
- [ ] 清理 barrel 文件中未使用的函数/值导出
- [ ] 验证清理后应用正常运行

### Out of Scope

- ❌ 移除工具函数 — 通用工具函数保留以备将来使用
- ❌ 移除 Store 文件 — 正被 Composables 使用，非未使用代码
- ❌ 移除类型定义 — 保留公共 API 类型定义
- ❌ 移除 electronClient 兼容层 — 正被 Repository 层使用

## Context

### 项目架构

项目采用清晰的分层架构：

```
View Layer → Composable Layer → Service Layer → Repository Layer → Client Layer
```

### ts-prune 分析结果

通过 ts-prune 分析发现 148 个未使用的导出，经深入分析后：

**误报（实际被使用）：**
- `STORAGE_KEYS` - 被 Repository 层使用
- `StorageKey` - 类型定义，与 STORAGE_KEYS 配套
- `apiClient` - 被 WallpaperService 使用
- `electronClient` - 被 Repository 层使用
- `useDownloadStore/useFavoritesStore/useWallpaperStore` - 被 Composables 使用
- `router default export` - 被 main.ts 使用
- `flattenWallpapers` - 被 OnlineWallpaper.vue 使用
- `getHeartState` - 被 WallpaperList.vue 和 ImagePreview.vue 使用
- `IPC_CHANNELS` - 被主进程和预加载脚本使用
- `AppError` - 被 main.ts 全局错误处理器使用

**真正未使用的代码：**
- `isIpcErrorInfo` - 类型守卫函数
- `isResumeDownloadParams` - 类型守卫函数
- `isPendingDownload` - 类型守卫函数
- `clearApiCache` - wallpaperApi 导出
- `searchWallpapers` - wallpaperApi 导出
- `getWallpaperDetail` - wallpaperApi 导出

### 分析方法论

1. ts-prune 静态分析找出潜在未使用导出
2. grep 搜索确认实际使用情况
3. 区分：Pinia Store（依赖注入）、barrel 文件重导出、公共 API 类型

## Constraints

- **保守原则**: 不确定时保留代码
- **类型保留**: 公共 API 类型定义必须保留
- **功能完整**: 清理后所有现有功能必须正常工作
- **测试验证**: 清理后运行测试确保无回归

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| 保留工具函数 | debounce, throttle 等是通用函数，未来可能需要 | ✓ 保留 |
| 保留 Store 文件 | 被 Composables 通过 Pinia 依赖注入使用 | ✓ 保留 |
| 区分对待类型 | 公共 API 类型保留，内部未使用类型守卫可清理 | — 待执行 |
| 清理 barrel 文件 | 移除未使用的函数/值导出，保留类型导出 | — 待执行 |

---
*Last updated: 2026-05-05 after 项目初始化分析*
