# Research Summary

**Domain:** Vue 3 虚拟列表 + 无限滚动实现
**Milestone:** v1.1 虚拟列表优化
**Researched:** 2026-05-06

## Executive Summary

本研究为 Wallhaven 壁纸浏览器的虚拟列表优化提供技术指导。核心方案是使用 **vue-virtual-scroller** 实现虚拟滚动，配合 **VueUse** 的 IntersectionObserver 实现无限滚动加载。

## Stack Additions

### 必需的新依赖

| Package | Version | Purpose |
|---------|---------|---------|
| vue-virtual-scroller | ^2.0.0 | 虚拟滚动核心库 |
| @vueuse/core | ^10.0.0 | IntersectionObserver 工具 |

### 安装命令

```bash
npm install vue-virtual-scroller @vueuse/core
npm install -D @types/vue-virtual-scroller
```

## Feature Table Stakes

### 必须实现的功能

1. **虚拟列表渲染**
   - 只渲染可见区域的壁纸卡片
   - 支持数千张壁纸流畅滚动
   - 保持现有功能（多选、hover、搜索筛选）

2. **无限滚动加载**
   - 滚动到底部自动加载下一页
   - 显示加载状态提示
   - 正确处理加载结束

3. **功能兼容**
   - 多选功能在虚拟列表中正常工作
   - hover 交互保持流畅
   - 搜索筛选功能正常

## Watch Out For

### 关键陷阱

1. **必须设置 key-field**
   ```vue
   <RecycleScroller key-field="id" ... />
   ```
   否则会导致卡片错乱和状态丢失

2. **动态高度处理**
   - 方案 A: 使用 DynamicScroller（推荐）
   - 方案 B: 为卡片设置固定高度容器

3. **多选状态管理**
   - 选中状态必须存储在 Pinia Store 中
   - 不能依赖组件内部状态

4. **加载状态检查**
   ```typescript
   if (loading.value || !hasMore.value) return
   ```
   避免重复加载和无意义请求

## Recommended Architecture

### 组件结构

```
WallpaperVirtualList.vue (新增)
  ├── RecycleScroller (vue-virtual-scroller)
  └── WallpaperCard (现有组件复用)
```

### Composable 结构

```
useInfiniteScroll.ts (新增)
  ├── useIntersectionObserver (VueUse)
  └── loadMore() (调用 Store)
```

### Store 扩展

```typescript
// 现有 Store 中添加
{
  state: {
    page: 1,
    hasMore: true,
    loading: false
  },
  actions: {
    async loadMore() { ... }
  }
}
```

## Implementation Priority

### Phase 1: 虚拟列表基础

1. 安装依赖并配置
2. 创建 WallpaperVirtualList 组件
3. 在线壁纸页集成虚拟列表
4. 实现无限滚动加载
5. 测试基础功能

### Phase 2: 功能兼容

1. 多选功能适配
2. hover 交互适配
3. 搜索筛选适配
4. 全面测试

### Phase 3: 优化和测试

1. 性能优化
2. 错误处理
3. 用户体验优化
4. 回归测试

## Success Criteria

### 性能指标

- [ ] 支持 1000+ 张壁纸流畅滚动
- [ ] 滚动帧率保持 60fps
- [ ] 内存占用合理（< 500MB for 5000 wallpapers）

### 功能指标

- [ ] 所有现有功能正常工作
- [ ] 无限滚动加载正确
- [ ] 多选功能稳定
- [ ] hover 交互流畅

## Next Steps

1. **定义详细需求** — 创建 REQUIREMENTS.md
2. **创建路线图** — 分解为具体阶段
3. **开始实施** — 按阶段执行

---

**Research Artifacts:**
- `.planning/research/STACK.md` — 技术栈研究
- `.planning/research/FEATURES.md` — 功能研究
- `.planning/research/ARCHITECTURE.md` — 架构研究
- `.planning/research/PITFALLS.md` — 陷阱研究
