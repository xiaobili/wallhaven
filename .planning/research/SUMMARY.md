# Research Summary: v2.5 壁纸收藏功能

> 研究时间：2026-04-28
> 里程碑：v2.5 壁纸收藏功能

---

## 关键发现

### 1. 无需新增 npm 依赖

现有技术栈完全满足需求：

| 技术 | 版本 | 用途 |
|------|------|------|
| electron-store | 11.0.2 | 本地持久化 |
| Pinia | 3.0.4 | 状态管理 |
| TypeScript | 6.0.0 | 类型安全 |

### 2. 无需新增 IPC 通道

复用现有 `STORE_GET/SET/DELETE` 通道，遵循 `downloadRepository` 模式。

### 3. 清晰的分层架构集成

```
View Layer (FavoritesPage.vue, 修改现有组件)
    ↓
Composable Layer (useFavorites.ts) [NEW]
    ↓
Service Layer (favorites.service.ts) [NEW]
    ↓
Repository Layer (favorites.repository.ts) [NEW]
    ↓
Client Layer (STORAGE_KEYS.FAVORITES_LIST) [NEW 常量]
```

---

## 构建顺序

| 阶段 | 内容 | 文件 |
|------|------|------|
| 1 | 基础设施 | 类型定义 + 存储常量 + Repository |
| 2 | 业务逻辑 | Service 层 |
| 3 | 视图接口 | Composable 层 |
| 4 | UI 页面 | 收藏页面 + 路由 |
| 5 | 功能集成 | 现有组件添加收藏按钮 |

---

## Feature Categories

### Table Stakes (必须有)

| Feature | 复杂度 | 说明 |
|---------|--------|------|
| 添加收藏 | LOW | 点击按钮添加到收藏列表 |
| 移除收藏 | LOW | 再次点击移除 |
| 收藏列表页面 | MEDIUM | 展示所有收藏的壁纸 |
| 本地持久化 | LOW | 使用 electron-store |
| 收藏状态同步 | MEDIUM | 卡片和预览页状态一致 |

### Differentiators (可后续迭代)

| Feature | 复杂度 | 说明 |
|---------|--------|------|
| 收藏夹分类/标签 | HIGH | 后续版本考虑 |
| Wallhaven 云同步 | HIGH | 需要账号体系 |
| 收藏搜索 | MEDIUM | 收藏数量有限时非必须 |

---

## 需要注意的陷阱

| 陷阱 | 预防措施 |
|------|----------|
| 收藏状态不同步 | 使用 Set<string> 存储ID，O(1) 查询 |
| 重复添加 | Repository 层做去重检查 |
| 存储溢出 | 设置 200 条上限，LRU 淘汰 |
| 数据丢失 | electron-store 自动备份 |

---

## 最佳参考文件

实现时参考：

| 新文件 | 参考模板 |
|--------|----------|
| `favorites.repository.ts` | `download.repository.ts` |
| `favorites.service.ts` | `download.service.ts` |
| `useFavorites.ts` | `useDownload.ts` |
| `FavoritesPage.vue` | `LocalWallpaper.vue` |

---

## 新增文件清单

| 文件 | 层级 | 说明 |
|------|------|------|
| `src/types/favorite.ts` | Types | FavoriteItem 接口 |
| `src/repositories/favorites.repository.ts` | Repository | 数据访问 |
| `src/services/favorites.service.ts` | Service | 业务逻辑 |
| `src/composables/favorites/useFavorites.ts` | Composable | 组合式函数 |
| `src/views/FavoritesPage.vue` | View | 收藏页面 |

## 修改文件清单

| 文件 | 变更 |
|------|------|
| `src/clients/constants.ts` | 添加 FAVORITES_LIST 常量 |
| `src/views/OnlineWallpaper.vue` | 添加收藏按钮逻辑 |
| `src/components/ImagePreview.vue` | 添加收藏按钮 |
| `src/components/WallpaperList.vue` | 添加收藏指示器 |
| `src/router/index.ts` | 添加收藏路由 |

---

*研究完成时间：2026-04-28*
