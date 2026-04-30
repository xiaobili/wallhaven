# Requirements: Wallhaven 壁纸浏览器 — v2.8 动画性能优化

**Defined:** 2026-04-30
**Core Value:** 收藏管理，分类随心 — 将喜欢的壁纸添加到自定义收藏夹，按主题分类管理

---

## v1 Requirements

此里程碑专注于优化 ImagePreview 组件的动画性能，确保流畅 60fps 体验。

### 核心优化 (Core)

- [ ] **CORE-01**: 移除 slide-in-blurred-left/right 动画中的 `filter: blur(40px)` 滤镜
- [ ] **CORE-02**: 简化 transform 组合，将 `translateX(-1000px) scaleX(2.5) scaleY(0.2)` 简化为 `translateX(±50px) scale(0.98)`
- [ ] **CORE-03**: 仅使用 GPU 加速属性 (`transform` 和 `opacity`) 进行动画
- [ ] **CORE-04**: 添加 `will-change: transform, opacity` 到动画类，动画结束后移除
- [ ] **CORE-05**: 在 `.img-view` 容器添加 `contain: layout paint` 隔离渲染边界

### 预览窗口动画 (Preview)

- [ ] **PREV-01**: 优化 blowUpModal 打开动画，移除或简化可能导致性能问题的效果
- [ ] **PREV-02**: 优化 blowUpModalTwo 关闭动画，确保与打开动画性能一致

### 架构改进 (Architecture)

- [ ] **ARCH-01**: 创建 `src/static/css/animations.css` 集中管理 GPU 优化的动画关键帧
- [ ] **ARCH-02**: 创建 `src/composables/animation/useImageTransition.ts` 管理动画状态
- [ ] **ARCH-03**: 重构 ImagePreview.vue 使用共享动画 CSS 和 composable

### 可访问性 (A11y)

- [ ] **A11Y-01**: 添加 `@media (prefers-reduced-motion: reduce)` 支持，为需要减少动画的用户提供替代方案
- [ ] **A11Y-02**: 在 reduced-motion 模式下使用简单的 opacity 过渡替代复杂动画

---

## v2 Requirements

以下需求推迟到后续版本：

### 性能监控

- **MON-01**: 添加 FPS 监控功能（仅开发模式）
- **MON-02**: 添加动画性能日志（可选开关）

### 其他组件优化

- **COMP-01**: 优化 Alert.vue 动画使用共享动画 CSS
- **COMP-02**: 优化 CollectionDropdown.vue 动画
- **COMP-03**: 优化 LoadingOverlay.vue 动画

---

## Out of Scope

| 功能 | 原因 |
|------|------|
| JavaScript 驱动动画 | 阻塞主线程，性能更差 |
| 新增动画库 (GSAP/anime.js) | CSS 原生能力足够，无需引入依赖 |
| 图片加载优化 | 超出动画性能优化范围 |
| 虚拟滚动 | 与动画优化无关，属于列表性能优化 |

---

## Traceability

哪些阶段覆盖哪些需求。在 roadmap 创建时更新。

| Requirement | Phase | Status |
|-------------|-------|--------|
| CORE-01 | TBD | Pending |
| CORE-02 | TBD | Pending |
| CORE-03 | TBD | Pending |
| CORE-04 | TBD | Pending |
| CORE-05 | TBD | Pending |
| PREV-01 | TBD | Pending |
| PREV-02 | TBD | Pending |
| ARCH-01 | TBD | Pending |
| ARCH-02 | TBD | Pending |
| ARCH-03 | TBD | Pending |
| A11Y-01 | TBD | Pending |
| A11Y-02 | TBD | Pending |

**Coverage:**
- v1 requirements: 12 total
- Mapped to phases: 0
- Unmapped: 12 ⚠️

---

*Requirements defined: 2026-04-30*
*Last updated: 2026-04-30 after initial definition*
