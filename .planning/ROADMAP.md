# Roadmap: v1.1 虚拟列表优化

**Milestone:** v1.1 虚拟列表优化
**Created:** 2026-05-06
**Status:** Planning

## Overview

| Metric | Value |
|--------|-------|
| Total Phases | 3 |
| Total Requirements | 21 |
| Estimated Duration | 3-5 days |

---

## Phase 1: 虚拟列表基础集成

**Goal:** 集成 vue-virtual-scroller 并实现基础虚拟列表功能

**Requirements:** VIRT-01, VIRT-02, VIRT-03, VIRT-04, SCRL-01, SCRL-02, SCRL-03, SCRL-04

**Success Criteria:**
1. 用户可以在线壁纸页看到虚拟列表渲染的壁纸
2. 用户可以在收藏页看到虚拟列表渲染的壁纸
3. 滚动流畅，帧率保持 60fps
4. 滚动到底部时自动加载下一页
5. 加载时显示 loading 提示
6. 没有更多数据时停止加载

**Key Tasks:**
1. 安装 vue-virtual-scroller 和 @vueuse/core
2. 在 main.ts 中注册虚拟列表组件
3. 创建 WallpaperVirtualList.vue 组件
4. 修改 OnlineWallpaper.vue 集成虚拟列表
5. 修改 Favorites.vue 集成虚拟列表
6. 实现 useInfiniteScroll.ts composable
7. 扩展现有 Store 支持分页状态

---

## Phase 2: 多选和 hover 功能兼容

**Goal:** 确保多选和 hover 功能在虚拟列表中正常工作

**Requirements:** SEL-01, SEL-02, SEL-03, SEL-04, HOV-01, HOV-02, HOV-03

**Success Criteria:**
1. 用户可以在虚拟列表中多选壁纸
2. 滚动后选中状态保持
3. 选中的壁纸有视觉反馈
4. 可以取消选中
5. hover 显示操作按钮
6. hover 效果流畅无延迟

**Key Tasks:**
1. 确认选中状态存储在 Store 中（而非组件内部）
2. 修改 WallpaperCard 组件支持虚拟列表中的选中状态
3. 测试滚动后选中状态保持
4. 优化 hover 交互（使用 CSS :hover 或优化 JS 事件）
5. 测试快速 hover 移动

---

## Phase 3: 搜索筛选和批量操作

**Goal:** 完成搜索筛选功能和批量操作

**Requirements:** SRCH-01, SRCH-02, SRCH-03, BATCH-01, BATCH-02, BATCH-03

**Success Criteria:**
1. 搜索条件改变时重置虚拟列表
2. 筛选后显示正确结果
3. 清空搜索后恢复完整列表
4. 可以批量下载选中壁纸
5. 可以批量收藏/取消收藏
6. 批量操作后清空选中状态

**Key Tasks:**
1. 修改搜索逻辑，重置虚拟列表和分页状态
2. 测试搜索筛选功能
3. 确认批量操作按钮在虚拟列表中显示
4. 测试批量下载功能
5. 测试批量收藏功能
6. 添加清空选中状态的逻辑

---

## Phase Dependencies

```
Phase 1 (虚拟列表基础)
    ↓
Phase 2 (多选和 hover 兼容)
    ↓
Phase 3 (搜索筛选和批量操作)
```

---

## Risk Mitigation

| Risk | Mitigation | Phase |
|------|------------|-------|
| 动态高度导致滚动跳动 | 使用固定高度容器 | Phase 1 |
| 选中状态在滚动后丢失 | 确认状态存储在 Store | Phase 2 |
| 搜索后列表不更新 | 重置分页状态 | Phase 3 |

---

## Definition of Done

- [ ] 所有 21 个需求实现并验证
- [ ] 所有现有功能正常工作
- [ ] 性能测试通过（1000+ 壁纸流畅滚动）
- [ ] 代码审查完成
- [ ] 文档更新

---
*Roadmap created: 2026-05-06*
