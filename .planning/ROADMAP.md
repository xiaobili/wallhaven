# Roadmap: Wallhaven 壁纸浏览器架构重构

> 创建时间：2025-04-25
> 最后更新：2026-04-28

---

## Milestones

- ✅ **v2.0 架构重构** — Phases 1-5 (shipped 2026-04-26)
- ✅ **v2.1 下载断点续传** — Phases 6-9 (shipped 2026-04-27) — [Archive](milestones/v2.1-ROADMAP.md)
- ✅ **v2.2 Store 分层迁移** — Phases 10-13 (shipped 2026-04-27)
- ✅ **v2.3 ElectronAPI 分层重构** — Phase 14 (shipped 2026-04-27)
- ✅ **v2.4 ImagePreview 导航功能** — Phase 15 (shipped 2026-04-27)
- 🔄 **v2.5 壁纸收藏功能** — Phases 16-21 (in progress)

---

## Phases

<details>
<summary>✅ v2.0 架构重构 (Phases 1-5) — SHIPPED 2026-04-26</summary>

- [x] Phase 1: 基础设施与类型安全 (6/6 plans) — completed 2025-04-25
- [x] Phase 2: 数据层抽象 (8/8 plans) — completed 2025-04-25
- [x] Phase 3: 业务层与组合层 (8/8 plans) — completed 2025-04-25
- [x] Phase 4: IPC 模块化重构 (6/6 plans) — completed 2026-04-26
- [x] Phase 5: 表现层重构与清理 (7/7 plans) — completed 2026-04-26

</details>

<details>
<summary>✅ v2.1 下载断点续传 (Phases 6-9) — SHIPPED 2026-04-27</summary>

- [x] Phase 6: Core Resume Infrastructure (9/9 plans) — completed 2026-04-26
- [x] Phase 7: Main Process Implementation (4/4 plans) — completed 2026-04-26
- [x] Phase 8: Renderer Integration (5/5 plans) — completed 2026-04-26
- [x] Phase 9: Error Handling & Edge Cases (3/3 plans) — completed 2026-04-27

</details>

---

### v2.2 Store 分层迁移 (Phases 10-13)

**Goal**: 将 views 中直接使用的 store 全部迁移到 composables，强化 View → Composable → Store 分层架构

#### Phase 10: Simple Substitutions

**Requirements**: SMIG-01, SMIG-02

**Goal**: 迁移简单直接的 store 访问到现有 composables

**Files**: `LocalWallpaper.vue`, `DownloadWallpaper.vue`

**Changes**:
- `LocalWallpaper.vue`: 移除 `useWallpaperStore` 导入，改用 `useSettings()` 获取 `downloadPath`
- `DownloadWallpaper.vue`: 移除 `useDownloadStore` 导入，改用 `useDownload()` 获取列表状态

**Success Criteria**:
1. LocalWallpaper.vue 无 `useWallpaperStore` 导入
2. DownloadWallpaper.vue 无 `useDownloadStore` 导入
3. 本地壁纸页面正常显示下载路径下的壁纸
4. 下载页面正常显示下载中和已完成列表

---

#### Phase 11: OnlineWallpaper Migration

**Requirements**: SMIG-03, CMIG-01

**Goal**: 迁移 OnlineWallpaper.vue 中的所有直接 store 访问

**Files**: `OnlineWallpaper.vue`

**Changes**:
- 替换 `wallpaperStore.totalPageData`, `.loading`, `.error` 为 `useWallpaperList()` 的返回值
- 替换 `wallpaperStore.settings.apiKey` 为 `useSettings()` 的返回值
- 验证滚动事件处理器与 composable 的 `loading` 状态正确协作

**Success Criteria**:
1. OnlineWallpaper.vue 无 `useWallpaperStore` 直接导入
2. 壁纸列表正常加载和分页
3. 加载状态正确显示（skeleton/loading indicator）
4. 错误状态正确显示错误信息
5. API Key 设置正确影响壁纸查询

---

#### Phase 12: SettingPage Migration

**Requirements**: CMIG-02, CMIG-03

**Goal**: 迁移 SettingPage.vue，处理响应式表单绑定

**Files**: `SettingPage.vue`, `useSettings.ts` (扩展)

**Changes**:
- 扩展 `useSettings` composable 支持表单响应式绑定（创建本地 reactive 副本）
- 移除 `useWallpaperStore` 直接导入
- 使用扩展后的 `useSettings()` 处理所有设置字段

**Success Criteria**:
1. SettingPage.vue 无 `useWallpaperStore` 导入
2. 所有设置字段正确显示当前值
3. 设置修改后保存按钮正确更新设置
4. 重置按钮正确恢复默认设置
5. 设置变更后相关功能正确响应（如 API Key 影响查询）

---

#### Phase 13: Verification & Enforcement

**Requirements**: CLUP-01, CLUP-02, CLUP-03, CLUP-04

**Goal**: 验证架构完整性并防止回归

**Delivers**:
- 验证所有 4 个 views 文件中无 `useWallpaperStore` 或 `useDownloadStore` 导入
- 添加 ESLint `no-restricted-imports` 规则防止 store 直接导入
- TypeScript 编译通过，无类型错误
- 手动测试验证所有现有功能行为不变

**Success Criteria**:
1. ESLint 规则生效，直接导入 store 报错
2. `npm run typecheck` 通过无错误
3. `npm run lint` 通过无错误
4. 手动测试：在线壁纸浏览、本地壁纸浏览、下载管理、设置页面全部正常

---

### v2.3 ElectronAPI 分层重构 (Phase 14)

**Goal**: 将 LocalWallpaper 和 OnlineWallpaper 中的 window.electronAPI 调用重构为符合 service → repository → client → electronAPI 的分层架构

#### Phase 14: ElectronAPI Layer Refactor

**Requirements**: EAPI-01, EAPI-02

**Goal**: 重构 window.electronAPI 直接调用，建立完整的分层架构

**Files**: `LocalWallpaper.vue`, `OnlineWallpaper.vue`

**Changes**:
- 分析 LocalWallpaper.vue 中所有 `window.electronAPI` 调用
- 分析 OnlineWallpaper.vue 中所有 `window.electronAPI` 调用
- 创建或扩展现有的 client 层封装 electronAPI 调用
- 创建或扩展现有的 repository 层处理数据逻辑
- 创建或扩展现有的 service 层提供业务接口
- 迁移 views 中的直接调用到 service 层

**Success Criteria**:
1. LocalWallpaper.vue 无直接 `window.electronAPI` 调用
2. OnlineWallpaper.vue 无直接 `window.electronAPI` 调用
3. 分层架构完整：view → service → repository → client → electronAPI
4. 所有现有功能行为不变
5. TypeScript 编译通过

**Depends on**: None

**Plans**:
- [x] Plan 1: 扩展 Repository 层 (Wave 1)
- [x] Plan 2: 扩展 Service 层 (Wave 2)
- [x] Plan 3: 创建 useWallpaperSetter Composable (Wave 3)
- [x] Plan 4: 创建 useLocalFiles Composable (Wave 3)
- [x] Plan 5: 扩展 useSettings Composable (Wave 3)
- [x] Plan 6: 迁移 Views (Wave 4)

---

### v2.4 ImagePreview 导航功能 (Phase 15)

**Goal**: 为 ImagePreview 组件添加上一张/下一张切换功能

**Status**: ✅ Complete (shipped 2026-04-27)

#### Phase 15: ImagePreview Navigation

**Requirements**: NAV-01

**Goal**: 添加图片预览导航功能

**Files**: `ImagePreview.vue`, `LocalWallpaper.vue`, `OnlineWallpaper.vue`

**Changes**:
- 添加上一张/下一张导航按钮
- 添加键盘快捷键支持
- 确保导航状态正确同步

**Success Criteria**:
1. ✅ 用户可以在预览模式下切换到上一张/下一张图片
2. ✅ 支持键盘左右箭头快捷操作
3. ✅ 导航按钮 UI 与现有设计风格一致
4. ✅ 所有现有功能行为不变

**Depends on**: None

**Plans**:
- [x] Plan 1: ImagePreview 组件增强 + Views 集成

---

## v2.5 壁纸收藏功能 (Phases 16-21)

**Goal**: Add local favorites system with custom collections support

**Status**: 🔄 In Progress

---

### Phase 16: Data Layer Foundation

**Requirements**: PERS-02, COLL-04

**Goal**: Establish type definitions, storage constants, and repository layer for favorites persistence.

**Tasks**:
1. Define Types (`src/types/favorite.ts`) — Collection, FavoriteItem, FavoritesData interfaces
2. Add Storage Constants (`src/clients/constants.ts`) — FAVORITES_DATA key
3. Create Favorites Repository (`src/repositories/favorites.repository.ts`) — CRUD operations
4. Export Repository (`src/repositories/index.ts`)

**Success Criteria**:
1. Given no existing data, when app starts, then a default "Favorites" collection is created automatically
2. Given the repository, when `getCollections()` is called, then it returns an array of Collection objects
3. Given the repository, when `createCollection('动漫')` is called, then a new collection with name '动漫' is persisted
4. Given the repository, when attempting to delete the default collection, then the operation returns an error

**Plans**: — (to be defined)

---

### Phase 17: Business Layer (Service)

**Requirements**: PERS-01, PERS-03

**Goal**: Implement business logic for collections and favorites management with error handling.

**Tasks**:
1. Create Collections Service (`src/services/collections.service.ts`)
2. Create Favorites Service (`src/services/favorites.service.ts`)
3. Export Services (`src/services/index.ts`)

**Success Criteria**:
1. Given the service, when `create('风景')` is called, then a collection named '风景' is created and persisted
2. Given a storage error, when any operation is performed, then a user-friendly error message is returned
3. Given app restart, when `getAll()` is called, then previously saved collections and favorites are returned
4. Given a wallpaper added to collection, when `isFavorite(wallpaperId)` is called, then it returns true

**Plans**: — (to be defined)

---

### Phase 18: Composable Layer

**Requirements**: COLL-05, FAV-05, FAV-06

**Goal**: Create Vue composables for reactive state management of collections and favorites.

**Tasks**:
1. Create useCollections Composable (`src/composables/favorites/useCollections.ts`)
2. Create useFavorites Composable (`src/composables/favorites/useFavorites.ts`)
3. Export Composables (`src/composables/index.ts`)

**Success Criteria**:
1. Given a Vue component, when `useFavorites()` is called, then reactive favorites state is available
2. Given favorites loaded, when `isFavorite(wallpaperId)` is called, then result is returned in O(1) time
3. Given a wallpaper in multiple collections, when `getCollectionsForWallpaper(id)` is called, then all collection names are returned
4. Given add/remove operations, when completed, then `favoriteIds` Set is automatically updated

**Plans**: — (to be defined)

---

### Phase 19: Collections Management UI

**Requirements**: COLL-01, COLL-02, COLL-03, COLL-04

**Goal**: Implement UI for creating, renaming, and deleting collections.

**Tasks**:
1. Add Favorites Route (`src/router/index.ts`)
2. Create FavoritesPage Base (`src/views/FavoritesPage.vue`)
3. Create Collection Management Components (modals for create/rename/delete)
4. Wire Up Collection Operations (sidebar with collection list)
5. Add Navigation Entry (`src/views/Main.vue`)

**Success Criteria**:
1. Given the favorites page, when user clicks "Create Collection" button, then a modal appears allowing name input
2. Given a non-default collection, when user clicks delete, then a confirmation dialog appears
3. Given the default "Favorites" collection, when user hovers, then no delete option is shown
4. Given the sidebar, when user views collections, then all collections are listed with favorite counts

**Plans**: — (to be defined)

---

### Phase 20: Favorites Operations UI

**Requirements**: FAV-01, FAV-02, FAV-03, FAV-04

**Goal**: Implement UI for adding, removing, and moving wallpapers between collections.

**Tasks**:
1. Add Favorite Button to Wallpaper Cards (`src/components/WallpaperList.vue`)
2. Add Favorite Button to Image Preview (`src/components/ImagePreview.vue`)
3. Create Add To Collection Modal (`src/components/favorites/AddToCollectionModal.vue`)
4. Create Move To Collection Modal (`src/components/favorites/MoveToCollectionModal.vue`)
5. Add Favorite Indicator (`src/components/WallpaperList.vue`)
6. Wire Up Favorites Logic in OnlineWallpaper (`src/views/OnlineWallpaper.vue`)

**Success Criteria**:
1. Given a wallpaper card, when user clicks the favorite icon, then a collection selector appears
2. Given a wallpaper in preview, when user clicks favorite button, then a dropdown shows available collections
3. Given a favorited wallpaper, when user clicks remove, then it is removed from the selected collection
4. Given a wallpaper in one collection, when user selects "Move to", then it moves to the new collection

**Plans**: — (to be defined)

---

### Phase 21: Favorites Browsing UI

**Requirements**: BROW-01, BROW-02, BROW-03, BROW-04, BROW-05

**Goal**: Implement complete favorites browsing experience with filtering and download capabilities.

**Tasks**:
1. Implement Favorites Grid (`src/views/FavoritesPage.vue`)
2. Implement Collection Filtering
3. Add Collection Badge on Wallpapers
4. Add Download Capability
5. Implement Empty States
6. Add Navigation Integration

**Success Criteria**:
1. Given the favorites page, when user clicks a collection in sidebar, then only wallpapers from that collection are shown
2. Given a favorited wallpaper card, when viewed, then a badge shows which collection(s) it belongs to
3. Given a favorite wallpaper, when user clicks download, then the download starts using existing download flow
4. Given an empty collection, when user views it, then a helpful empty state message is displayed
5. Given the main navigation, when user clicks "我的收藏", then the favorites page is shown

**Plans**: — (to be defined)

---

## Requirements Coverage Matrix (v2.5)

| Requirement | Phase | Description |
|-------------|-------|-------------|
| **COLL-01** | 19 | Create new collection with custom name |
| **COLL-02** | 19 | Rename existing collection |
| **COLL-03** | 19 | Delete collection with confirmation |
| **COLL-04** | 16, 19 | Default "Favorites" collection (non-deletable) |
| **COLL-05** | 18, 19 | View list of all collections |
| **FAV-01** | 20 | Add wallpaper to collection from card |
| **FAV-02** | 20 | Add wallpaper to collection from preview |
| **FAV-03** | 20 | Remove wallpaper from collection |
| **FAV-04** | 20 | Move wallpaper between collections |
| **FAV-05** | 18, 20 | Favorite indicator on wallpapers |
| **FAV-06** | 18, 20 | Wallpaper in multiple collections |
| **BROW-01** | 19, 21 | Access favorites page from navigation |
| **BROW-02** | 21 | View wallpapers in selected collection |
| **BROW-03** | 21 | Filter wallpapers by collection |
| **BROW-04** | 21 | See which collection(s) wallpaper belongs to |
| **BROW-05** | 21 | Download favorited wallpapers |
| **PERS-01** | 17 | Persist across app restarts |
| **PERS-02** | 16 | Store locally with electron-store |
| **PERS-03** | 17 | Handle storage errors gracefully |

**Coverage:** 19/19 requirements (100%)

---

## Dependencies

```
Phase 16 (Data Layer)
    │
    ▼
Phase 17 (Business Layer)
    │
    ▼
Phase 18 (Composable Layer)
    │
    ├─────────────┐
    ▼             ▼
Phase 19      Phase 20
(Collections UI) (Favorites UI)
    │             │
    └──────┬──────┘
           ▼
       Phase 21 (Browsing UI)
```

---

## Progress

| Phase | Name | Milestone | Plans Complete | Status | Completed |
|-------|------|-----------|----------------|--------|-----------|
| 1 | 基础设施与类型安全 | v2.0 | 6/6 | Complete | 2025-04-25 |
| 2 | 数据层抽象 | v2.0 | 8/8 | Complete | 2025-04-25 |
| 3 | 业务层与组合层 | v2.0 | 8/8 | Complete | 2025-04-25 |
| 4 | IPC 模块化重构 | v2.0 | 6/6 | Complete | 2026-04-26 |
| 5 | 表现层重构与清理 | v2.0 | 7/7 | Complete | 2026-04-26 |
| 6 | Core Resume Infrastructure | v2.1 | 9/9 | Complete | 2026-04-26 |
| 7 | Main Process Implementation | v2.1 | 4/4 | Complete | 2026-04-26 |
| 8 | Renderer Integration | v2.1 | 5/5 | Complete | 2026-04-26 |
| 9 | Error Handling & Edge Cases | v2.1 | 3/3 | Complete | 2026-04-27 |
| 10 | Simple Substitutions | v2.2 | 2/2 | Complete | 2026-04-27 |
| 11 | OnlineWallpaper Migration | v2.2 | 1/5 | Complete | 2026-04-27 |
| 12 | SettingPage Migration | v2.2 | 2/2 | Complete | 2026-04-27 |
| 13 | Verification & Enforcement | v2.2 | 3/3 | Complete | 2026-04-27 |
| 14 | ElectronAPI Layer Refactor | v2.3 | 6/6 | Complete | 2026-04-27 |
| 15 | ImagePreview Navigation | v2.4 | 1/1 | Complete | 2026-04-27 |
| 16 | Data Layer Foundation | v2.5 | 2/2 | Complete | 2026-04-28 |
| 17 | Business Layer (Service) | v2.5 | 2/2 | Complete | 2026-04-28 |
| 18 | Composable Layer | v2.5 | 0/3 | Pending | — |
| 19 | Collections Management UI | v2.5 | 0/5 | Pending | — |
| 20 | Favorites Operations UI | v2.5 | 0/6 | Pending | — |
| 21 | Favorites Browsing UI | v2.5 | 0/6 | Pending | — |

---

*创建时间：2025-04-25*
*最后更新：2026-04-28 v2.5 roadmap created*
