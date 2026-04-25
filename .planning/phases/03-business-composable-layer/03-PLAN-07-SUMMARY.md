# Plan 07 Execution Summary

**Plan**: Store 重构 - 移除业务逻辑
**Phase**: 3 - 业务层与组合层
**Wave**: 3
**Status**: ✅ 完成
**Date**: 2025-04-25

---

## 执行任务

| 任务 | 描述 | 状态 | 提交 |
|------|------|------|------|
| 1 | 重写 WallpaperStore，移除业务逻辑 | ✅ 完成 | 81f4c0b |
| 2 | 删除废弃的 wallpaper store 文件 | ✅ 完成 | 565f560 |
| 3 | 重写 DownloadStore，移除业务逻辑 | ✅ 完成 | cd6d987 |

---

## 验证结果

### 文件删除验证

```bash
$ ls src/stores/modules/wallpaper/
index.ts  README.md
```

已删除文件：
- ✅ `actions.ts` - 已删除
- ✅ `storage.ts` - 已删除
- ✅ `settings-storage.ts` - 已删除
- ✅ `state.ts` - 已删除

### Store 方法验证

**WallpaperStore 保留的方法**：
- ✅ `totalPageData` - 状态
- ✅ `loading` - 状态
- ✅ `error` - 状态
- ✅ `queryParams` - 状态
- ✅ `savedParams` - 状态
- ✅ `settings` - 状态
- ✅ `resetState()` - 方法

**WallpaperStore 移除的方法**：
- ✅ `fetchWallpapers` - 移至 useWallpaperList
- ✅ `loadMoreWallpapers` - 移至 useWallpaperList
- ✅ `saveCustomParams` - 移至 useWallpaperList
- ✅ `getSavedParams` - 移至 useWallpaperList
- ✅ `updateSettings` - 移至 useSettings
- ✅ `loadSettings` - 移至 useSettings

**DownloadStore 保留的方法**：
- ✅ `downloadingList` - 状态
- ✅ `finishedList` - 状态
- ✅ `activeDownloads` - 计算属性
- ✅ `pausedDownloads` - 计算属性
- ✅ `totalActive/totalPaused/totalFinished` - 计算属性
- ✅ `addDownloadTask()` - 同步方法
- ✅ `updateProgress()` - 同步方法
- ✅ `completeDownload()` - 同步方法
- ✅ `pauseDownload()` - 同步方法
- ✅ `resumeDownload()` - 同步方法
- ✅ `cancelDownload()` - 同步方法
- ✅ `isDownloading()` - 同步方法

**DownloadStore 移除的方法**：
- ✅ `startDownload` - 移至 useDownload
- ✅ `saveToStorage` - 移至 DownloadService
- ✅ `loadFromStorage` - 移至 useDownload
- ✅ `removeFinishedRecord` - 移至 useDownload
- ✅ `clearFinishedList` - 移至 useDownload
- ✅ `addBatchDownloadTasks` - 移至 useDownload

### TypeScript 编译

新增文件编译通过。存在的类型错误是由于组件仍引用旧 store 方法，将在 Phase 5 修复。

---

## 文件变更

| 文件 | 操作 | 变更 |
|------|------|------|
| `src/stores/modules/wallpaper/index.ts` | 重写 | +57/-20 行 |
| `src/stores/modules/wallpaper/actions.ts` | 删除 | -163 行 |
| `src/stores/modules/wallpaper/storage.ts` | 删除 | -32 行 |
| `src/stores/modules/wallpaper/settings-storage.ts` | 删除 | -32 行 |
| `src/stores/modules/wallpaper/state.ts` | 删除 | -61 行 |
| `src/stores/modules/download/index.ts` | 重写 | +77/-269 行 |

---

## 关键实现

### WallpaperStore 精简

```typescript
export const useWallpaperStore = defineStore('wallpaper', () => {
  // ==================== 状态 ====================

  const totalPageData = shallowRef<TotalPageData>({ ... })
  const loading = ref<boolean>(false)
  const error = ref<boolean>(false)
  const queryParams = ref<GetParams | null>(null)
  const savedParams = ref<CustomParams | null>(null)
  const settings = reactive<AppSettings>(createDefaultSettings())

  // ==================== 方法 ====================

  function resetState(): void { ... }

  return {
    totalPageData, loading, error, queryParams, savedParams, settings,
    resetState,
  }
})
```

### DownloadStore 精简

关键变更：
1. **方法改为同步**：`addDownloadTask`, `pauseDownload`, `resumeDownload`, `cancelDownload` 不再是 async
2. **移除存储操作**：不再调用 `saveToStorage()`
3. **保留状态管理**：只管理响应式状态和简单状态变更

---

## 架构影响

### 重构前

```
Store (业务逻辑 + 状态)
  ├── 直接调用 IPC
  ├── 直接操作存储
  └── 包含复杂业务逻辑
```

### 重构后

```
Composable (业务逻辑)
  ├── 协调 Service 和 Store
  └── 处理错误和提示

Service (数据访问)
  ├── 封装 Repository
  └── 处理异步操作

Store (仅状态)
  ├── 响应式状态声明
  └── 简单状态变更
```

---

## 设计决策

1. **保留 resetState**：简单的状态重置方法保留在 Store 中
2. **方法同步化**：移除 async 后，方法只做状态变更，不涉及 I/O
3. **文件合并**：state.ts 合并到 index.ts，减少文件数量
4. **删除存储层**：storage.ts 和 settings-storage.ts 完全删除，由 Service 层处理

---

## 预存问题

组件中仍引用旧 store 方法（如 `store.fetchWallpapers()`），将在 Phase 5 UI 层重构时修复。

---

## 下一步

- Plan 08: 清理和验证
