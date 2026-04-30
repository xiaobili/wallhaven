# Roadmap: Wallhaven 壁纸浏览器 — v2.8 动画性能优化

> 创建时间：2026-04-30
> 最后更新：2026-04-30

---

## Milestones

- ✅ **v2.0 架构重构** — Phases 1-5 (shipped 2026-04-26)
- ✅ **v2.1 下载断点续传** — Phases 6-9 (shipped 2026-04-27)
- ✅ **v2.2 Store 分层迁移** — Phases 10-13 (shipped 2026-04-27)
- ✅ **v2.3 ElectronAPI 分层重构** — Phase 14 (shipped 2026-04-27)
- ✅ **v2.4 ImagePreview 导航功能** — Phase 15 (shipped 2026-04-27)
- ✅ **v2.5 壁纸收藏功能** — Phases 16-22 (shipped 2026-04-29)
- ✅ **v2.6 设置页缓存优化** — Phase 23 (shipped 2026-04-29)
- ✅ **v2.7 图片切换动画** — Phase 24 (shipped 2026-04-29)
- 🔄 **v2.8 动画性能优化** — Phases 25-28 (current)

---

## Current Milestone

🔄 **v2.8 动画性能优化** — Phases 25-28

**Goal:** 优化 ImagePreview 组件的动画性能，确保流畅 60fps 体验

---

## Phases

### Phase 25: Animation Infrastructure

**Goal:** 创建动画基础设施 — 共享 CSS 和 composable

**Depends on:** Phase 24 (ImagePreview Switch Animation)

**Requirements:** ARCH-01, ARCH-02

**Success Criteria:**
1. `src/static/css/animations.css` 文件创建，包含 GPU 优化的动画关键帧模板
2. `src/composables/animation/useImageTransition.ts` 文件创建，提供动画状态管理
3. composable 导出 reduced-motion 检测功能
4. 新文件通过 TypeScript 编译检查

**Plans:** 0/0

---

### Phase 26: Core Animation Optimization

**Goal:** 核心动画优化 — 移除 blur 滤镜，使用 GPU 加速属性

**Depends on:** Phase 25

**Requirements:** CORE-01, CORE-02, CORE-03, CORE-04, CORE-05

**Success Criteria:**
1. slide-in-blurred-left/right 动画移除 `filter: blur(40px)`
2. transform 简化为 `translateX(±50px) scale(0.98)`
3. 动画仅使用 `transform` 和 `opacity` 属性
4. 添加 `will-change: transform, opacity` 提示
5. `.img-view` 容器添加 `contain: layout paint`
6. 图片切换动画保持 60fps（Chrome DevTools 验证）

**Plans:** 0/0

---

### Phase 27: Preview Animation Optimization ✓

**Goal:** 优化预览窗口打开/关闭动画性能

**Depends on:** Phase 26

**Requirements:** PREV-01, PREV-02

**Success Criteria:**
1. blowUpModal 打开动画优化，移除性能瓶颈
2. blowUpModalTwo 关闭动画优化，与打开动画性能一致
3. 预览窗口打开/关闭保持 60fps
4. 动画视觉效果与原版相似（用户无感知差异）

**Plans:** 1/1 ✓ Complete (2026-04-30)

---

### Phase 28: Accessibility & Integration

**Goal:** 添加可访问性支持，完成 ImagePreview 重构

**Depends on:** Phase 27

**Requirements:** A11Y-01, A11Y-02, ARCH-03

**Success Criteria:**
1. 添加 `@media (prefers-reduced-motion: reduce)` 支持
2. reduced-motion 模式使用简单 opacity 过渡
3. ImagePreview.vue 重构使用共享动画 CSS
4. ImagePreview.vue 集成 useImageTransition composable
5. 所有动画在 reduced-motion 模式下正常工作
6. 功能回归测试通过（导航、收藏、下载等）

**Plans:** 0/0

---

## Progress

| Phase | Name | Milestone | Plans Complete | Status | Completed |
|-------|------|-----------|----------------|--------|-----------|
| 25 | Animation Infrastructure | v2.8 | 0/0 | Pending | — |
| 26 | Core Animation Optimization | v2.8 | 1/1 | Complete | 2026-04-30 |
| 27 | Preview Animation Optimization | v2.8 | 1/1 | Complete | 2026-04-30 |
| 28 | Accessibility & Integration | v2.8 | 0/0 | Pending | — |

---

## Requirement Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| ARCH-01 | Phase 25 | Pending |
| ARCH-02 | Phase 25 | Pending |
| CORE-01 | Phase 26 | Complete |
| CORE-02 | Phase 26 | Complete |
| CORE-03 | Phase 26 | Complete |
| CORE-04 | Phase 26 | Complete |
| CORE-05 | Phase 26 | Complete |
| PREV-01 | Phase 27 | Complete |
| PREV-02 | Phase 27 | Complete |
| A11Y-01 | Phase 28 | Pending |
| A11Y-02 | Phase 28 | Pending |
| ARCH-03 | Phase 28 | Pending |

**Coverage:**
- v1 requirements: 12 total
- Mapped to phases: 12
- Unmapped: 0 ✓

---

*创建时间：2026-04-30*
*最后更新：2026-04-30 v2.8 roadmap created*
