# Architecture Research

**Domain:** 虚拟列表架构设计
**Researched:** 2026-05-06
**Confidence:** HIGH

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        View Layer                             │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌──────────────────┐                 │
│  │ OnlineWallpaper  │  │   Favorites      │                 │
│  │     .vue         │  │     .vue         │                 │
│  └────────┬─────────┘  └────────┬─────────┘                 │
│           │                     │                             │
│           └──────────┬──────────┘                             │
│                      ▼                                        │
├─────────────────────────────────────────────────────────────┤
│              Virtual List Component Layer                     │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐    │
│  │              RecycleScroller                         │    │
│  │  - 虚拟滚动容器                                      │    │
│  │  - 只渲染可见区域的壁纸卡片                          │    │
│  └─────────────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────────────┤
│                    Composable Layer                          │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌──────────────────┐                 │
│  │ useInfiniteScroll│  │ useWallpaperList │                 │
│  │  - 滚动检测      │  │  - 列表管理      │                 │
│  │  - 加载触发      │  │  - 选中状态      │                 │
│  └──────────────────┘  └──────────────────┘                 │
├─────────────────────────────────────────────────────────────┤
│                      Store Layer                             │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌──────────────────┐                 │
│  │useWallpaperStore │  │useFavoritesStore │                 │
│  │  - 壁纸列表      │  │  - 收藏列表      │                 │
│  │  - 分页状态      │  │  - 分页状态      │                 │
│  └──────────────────┘  └──────────────────┘                 │
├─────────────────────────────────────────────────────────────┤
│                     Service Layer                            │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌──────────────────┐                 │
│  │ WallpaperService │  │ FavoritesService │                 │
│  │  - API 调用      │  │  - 本地存储      │                 │
│  └──────────────────┘  └──────────────────┘                 │
└─────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| RecycleScroller | 虚拟滚动容器，只渲染可见项 | vue-virtual-scroller |
| useInfiniteScroll | 检测滚动到底部，触发加载 | VueUse + Composable |
| WallpaperCard | 单个壁纸卡片组件 | 现有组件复用 |
| useWallpaperStore | 管理壁纸列表和分页状态 | Pinia Store |

## Recommended Project Structure

```
src/
├── components/
│   ├── WallpaperCard.vue        # 现有组件，复用
│   └── WallpaperVirtualList.vue # 新增：虚拟列表容器组件
├── composables/
│   ├── useInfiniteScroll.ts     # 新增：无限滚动逻辑
│   └── useWallpaperList.ts      # 现有或新增：列表管理
├── views/
│   ├── OnlineWallpaper.vue      # 修改：集成虚拟列表
│   └── Favorites.vue            # 修改：集成虚拟列表
└── main.ts                      # 修改：注册虚拟列表组件
```

### Structure Rationale

- **WallpaperVirtualList.vue:** 封装 RecycleScroller，提供统一接口
- **useInfiniteScroll.ts:** 复用无限滚动逻辑
- **修改 View 层:** 最小化改动，保持现有架构

## Architectural Patterns

### Pattern 1: 组件封装模式

**What:** 将 RecycleScroller 封装为 WallpaperVirtualList 组件
**When to use:** 多个页面需要虚拟列表时
**Trade-offs:** 增加一层抽象，但提高复用性

**Example:**
```vue
<!-- WallpaperVirtualList.vue -->
<template>
  <RecycleScroller
    :items="items"
    :item-size="itemSize"
    :buffer="buffer"
    key-field="id"
    @scroll-end="onScrollEnd"
  >
    <template #default="{ item }">
      <slot :item="item" />
    </template>
  </RecycleScroller>
</template>

<script setup lang="ts">
import { RecycleScroller } from 'vue-virtual-scroller'

interface Props {
  items: any[]
  itemSize?: number
  buffer?: number
}

const props = withDefaults(defineProps<Props>(), {
  itemSize: 200,
  buffer: 200
})

const emit = defineEmits<{
  'load-more': []
}>()

const onScrollEnd = () => {
  emit('load-more')
}
</script>
```

### Pattern 2: 无限滚动 Composable

**What:** 使用 Composable 封装无限滚动逻辑
**When to use:** 需要在多个页面复用无限滚动时
**Trade-offs:** 增加抽象，但提高代码复用

**Example:**
```typescript
// useInfiniteScroll.ts
import { useIntersectionObserver } from '@vueuse/core'
import { ref } from 'vue'

export function useInfiniteScroll(
  loadMore: () => Promise<void>,
  options: { threshold?: number } = {}
) {
  const sentinel = ref<HTMLElement>()
  const isLoading = ref(false)

  const { stop } = useIntersectionObserver(
    sentinel,
    async ([{ isIntersecting }]) => {
      if (isIntersecting && !isLoading.value) {
        isLoading.value = true
        await loadMore()
        isLoading.value = false
      }
    },
    { threshold: options.threshold ?? 0.1 }
  )

  return { sentinel, isLoading, stop }
}
```

### Pattern 3: Store 扩展模式

**What:** 在现有 Store 中添加分页状态管理
**When to use:** 现有 Store 已有部分逻辑时
**Trade-offs:** 保持现有架构，最小化改动

**Example:**
```typescript
// stores/modules/wallpaper.ts
export const useWallpaperStore = defineStore('wallpaper', {
  state: () => ({
    wallpapers: [] as Wallpaper[],
    page: 1,
    hasMore: true,
    loading: false
  }),
  actions: {
    async loadMore() {
      if (!this.hasMore || this.loading) return

      this.loading = true
      const newWallpapers = await wallpaperService.fetchWallpapers(this.page + 1)
      this.wallpapers.push(...newWallpapers)
      this.page++
      this.hasMore = newWallpapers.length > 0
      this.loading = false
    }
  }
})
```

## Data Flow

### Request Flow

```
[用户滚动到底部]
    ↓
[IntersectionObserver 检测]
    ↓
[useInfiniteScroll] → [Store.loadMore()]
    ↓
[Store] → [Service.fetchWallpapers(page)]
    ↓
[Service] → [API Client] → [Wallhaven API]
    ↓
[Store.wallpapers.push(...newData)]
    ↓
[RecycleScroller 自动渲染新数据]
```

### State Management

```
[Pinia Store]
    ↓ (reactive)
[WallpaperVirtualList] ← [RecycleScroller]
    ↓ (props)
[WallpaperCard] × N (仅可见项)
```

### Key Data Flows

1. **无限滚动加载:** IntersectionObserver → Store.loadMore() → API → Store 更新 → RecycleScroller 重新渲染
2. **选中状态管理:** WallpaperCard → Store.toggleSelect() → Store.selectedIds 更新
3. **hover 交互:** WallpaperCard → emit hover 事件 → 父组件处理

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-1000 张壁纸 | 当前架构足够，RecycleScroller 默认配置 |
| 1000-10000 张壁纸 | 增加 buffer 大小，优化 item-size 计算 |
| 10000+ 张壁纸 | 考虑分页缓存策略，限制内存中的壁纸数量 |

### Scaling Priorities

1. **First bottleneck:** 内存占用过多 — 限制 Store 中的壁纸数量，实现虚拟化
2. **Second bottleneck:** API 响应慢 — 实现预加载策略

## Anti-Patterns

### Anti-Pattern 1: 直接在 View 层处理滚动

**What people do:** 在 Vue 组件中直接监听 scroll 事件
**Why it's wrong:** 难以复用，性能差，难以测试
**Do this instead:** 使用 Composable 封装滚动逻辑

### Anti-Pattern 2: 忘记设置 key-field

**What people do:** 不设置 RecycleScroller 的 key-field 属性
**Why it's wrong:** 虚拟列表无法正确复用组件，导致性能问题
**Do this instead:** 设置 `key-field="id"` 或其他唯一标识

### Anti-Pattern 3: 不处理加载状态

**What people do:** 滚动到底部时立即触发加载，不检查 loading 状态
**Why it's wrong:** 导致重复加载，浪费资源
**Do this instead:** 添加 loading 状态检查

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Wallhaven API | 现有 Service 层 | 保持现有调用方式 |
| VueUse | useIntersectionObserver | 新增依赖 |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| View ↔ Composable | Props/Events | 保持现有模式 |
| Composable ↔ Store | Pinia Store | 扩展现有 Store |

## Sources

- vue-virtual-scroller 官方文档 — 架构最佳实践
- VueUse 文档 — IntersectionObserver 使用
- 现有代码库 — View/Composable/Service/Store 架构

---
*Architecture research for: 虚拟列表架构设计*
*Researched: 2026-05-06*
