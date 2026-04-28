# Phase 19: Collections Management UI - Context

**Gathered:** 2026-04-28
**Status:** Ready for planning
**Mode:** --auto (autonomous)

<domain>
## Phase Boundary

Implement UI for creating, renaming, and deleting collections. This is the presentation layer that exposes the collections management capabilities built in Phases 16-18.

**核心交付物：**
1. Favorites Route (`src/router/index.ts`) — 路由配置
2. FavoritesPage Base (`src/views/FavoritesPage.vue`) — 收藏页面骨架
3. Collection Management Components — 创建/重命名/删除收藏夹的模态框组件
4. Sidebar with Collection List — 展示所有收藏夹的侧边栏
5. Navigation Entry (`src/Main.vue`) — 添加"我的收藏"导航入口

**需求覆盖：** COLL-01, COLL-02, COLL-03, COLL-04, COLL-05, BROW-01

**阶段边界：**
- 仅创建收藏夹管理 UI（创建、重命名、删除）
- 创建收藏页面骨架和导航入口
- 不实现收藏操作（添加/移除壁纸）— Phase 20
- 不实现收藏浏览（查看收藏的壁纸）— Phase 21
- 依赖 Phase 16-18 的数据层、服务层、组合层

**当前状态：**
- ✅ Phase 16 完成 — favoritesRepository 已实现
- ✅ Phase 17 完成 — collectionsService 和 favoritesService 已实现
- ✅ Phase 18 完成 — useCollections 和 useFavorites composables 已实现
- ✅ 类型定义完成 — Collection, FavoriteItem
- ❌ 无收藏相关路由和页面
- ❌ 无收藏夹管理组件

</domain>

<decisions>
## Implementation Decisions

### Navigation Structure (BROW-01)

- **D-01:** 在左侧菜单添加"我的收藏"导航入口
  - 位置：在"下载中心"和"设置"之间
  - 图标：使用 `fa-heart` 或 `fa-star` 表示收藏
  - 路由路径：`/favorites`
  - 理由：与现有导航风格一致；收藏是核心功能，应显眼

- **D-02:** 路由配置添加 `/favorites` 路由
  ```typescript
  {
    path: '/favorites',
    name: 'FavoritesPage',
    component: () => import('@/views/FavoritesPage.vue'),
    meta: {
      title: '我的收藏',
      icon: 'fas fa-heart',
    },
  }
  ```

### Page Layout (COLL-05)

- **D-03:** FavoritesPage 采用左右分栏布局
  - 左侧：收藏夹列表侧边栏（200px 宽）
  - 右侧：壁纸展示区域（Phase 21 实现）
  - 理由：与现有页面风格一致；常见收藏管理 UI 模式

- **D-04:** 侧边栏展示收藏夹列表
  - 每个收藏夹项显示：名称 + 收藏数量
  - 默认收藏夹有特殊标识（星标或图标）
  - 点击收藏夹切换当前选中（Phase 21 用于过滤）
  - 理由：用户需要快速了解收藏夹内容量；默认收藏夹需要视觉区分

### Collection CRUD Modals (COLL-01, COLL-02, COLL-03)

- **D-05:** 创建收藏夹模态框
  - 输入：收藏夹名称（必填，最长 20 字符）
  - 验证：名称不能为空，不能重复
  - 操作：创建 / 取消
  - 理由：简单直观的创建流程

- **D-06:** 重命名收藏夹模态框
  - 输入：新名称（预填充当前名称）
  - 验证：名称不能为空，不能重复
  - 操作：保存 / 取消
  - 理由：编辑场景需要预填充

- **D-07:** 删除收藏夹确认对话框
  - 使用 `window.confirm` 或自定义确认弹窗
  - 消息：`确定要删除收藏夹 "{name}" 吗？收藏的壁纸将从该收藏夹移除。`
  - 默认收藏夹不显示删除选项
  - 理由：删除是破坏性操作，需要确认；与 SettingPage 的确认模式一致

### Default Collection Handling (COLL-04)

- **D-08:** 默认收藏夹 UI 特殊处理
  - 显示特殊图标（如星标）
  - 不显示删除按钮/选项
  - 名称可修改（但不建议删除提示）
  - 理由：Success criteria 要求默认收藏夹无删除选项

### Sidebar Interaction

- **D-09:** 侧边栏顶部工具栏
  - "新建收藏夹"按钮
  - 收藏夹列表
  - 理由：新建操作应显眼且易访问

- **D-10:** 收藏夹项悬停操作
  - 悬停显示：重命名、删除按钮（非默认收藏夹）
  - 默认收藏夹只显示重命名按钮
  - 理由：操作按钮节省空间，悬停显示不干扰浏览

### Empty States

- **D-11:** 无收藏夹时的空状态
  - 消息："还没有收藏夹，点击上方按钮创建"
  - 理由：引导用户开始使用

### Component Organization

- **D-12:** 组件文件结构
  ```
  src/
  ├── views/
  │   └── FavoritesPage.vue       # 收藏页面主组件
  ├── components/
  │   └── favorites/
  │       ├── CollectionSidebar.vue    # 收藏夹侧边栏
  │       ├── CollectionItem.vue       # 单个收藏夹项
  │       ├── CreateCollectionModal.vue # 创建模态框
  │       └── RenameCollectionModal.vue # 重命名模态框
  ```

### Claude's Discretion

- 模态框的具体样式和动画效果
- 收藏夹图标的最终选择（heart vs star）
- 空状态的具体文案和图标
- 收藏数量的加载时机（初始加载 vs 懒加载）
- 组件是否需要抽离更多子组件

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 项目规划
- `.planning/PROJECT.md` — 项目核心价值、约束条件（UI不变原则）
- `.planning/REQUIREMENTS.md` — COLL-01~05, BROW-01 详细需求
- `.planning/ROADMAP.md` — Phase 19 定义和成功标准

### 前置阶段上下文
- `.planning/phases/16-data-layer-foundation/16-CONTEXT.md` — Repository 层设计
- `.planning/phases/17-business-layer-service/17-CONTEXT.md` — Service 层设计
- `.planning/phases/18-composable-layer/18-CONTEXT.md` — Composable 层设计

### 代码库分析
- `.planning/codebase/ARCHITECTURE.md` — 现有架构、分层结构

### 关键代码文件（现有模式参考）

#### 导航和路由模式
- `src/Main.vue` — 左侧菜单导航结构
- `src/router/index.ts` — 路由配置模式

#### 页面和组件模式
- `src/views/OnlineWallpaper.vue` — 页面组件模式、Alert 使用
- `src/views/SettingPage.vue` — 表单页面模式、确认对话框模式
- `src/components/WallpaperList.vue` — 列表组件模式

#### 现有 UI 组件
- `src/components/Alert.vue` — 提示框组件
- `src/components/ImagePreview.vue` — 模态/遮罩层模式
- `src/components/LoadingOverlay.vue` — 加载遮罩层

#### Composables（Phase 18 交付物）
- `src/composables/favorites/useCollections.ts` — 收藏夹状态管理
- `src/composables/favorites/useFavorites.ts` — 收藏项状态管理

#### 类型定义
- `src/types/favorite.ts` — Collection, FavoriteItem 接口

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

#### Main.vue 导航模式
```vue
<!-- src/Main.vue -->
<div class="menu-wrap">
  <label class="menu-title">我的壁纸</label>
  <ul class="menu-ul">
    <li class="menu-item">
      <router-link to="/online" class="menu-native">
        <i class="fas fa-cloud" />
        在线壁纸<span class="li-border" />
      </router-link>
    </li>
    <!-- ... more items -->
  </ul>
</div>
```

#### Router 配置模式
```typescript
// src/router/index.ts
{
  path: '/favorites',
  name: 'FavoritesPage',
  component: () => import('@/views/FavoritesPage.vue'),
  meta: {
    title: '我的收藏',
    icon: 'fas fa-heart',
  },
}
```

#### Alert 组件使用
```vue
<!-- 在页面中使用 Alert -->
<Alert
  v-if="alert.visible"
  :type="alert.type"
  :message="alert.message"
  :duration="alert.duration"
  @close="hideAlert"
/>
```

#### 确认对话框模式
```typescript
// SettingPage.vue 中的确认模式
const confirmed = window.confirm('确定要恢复默认设置吗？')
if (!confirmed) return
```

#### useCollections Composable（Phase 18 已实现）
```typescript
// 预期返回值
interface UseCollectionsReturn {
  collections: ComputedRef<Collection[]>
  loading: ComputedRef<boolean>
  error: ComputedRef<string | null>
  load: () => Promise<void>
  create: (name: string) => Promise<boolean>
  rename: (id: string, name: string) => Promise<boolean>
  delete: (id: string) => Promise<boolean>
  getById: (id: string) => Collection | undefined
  getDefault: () => Collection | undefined
}
```

### Established Patterns

- **导航样式**：左侧固定菜单（180px），使用 `router-link-active` 类高亮当前页
- **页面布局**：KeepAlive 缓存路由组件，避免重复渲染
- **错误处理**：使用 `useAlert` composable 统一管理提示
- **模态/遮罩层**：使用 fixed 定位 + z-index 999 + 渐变动画
- **确认对话框**：使用原生 `window.confirm` 或自定义组件
- **组件命名**：PascalCase，多词组件名

### Integration Points

- `src/router/index.ts` — 添加 `/favorites` 路由
- `src/Main.vue` — 添加"我的收藏"导航项
- `src/views/FavoritesPage.vue` — 新建页面组件
- `src/components/favorites/` — 新建收藏相关组件目录
- `src/composables/index.ts` — 确认导出 useCollections

</code_context>

<specifics>
## Specific Ideas

- 收藏夹图标建议使用 `fa-heart`（心形），更符合"收藏"语义
- 侧边栏宽度与 Main.vue 左侧菜单一致（180px 或稍窄）
- 模态框样式可参考 ImagePreview 的遮罩层模式
- 确认删除时提示收藏数量，让用户了解影响范围

</specifics>

<deferred>
## Deferred Ideas

None — 本阶段为收藏夹管理 UI，功能明确。

### 后续阶段

- Phase 20: Favorites Operations UI — 添加/移除/移动收藏操作
- Phase 21: Favorites Browsing UI — 收藏浏览、过滤、下载

</deferred>

---

*Phase: 19-collections-management-ui*
*Context gathered: 2026-04-28 (auto mode)*
