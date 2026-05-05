# Feature Research

**Domain:** 虚拟列表 + 无限滚动
**Researched:** 2026-05-06
**Confidence:** HIGH

## Feature Landscape

### Table Stakes (Users Expect These)

虚拟列表应用中，用户认为理所当然的功能。缺少这些会让产品感觉不完整。

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| 平滑滚动 | 滚动体验是核心价值 | LOW | vue-virtual-scroller 内置优化 |
| 加载更多 | 用户期望无限滚动 | MEDIUM | 需要检测滚动到底部 |
| 保持列表位置 | 切换页面后回到原位置 | MEDIUM | 本次里程碑不实现 |
| 加载状态提示 | 用户需要知道正在加载 | LOW | 简单的 loading spinner |

### Differentiators (Competitive Advantage)

让产品脱颖而出的功能。非必需，但有价值。

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| 动态高度支持 | 壁纸卡片高度可变 | MEDIUM | DynamicScroller |
| 预加载优化 | 提前加载下一页 | MEDIUM | 提升用户体验 |
| 滚动位置恢复 | 刷新后回到原位置 | HIGH | 本次里程碑不实现 |
| 缓存渲染状态 | 快速回滚到已浏览内容 | HIGH | 需要 store 支持 |

### Anti-Features (Commonly Requested, Often Problematic)

看起来很好但会产生问题的功能。

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| 完全保持滚动位置 | 用户体验连续性 | 增加状态复杂度，内存占用 | 简化为不保持（本次） |
| 虚拟列表内搜索 | 快速筛选 | 虚拟列表不支持原地搜索 | 重置列表+重新加载 |
| 平滑滚动动画 | 视觉效果好 | 可能影响虚拟列表性能 | 依赖库的默认行为 |

## Feature Dependencies

```
虚拟列表渲染
    └──requires──> vue-virtual-scroller 集成

无限滚动加载
    ├──requires──> 滚动到底部检测
    ├──requires──> 分页数据加载
    └──requires──> 加载状态管理

多选功能
    └──requires──> 虚拟列表支持选中状态
                       └──requires──> key-field 正确配置

hover 交互
    └──requires──> 虚拟列表内事件代理
```

### Dependency Notes

- **无限滚动 requires 滚动到底部检测:** 使用 VueUse 的 useIntersectionObserver
- **无限滚动 requires 分页数据加载:** 现有 API 支持分页
- **多选功能 requires 虚拟列表支持选中状态:** RecycleScroller 支持任意 Vue 组件

## MVP Definition

### Launch With (v1.1)

虚拟列表实现的最小可行产品。

- [ ] vue-virtual-scroller 集成 — 虚拟列表基础功能
- [ ] 在线壁纸页虚拟列表 — 替换现有分页
- [ ] 收藏页虚拟列表 — 替换现有分页
- [ ] 无限滚动加载 — 滚动到底自动加载
- [ ] 多选功能兼容 — 保持现有功能
- [ ] hover 交互兼容 — 保持现有功能

### Add After Validation (v1.x)

核心功能验证后添加。

- [ ] 加载状态优化 — 更优雅的 loading 提示
- [ ] 错误处理 — 加载失败的提示和重试
- [ ] 性能监控 — 检测虚拟列表性能

### Future Consideration (v2+)

产品市场契合后考虑。

- [ ] 滚动位置保持 — 刷新后恢复位置
- [ ] 预加载优化 — 提前加载下一页
- [ ] 动态高度支持 — 壁纸卡片高度可变

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| 虚拟列表基础渲染 | HIGH | MEDIUM | P1 |
| 无限滚动加载 | HIGH | LOW | P1 |
| 多选功能兼容 | HIGH | MEDIUM | P1 |
| hover 交互兼容 | MEDIUM | LOW | P1 |
| 加载状态提示 | MEDIUM | LOW | P2 |
| 错误处理 | MEDIUM | LOW | P2 |
| 滚动位置保持 | LOW | HIGH | P3 |
| 预加载优化 | LOW | MEDIUM | P3 |

**Priority key:**
- P1: 必须实现（本次里程碑）
- P2: 应该实现（如果时间允许）
- P3: 未来考虑

## Competitor Feature Analysis

| Feature | 传统分页 | 虚拟列表 | Our Approach |
|---------|----------|----------|--------------|
| 渲染方式 | 全部渲染 | 只渲染可见 | 虚拟列表 |
| 加载方式 | 手动翻页 | 自动加载 | 无限滚动 |
| 性能 | 大量数据卡顿 | 流畅 | 流畅 |
| 用户体验 | 需要点击 | 自动 | 自动 |

## Sources

- vue-virtual-scroller GitHub Issues — 常见问题和最佳实践
- VueUse 文档 — 无限滚动实现模式
- 现有代码库 — OnlineWallpaper.vue, Favorites.vue

---
*Feature research for: 虚拟列表 + 无限滚动*
*Researched: 2026-05-06*
