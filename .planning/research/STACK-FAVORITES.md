# 壁纸收藏功能技术栈研究

> 研究时间：2026-04-28
> 目标：为现有应用添加本地收藏功能
> 里程碑：v2.5 壁纸收藏功能

---

## 1. 执行摘要

### 结论：无需新增任何 npm 依赖

现有技术栈完全满足本地收藏功能需求：
- **存储**：electron-store 11.0.2（最新版）- 已集成
- **状态管理**：Pinia 3.0.4（最新版）- 已集成
- **架构**：分层架构 Client → Repository → Service → Composable → View - 已建立

### 所需变更

| 变更类型 | 内容 |
|----------|------|
| 类型定义 | 新增 `FavoriteItem` 接口 |
| 存储键 | 新增 `FAVORITES_LIST` 常量 |
| IPC 通道 | 无需新增（复用 `STORE_GET/SET/DELETE`） |
| Repository | 新增 `FavoriteRepository` |
| Service | 新增 `FavoriteService` |
| Store | 新增 `useFavoriteStore` |
| Composable | 新增 `useFavorites` |
| Views | 新增收藏页面、修改壁纸卡片 |

---

## 2. 现有能力分析

### 2.1 已验证的技术栈

| 技术 | 版本 | 状态 | 用途 |
|------|------|------|------|
| Electron | v41.2.2 | ✅ 最新 | 桌面框架 |
| Vue 3 | 3.5.32 | ✅ 最新 | 前端框架 |
| TypeScript | 6.0.0 | ✅ 最新 | 类型安全 |
| Pinia | 3.0.4 | ✅ 最新 | 状态管理 |
| electron-store | 11.0.2 | ✅ 最新 | 本地持久化 |
| electron-vite | 5.0.0 | ✅ 最新 | 构建工具 |

### 2.2 已建立的架构模式

```
┌─────────────────────────────────────────────────────────────┐
│                     View Layer                               │
│  (OnlineWallpaper, LocalWallpaper, FavoritesPage)           │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                  Composable Layer                            │
│  (useWallpaperList, useDownload, useSettings, useFavorites) │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                   Service Layer                              │
│  (WallpaperService, DownloadService, FavoriteService)       │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                 Repository Layer                             │
│  (WallpaperRepository, DownloadRepository, FavoriteRepo)    │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    Client Layer                              │
│  (electronClient - storeGet/storeSet/storeDelete)           │
└─────────────────────────────────────────────────────────────┘
```

### 2.3 已有的存储基础设施

**存储键常量** (`src/clients/constants.ts`)：
```typescript
export const STORAGE_KEYS = {
  APP_SETTINGS: 'appSettings',
  DOWNLOAD_FINISHED_LIST: 'downloadFinishedList',
  WALLPAPER_QUERY_PARAMS: 'wallpaperQueryParams',
  // 新增：FAVORITES_LIST
} as const
```

**ElectronClient 方法** (`src/clients/electron.client.ts`)：
- `storeGet<T>(key: string)` - 获取数据
- `storeSet(key: string, value: unknown)` - 保存数据
- `storeDelete(key: string)` - 删除数据

---

## 3. 数据结构设计

### 3.1 FavoriteItem 接口

```typescript
// src/types/index.ts

/**
 * 收藏壁纸项
 * 存储最小必要信息，详情通过 ID 从 Wallhaven API 获取
 */
export interface FavoriteItem {
  /** Wallhaven 壁纸 ID */
  id: string
  /** 收藏时间戳 (ISO 8601) */
  addedAt: string
  /** 缩略图 URL（用于列表显示） */
  thumbnail: string
  /** 分辨率信息（用于显示） */
  resolution: string
  /** 文件类型 */
  fileType: string
}

/**
 * 收藏列表存储结构
 */
export interface FavoriteStorage {
  /** 收藏项列表 */
  items: FavoriteItem[]
  /** 最后更新时间 */
  updatedAt: string
}
```

### 3.2 设计理由

| 决策 | 理由 |
|------|------|
| 仅存储最小信息 | 减少存储空间、避免数据过时 |
| 使用 WallpaperItem.id 作为主键 | 与 Wallhaven API 一致，便于去重 |
| 包含 thumbnail | 收藏页面无需 API 请求即可显示缩略图 |
| ISO 8601 时间格式 | 标准化、易于排序和展示 |
| 单一数组结构 | 收藏数量预期有限（<1000），数组性能足够 |

### 3.3 存储位置

数据存储在 Electron 的 `userData` 目录：
- **路径**：`{userData}/wallhaven-data.json`
- **键名**：`favorites`
- **格式**：JSON

---

## 4. 架构集成方案

### 4.1 新增文件

| 文件路径 | 说明 |
|----------|------|
| `src/types/favorite.ts` | FavoriteItem 类型定义 |
| `src/clients/constants.ts` | 添加 FAVORITES_LIST 常量 |
| `src/repositories/favorite.repository.ts` | 收藏数据访问层 |
| `src/services/favorite.service.ts` | 收藏业务逻辑层 |
| `src/stores/modules/favorite/index.ts` | 收藏状态管理 |
| `src/composables/favorite/useFavorites.ts` | 收藏组合式函数 |
| `src/views/FavoritesPage.vue` | 收藏页面视图 |

### 4.2 Repository 层

```typescript
// src/repositories/favorite.repository.ts

import { electronClient } from '@/clients/electron.client'
import { STORAGE_KEYS } from '@/clients/constants'
import type { FavoriteStorage, FavoriteItem } from '@/types/favorite'

export class FavoriteRepository {
  private readonly storageKey = STORAGE_KEYS.FAVORITES_LIST

  async getAll(): Promise<FavoriteItem[]> {
    const response = await electronClient.storeGet<FavoriteStorage>(this.storageKey)
    if (response.success && response.data) {
      return response.data.items
    }
    return []
  }

  async add(item: FavoriteItem): Promise<boolean> {
    const items = await this.getAll()
    
    // 去重检查
    if (items.some(i => i.id === item.id)) {
      return false
    }

    const storage: FavoriteStorage = {
      items: [item, ...items],
      updatedAt: new Date().toISOString()
    }

    const response = await electronClient.storeSet(this.storageKey, storage)
    return response.success
  }

  async remove(id: string): Promise<boolean> {
    const items = await this.getAll()
    const filtered = items.filter(i => i.id !== id)

    if (filtered.length === items.length) {
      return false // 未找到
    }

    const storage: FavoriteStorage = {
      items: filtered,
      updatedAt: new Date().toISOString()
    }

    const response = await electronClient.storeSet(this.storageKey, storage)
    return response.success
  }

  async isFavorite(id: string): Promise<boolean> {
    const items = await this.getAll()
    return items.some(i => i.id === id)
  }
}

export const favoriteRepository = new FavoriteRepository()
```

### 4.3 Service 层

```typescript
// src/services/favorite.service.ts

import { favoriteRepository } from '@/repositories/favorite.repository'
import type { FavoriteItem, WallpaperItem } from '@/types'

export class FavoriteService {
  /**
   * 将 WallpaperItem 转换为 FavoriteItem
   */
  private toFavoriteItem(wallpaper: WallpaperItem): FavoriteItem {
    return {
      id: wallpaper.id,
      addedAt: new Date().toISOString(),
      thumbnail: wallpaper.thumbs.small,
      resolution: wallpaper.resolution,
      fileType: wallpaper.file_type
    }
  }

  async getAll(): Promise<FavoriteItem[]> {
    return favoriteRepository.getAll()
  }

  async add(wallpaper: WallpaperItem): Promise<boolean> {
    const item = this.toFavoriteItem(wallpaper)
    return favoriteRepository.add(item)
  }

  async remove(id: string): Promise<boolean> {
    return favoriteRepository.remove(id)
  }

  async isFavorite(id: string): Promise<boolean> {
    return favoriteRepository.isFavorite(id)
  }

  async toggle(wallpaper: WallpaperItem): Promise<boolean> {
    const isFav = await this.isFavorite(wallpaper.id)
    if (isFav) {
      return this.remove(wallpaper.id)
    }
    return this.add(wallpaper)
  }
}

export const favoriteService = new FavoriteService()
```

### 4.4 Store 层

```typescript
// src/stores/modules/favorite/index.ts

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { favoriteService } from '@/services/favorite.service'
import type { FavoriteItem, WallpaperItem } from '@/types'

export const useFavoriteStore = defineStore('favorite', () => {
  // State
  const items = ref<FavoriteItem[]>([])
  const loading = ref(false)

  // Getters
  const count = computed(() => items.value.length)
  const favoriteIds = computed(() => new Set(items.value.map(i => i.id)))

  // Actions
  async function load() {
    loading.value = true
    try {
      items.value = await favoriteService.getAll()
    } finally {
      loading.value = false
    }
  }

  async function add(wallpaper: WallpaperItem) {
    const success = await favoriteService.add(wallpaper)
    if (success) {
      await load() // 重新加载
    }
    return success
  }

  async function remove(id: string) {
    const success = await favoriteService.remove(id)
    if (success) {
      items.value = items.value.filter(i => i.id !== id)
    }
    return success
  }

  function isFavorite(id: string): boolean {
    return favoriteIds.value.has(id)
  }

  return {
    items,
    loading,
    count,
    favoriteIds,
    load,
    add,
    remove,
    isFavorite
  }
})
```

### 4.5 Composable 层

```typescript
// src/composables/favorite/useFavorites.ts

import { computed } from 'vue'
import { useFavoriteStore } from '@/stores/modules/favorite'
import { useAlert } from '@/composables/alert'
import type { WallpaperItem, FavoriteItem } from '@/types'

export interface UseFavoritesReturn {
  // State
  favorites: ComputedRef<FavoriteItem[]>
  loading: ComputedRef<boolean>
  count: ComputedRef<number>

  // Methods
  isFavorite: (id: string) => boolean
  addToFavorites: (wallpaper: WallpaperItem) => Promise<boolean>
  removeFromFavorites: (id: string) => Promise<boolean>
  toggleFavorite: (wallpaper: WallpaperItem) => Promise<boolean>
  loadFavorites: () => Promise<void>
}

export function useFavorites(): UseFavoritesReturn {
  const store = useFavoriteStore()
  const { showSuccess, showError } = useAlert()

  const favorites = computed(() => store.items)
  const loading = computed(() => store.loading)
  const count = computed(() => store.count)

  async function addToFavorites(wallpaper: WallpaperItem): Promise<boolean> {
    const success = await store.add(wallpaper)
    if (success) {
      showSuccess('已添加到收藏')
    } else {
      showError('添加收藏失败')
    }
    return success
  }

  async function removeFromFavorites(id: string): Promise<boolean> {
    const success = await store.remove(id)
    if (success) {
      showSuccess('已从收藏中移除')
    } else {
      showError('移除收藏失败')
    }
    return success
  }

  async function toggleFavorite(wallpaper: WallpaperItem): Promise<boolean> {
    if (store.isFavorite(wallpaper.id)) {
      return removeFromFavorites(wallpaper.id)
    }
    return addToFavorites(wallpaper)
  }

  async function loadFavorites(): Promise<void> {
    await store.load()
  }

  return {
    favorites,
    loading,
    count,
    isFavorite: store.isFavorite,
    addToFavorites,
    removeFromFavorites,
    toggleFavorite,
    loadFavorites
  }
}
```

---

## 5. IPC 通道分析

### 5.1 现有通道复用

**无需新增 IPC 通道**，直接复用现有的 Store 操作通道：

| 通道 | 用途 |
|------|------|
| `STORE_GET` | 获取收藏列表 |
| `STORE_SET` | 保存收藏列表 |
| `STORE_DELETE` | 清空收藏（如需要） |

### 5.2 IPC 通道定义（参考）

```typescript
// src/shared/types/ipc.ts 中已定义
export const IPC_CHANNELS = {
  STORE_GET: 'store-get',
  STORE_SET: 'store-set',
  STORE_DELETE: 'store-delete',
  // ...
}
```

---

## 6. 不需要添加的内容

### 6.1 避免新增依赖

| 方案 | 原因 |
|------|------|
| SQLite / LowDB | electron-store 已足够，收藏数据量有限 |
| IndexedDB | 仅在大量数据时需要，收藏列表预期 <1000 |
| 本地数据库 ORM | 过度工程，增加复杂度 |
| 云同步服务 | Out of scope，v2.5 仅实现本地收藏 |

### 6.2 避免过度设计

| 功能 | 原因 |
|------|------|
| 收藏夹分类/标签 | Out of scope，可后续迭代 |
| 收藏夹搜索 | 收藏数量有限，无需搜索 |
| 批量操作 | MVP 聚焦基础功能 |
| 壁纸详情缓存 | 仅存储 ID，详情按需从 API 获取 |

---

## 7. 与现有功能的集成点

### 7.1 壁纸卡片组件

在 `WallpaperCard.vue` 或 `WallpaperList.vue` 中添加收藏按钮：

```vue
<template>
  <!-- 现有按钮：下载、设置壁纸 -->
  <button @click="toggleFavorite(wallpaper)">
    <StarIcon :filled="isFavorite(wallpaper.id)" />
  </button>
</template>

<script setup lang="ts">
import { useFavorites } from '@/composables'

const { isFavorite, toggleFavorite } = useFavorites()
</script>
```

### 7.2 图片预览组件

在 `ImagePreview.vue` 中添加收藏按钮：

```vue
<template>
  <!-- 现有按钮 -->
  <button @click="toggleFavorite(currentWallpaper)">
    <StarIcon :filled="isFavorite(currentWallpaper.id)" />
  </button>
</template>
```

### 7.3 路由配置

```typescript
// src/router/index.ts
{
  path: '/favorites',
  name: 'Favorites',
  component: () => import('@/views/FavoritesPage.vue')
}
```

### 7.4 应用初始化

```typescript
// src/main.ts
// 在应用启动时加载收藏数据
await useFavoriteStore().load()
```

---

## 8. 版本兼容性

| 技术 | 当前版本 | 最新版本 | 兼容性 |
|------|----------|----------|--------|
| electron-store | 11.0.2 | 11.0.2 | ✅ 已是最新 |
| Pinia | 3.0.4 | 3.0.4 | ✅ 已是最新 |
| Vue 3 | 3.5.32 | 3.5.32 | ✅ 已是最新 |
| TypeScript | 6.0.0 | 6.0.0 | ✅ 已是最新 |

---

## 9. 置信度评估

| 评估项 | 置信度 | 理由 |
|--------|--------|------|
| electron-store 适用性 | 高 | 已用于设置和下载记录，稳定可靠 |
| 现有架构扩展性 | 高 | 分层架构清晰，易于添加新模块 |
| 无需新依赖 | 高 | 现有能力完全满足需求 |
| 数据结构设计 | 高 | 参考了现有 DownloadItem 模式 |
| IPC 复用可行性 | 高 | Store 操作通道通用性强 |

---

## 10. 风险评估

| 风险 | 可能性 | 影响 | 缓解措施 |
|------|--------|------|----------|
| 收藏数据丢失 | 低 | 中 | 使用 electron-store 自动备份 |
| 大量收藏影响性能 | 低 | 低 | 虚拟滚动（后续优化） |
| ID 冲突 | 极低 | 低 | Wallhaven ID 全局唯一 |
| 类型不一致 | 低 | 中 | TypeScript 编译时检查 |

---

## 11. 实施建议

### 11.1 开发顺序

1. **类型定义** → `FavoriteItem` 接口
2. **存储常量** → `STORAGE_KEYS.FAVORITES_LIST`
3. **Repository 层** → 数据访问
4. **Service 层** → 业务逻辑
5. **Store 层** → 状态管理
6. **Composable 层** → 组合式函数
7. **UI 组件** → 收藏按钮、收藏页面
8. **路由配置** → 添加收藏页面路由
9. **初始化** → 应用启动时加载收藏

### 11.2 测试要点

- [ ] 添加收藏（重复添加应被忽略）
- [ ] 移除收藏
- [ ] 收藏状态持久化（重启应用后保留）
- [ ] 收藏按钮状态同步（卡片、预览页）
- [ ] 收藏列表页面显示

---

*文档版本：v1.0*
*创建时间：2026-04-28*
*适用里程碑：v2.5 壁纸收藏功能*
