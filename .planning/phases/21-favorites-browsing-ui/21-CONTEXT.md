# Phase 21: Favorites Browsing UI - Context

**Gathered:** 2026-04-28
**Status:** Ready for planning
**Mode:** --auto (autonomous)

<domain>
## Phase Boundary

Implement complete favorites browsing experience with filtering, collection badges, download capabilities, and polished empty states. This is the final presentation layer that delivers the browsing half of the favorites system.

**核心交付物：**
1. Favorites Grid (`src/views/FavoritesPage.vue`) — 升级为完整壁纸网格展示
2. Collection Filtering — 按收藏夹过滤壁纸（侧边栏选择已在 Phase 19 实现）
3. Collection Badge on Wallpapers — 显示壁纸所属收藏夹
4. Download Capability — 从收藏页下载壁纸
5. Empty States — 完善空状态显示
6. Navigation Integration — 确保导航和路由完整

**需求覆盖：** BROW-01, BROW-02, BROW-03, BROW-04, BROW-05

**阶段边界：**
- 仅实现收藏浏览 UI（查看、过滤、下载）
- 升级 FavoritesPage 的壁纸展示区域（Phase 19 只创建了骨架）
- 不修改收藏操作 UI（添加/移除/移动）— Phase 20 已完成
- 依赖 Phase 16-20 的全部成果

**当前状态：**
- ✅ Phase 16-20 完成 — 数据层、服务层、组合层、收藏夹管理 UI、收藏操作 UI 全部实现
- ✅ FavoritesPage 骨架存在 — 左右分栏布局，侧边栏可选择收藏夹
- ✅ 基础过滤逻辑存在 — `filteredFavorites` computed 已实现
- ✅ 简单图片展示存在 — 使用 `favorite-item` div 显示缩略图
- ❌ 壁纸网格不完整 — 缺少壁纸操作（下载、预览、设为壁纸）
- ❌ 无收藏夹徽章 — 不显示壁纸所属收藏夹信息
- ❌ 无下载功能 — 收藏页无法下载壁纸
- ❌ 空状态不完善 — 需要优化

</domain>

<decisions>
## Implementation Decisions

### Favorites Grid Upgrade (BROW-02)

- **D-01:** 在 FavoritesPage 中重用 WallpaperList 组件的卡片样式
  - 不直接复用 WallpaperList 组件（它耦合了在线搜索的分页、选择、API 等逻辑）
  - 而是在 FavoritesPage 中创建独立的收藏壁纸网格，复用相同的卡片布局和样式
  - 收藏壁纸卡片需要：缩略图、壁纸信息（分辨率、类别）、操作按钮
  - 理由：WallpaperList 与在线搜索逻辑强耦合；收藏场景需要不同的交互（无分页、无搜索）

- **D-02:** 收藏壁纸卡片结构
  ```
  ┌─────────────────────────┐
  │ ♥ 收藏夹徽章            │  ← 显示所属收藏夹
  │                         │
  │      [壁纸缩略图]        │
  │                         │
  ├─────────────────────────┤
  │ 📐 分辨率  | ⬇ 下载     │  ← 底部信息栏
  └─────────────────────────┘
  ```
  - 理由：与在线壁纸卡片风格一致，但增加收藏夹徽章；底部信息栏提供快速操作

### Collection Filtering (BROW-03)

- **D-03:** 通过侧边栏选择收藏夹过滤（已实现）
  - Phase 19 已实现 `handleCollectionSelect` 和 `filteredFavorites`
  - 添加"全部收藏"选项，显示所有收藏夹中的壁纸
  - 理由：侧边栏选择是直观的过滤方式；"全部收藏"提供聚合视图

- **D-04:** 收藏夹排序
  - 默认按添加时间倒序（最新在前）
  - 理由：用户最关心最近收藏的壁纸

### Collection Badge on Wallpapers (BROW-04)

- **D-05:** 壁纸卡片上显示收藏夹徽章
  - 在卡片左上角显示心形图标 + 收藏夹数量角标
  - 悬停时显示收藏夹名称列表（tooltip）
  - 使用 `useFavorites().getCollectionsForWallpaper(wallpaperId)` 获取收藏夹名称
  - 理由：Phase 20 的 `favorite-indicator` 已在 WallpaperList 中实现；收藏页需要更详细的徽章信息

- **D-06:** 在预览模式下显示收藏夹信息
  - 点击收藏壁纸打开 ImagePreview 时，在侧边栏显示所属收藏夹列表
  - 理由：预览是查看详情的场景，收藏夹归属是重要信息

### Download Capability (BROW-05)

- **D-07:** 复用现有下载流程
  - 收藏页的下载按钮调用与在线壁纸相同的下载逻辑
  - 使用 `useDownload().addTask()` 添加下载任务
  - 理由：避免重复实现下载逻辑；现有下载流程已完整（断点续传、进度追踪）

- **D-08:** 下载按钮位置
  - 壁纸卡片底部信息栏添加下载图标按钮
  - 与"设为壁纸"按钮并排
  - 理由：下载是高频操作，应易于访问；与在线壁纸卡片操作一致

### Empty States

- **D-09:** 完善 FavoritesPage 空状态
  - 无收藏夹：显示"还没有收藏夹，点击上方按钮创建"（Phase 19 已实现）
  - 空收藏夹：显示"这个收藏夹还没有壁纸，在在线壁纸页面点击心形图标添加"（Phase 19 已实现）
  - 全部收藏为空：显示"还没有收藏任何壁纸，去在线壁纸页面发现喜欢的壁纸吧"
  - 理由：引导用户操作，避免空白页面

### Component Organization

- **D-10:** 组件文件结构
  ```
  src/
  ├── views/
  │   └── FavoritesPage.vue        # 修改：升级壁纸网格展示
  ├── components/
  │   └── favorites/
  │       ├── CollectionSidebar.vue    # 现有，可能微调
  │       ├── CollectionItem.vue       # 现有
  │       ├── FavoriteWallpaperCard.vue # 新建：收藏壁纸卡片
  │       ├── CreateCollectionModal.vue # 现有
  │       ├── RenameCollectionModal.vue # 现有
  │       └── CollectionDropdown.vue   # 现有
  ```

- **D-11:** KeepAlive 缓存
  - 将 FavoritesPage 添加到 Main.vue 的 KeepAlive include 列表
  - 理由：避免切换页面后收藏状态丢失；与其他页面一致

### Navigation Integration (BROW-01)

- **D-12:** 导航和路由已完成
  - Phase 19 已添加 `/favorites` 路由和"我的收藏"导航项
  - BROW-01 的核心需求已在 Phase 19 实现
  - 本阶段确认路由和导航正常工作

### Claude's Discretion

- 收藏壁纸卡片的具体样式细节
- 空状态的具体文案和图标
- 收藏夹徽章的精确位置和样式
- "全部收藏"选项在侧边栏的位置
- 是否在收藏页添加壁纸预览功能（ImagePreview 集成）
- 收藏页是否支持壁纸删除/移除操作
- 卡片悬停效果和动画

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 项目规划
- `.planning/PROJECT.md` — 项目核心价值、约束条件（UI不变原则）
- `.planning/REQUIREMENTS.md` — BROW-01~05 详细需求
- `.planning/ROADMAP.md` — Phase 21 定义和成功标准

### 前置阶段上下文
- `.planning/phases/16-data-layer-foundation/16-CONTEXT.md` — Repository 层设计
- `.planning/phases/17-business-layer-service/17-CONTEXT.md` — Service 层设计
- `.planning/phases/18-composable-layer/18-CONTEXT.md` — Composable 层设计
- `.planning/phases/19-collections-management-ui/19-CONTEXT.md` — 收藏夹管理 UI 设计
- `.planning/phases/20-favorites-operations-ui/20-CONTEXT.md` — 收藏操作 UI 设计

### 代码库分析
- `.planning/codebase/ARCHITECTURE.md` — 现有架构、分层结构
- `.planning/codebase/CONVENTIONS.md` — 编码规范、组件模式
- `.planning/codebase/STRUCTURE.md` — 项目结构

### 关键代码文件（现有模式参考）

#### 现有收藏页面和组件（需修改/扩展）
- `src/views/FavoritesPage.vue` — 收藏页面主组件，需升级壁纸网格
- `src/components/favorites/CollectionSidebar.vue` — 收藏夹侧边栏
- `src/components/favorites/CollectionItem.vue` — 收藏夹项

#### 壁纸列表组件（样式参考）
- `src/components/WallpaperList.vue` — 在线壁纸列表，卡片样式参考
- `src/components/ImagePreview.vue` — 图片预览，下载和设为壁纸操作参考

#### 下载功能（复用）
- `src/composables/download/useDownload.ts` — 下载 composable
- `src/views/DownloadWallpaper.vue` — 下载中心页面

#### Composables（Phase 18 交付物）
- `src/composables/favorites/useFavorites.ts` — 收藏项状态管理
- `src/composables/favorites/useCollections.ts` — 收藏夹状态管理

#### 类型定义
- `src/types/favorite.ts` — Collection, FavoriteItem 接口
- `src/types/index.ts` — WallpaperItem 接口

#### 导航和路由
- `src/Main.vue` — KeepAlive 配置
- `src/router/index.ts` — 路由配置

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

#### FavoritesPage.vue 当前状态
```vue
<!-- 已有的基础结构 -->
<div class="favorites-page">
  <CollectionSidebar @select="handleCollectionSelect" />
  <div class="favorites-content">
    <!-- 无选择时的空状态 -->
    <div v-if="!selectedCollectionId" class="empty-content">...</div>
    <!-- 选中收藏夹后的内容 -->
    <div v-else class="collection-content">
      <div class="content-header">
        <h2>{{ selectedCollection?.name }}</h2>
        <span>{{ filteredFavorites.length }} 张壁纸</span>
      </div>
      <!-- 简单图片展示（需升级） -->
      <div v-for="favorite in filteredFavorites" class="favorite-item">
        <img :src="favorite.wallpaperData.thumbs?.small || favorite.wallpaperData.path" />
      </div>
    </div>
  </div>
</div>
```
- 需要将简单的 `favorite-item` div 升级为完整的壁纸卡片

#### WallpaperList.vue 卡片样式（参考）
```vue
<figure class="thumb" style="width:300px;height:200px">
  <!-- 收藏状态指示器 -->
  <div v-if="isFavorite(liItem.id)" class="favorite-indicator">
    <i class="fas fa-heart" />
  </div>
  <!-- 选择框 -->
  <div class="thumb-checkbox" @click.stop.prevent="toggleSelect(liItem.id)">
    <i v-if="isSelected(liItem.id)" class="fas fa-check check-icon" />
  </div>
  <!-- 设为壁纸按钮 -->
  <a class="thumb-btn thumb-btn-fav" @click.stop="emit('set-bg', liItem)">
    <i class="fas fa-fw fa-repeat-alt" />
  </a>
  <!-- 图片 -->
  <a class="thumb-img-link" @click.prevent="emit('preview', liItem)">
    <img :src="liItem.thumbs?.small" :alt="liItem.id" />
  </a>
  <!-- 信息栏 -->
  <figcaption class="thumb-info">
    <span class="thumb-resolution">{{ formatResolution(liItem.resolution) }}</span>
    <span class="thumb-category">{{ liItem.category }}</span>
  </figcaption>
</figure>
```

#### useFavorites Composable 可用方法
```typescript
// 已实现的方法，收藏页可直接使用
const {
  favorites,           // 所有收藏项
  favoriteIds,         // Set<string> O(1) 查询
  load,                // 加载收藏数据
  isFavorite,          // O(1) 判断是否收藏
  getCollectionsForWallpaper,  // 获取壁纸所属收藏夹名称
  getByCollection,     // 按收藏夹过滤
} = useFavorites()
```

#### useDownload Composable 下载方法
```typescript
// 可直接复用的下载流程
const { addTask } = useDownload()
// addTask(wallpaperData) → 添加下载任务
```

### Established Patterns

- **壁纸卡片样式**：300×200px，圆角，悬停效果，底部信息栏
- **下载流程**：useDownload().addTask() → 下载中心管理
- **预览流程**：emit('preview', wallpaperItem) → ImagePreview 打开
- **设为壁纸**：emit('set-bg', wallpaperItem) → electronAPI 调用
- **错误处理**：useAlert 统一管理提示
- **KeepAlive 缓存**：在 Main.vue 中缓存页面组件

### Integration Points

- `src/views/FavoritesPage.vue` — 主要修改文件，升级壁纸网格
- `src/Main.vue` — 添加 FavoritesPage 到 KeepAlive include 列表
- `src/components/favorites/FavoriteWallpaperCard.vue` — 新建收藏壁纸卡片组件
- `src/composables/download/useDownload.ts` — 复用下载逻辑
- `src/components/ImagePreview.vue` — 预览集成（可能需要微调）

</code_context>

<specifics>
## Specific Ideas

- 收藏壁纸卡片复用在线壁纸的 `thumb` 样式类，保持视觉一致
- 收藏夹徽章使用心形图标 + 数字角标，悬停显示收藏夹名称 tooltip
- "全部收藏"选项添加在侧边栏收藏夹列表顶部
- 下载按钮使用 `fa-download` 图标，与 ImagePreview 侧边栏一致
- 空状态使用现有 `empty-content` 样式，保持一致
- 收藏页的壁纸也支持预览功能（点击打开 ImagePreview）

</specifics>

<deferred>
## Deferred Ideas

None — 本阶段为收藏浏览 UI，功能明确。

### 后续阶段

- v2.5 里程碑完成后：收藏夹搜索、排序、批量操作等（见 REQUIREMENTS.md Future Requirements）

</deferred>

---

*Phase: 21-favorites-browsing-ui*
*Context gathered: 2026-04-28 (auto mode)*
