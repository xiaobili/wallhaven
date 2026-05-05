# Stack Research

**Domain:** Vue 3 虚拟列表实现
**Researched:** 2026-05-06
**Confidence:** HIGH

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| vue-virtual-scroller | ^2.0.0 | 虚拟滚动组件 | Vue 3 生态最成熟的虚拟列表库，活跃维护，性能优秀 |
| @vueuse/core | ^10.0.0 | 组合式工具函数 | 提供无限滚动检测的 useIntersectionObserver 等工具 |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| vue-virtual-scroller | ^2.0.0 | RecycleScroller 组件 | 渲染大量列表项，只渲染可见区域 |
| @vueuse/core | ^10.0.0 | 滚动检测工具 | 检测滚动到底部触发加载更多 |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| Vue DevTools | 调试虚拟列表 | 检查虚拟列表渲染状态 |

## Installation

```bash
# 虚拟列表核心库
npm install vue-virtual-scroller

# VueUse 工具库（用于无限滚动检测）
npm install @vueuse/core

# 类型定义
npm install -D @types/vue-virtual-scroller
```

## vue-virtual-scroller 核心组件

### RecycleScroller

用于固定高度的列表项：

```vue
<template>
  <RecycleScroller
    :items="items"
    :item-size="200"
    :buffer="200"
    key-field="id"
  >
    <template #default="{ item }">
      <WallpaperCard :wallpaper="item" />
    </template>
  </RecycleScroller>
</template>
```

### DynamicScroller

用于动态高度的列表项：

```vue
<template>
  <DynamicScroller
    :items="items"
    :min-item-size="200"
    key-field="id"
  >
    <template #default="{ item, active }">
      <DynamicScrollerItem :item="item" :active="active">
        <WallpaperCard :wallpaper="item" />
      </DynamicScrollerItem>
    </template>
  </DynamicScroller>
</template>
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| vue-virtual-scroller | vue3-virtual-scroll-list | 轻量级需求，社区支持较少 |
| vue-virtual-scroller | 自己实现 | 需要完全自定义控制，有充足开发时间 |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| v-for 直接渲染大量数据 | DOM 节点过多导致卡顿 | vue-virtual-scroller |
| 第三方无限滚动库（非虚拟列表） | 仍然渲染所有 DOM 节点 | vue-virtual-scroller + 无限滚动逻辑 |

## Integration Points

### 与现有 Vue 3 + TypeScript 项目集成

```typescript
// main.ts
import { createApp } from 'vue'
import App from './App.vue'
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css'
import { RecycleScroller, DynamicScroller } from 'vue-virtual-scroller'

const app = createApp(App)
app.component('RecycleScroller', RecycleScroller)
app.component('DynamicScroller', DynamicScroller)
```

### 与 Pinia Store 集成

```typescript
// composables/useInfiniteScroll.ts
import { useWallpaperStore } from '@/stores/modules/wallpaper'
import { useIntersectionObserver } from '@vueuse/core'

export function useInfiniteScroll() {
  const store = useWallpaperStore()
  const scrollContainer = ref<HTMLElement>()

  const { stop } = useIntersectionObserver(
    scrollContainer,
    ([{ isIntersecting }]) => {
      if (isIntersecting && !store.loading) {
        store.loadMore()
      }
    },
    { threshold: 0.1 }
  )

  return { scrollContainer }
}
```

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| vue-virtual-scroller@2.x | Vue 3.x | Vue 2 使用 1.x 版本 |
| @vueuse/core@10.x | Vue 3.x | 需要 Vue 3.2+ |

## Sources

- vue-virtual-scroller 官方文档 — https://github.com/Akryum/vue-virtual-scroller
- VueUse 文档 — https://vueuse.org/core/useintersectionobserver/
- Vue 3 官方文档 — https://vuejs.org/

---
*Stack research for: Vue 3 虚拟列表实现*
*Researched: 2026-05-06*
