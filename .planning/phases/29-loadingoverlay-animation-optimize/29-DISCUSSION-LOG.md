# Phase 29: LoadingOverlay Animation Optimization - Discussion Log

**Date:** 2026-04-30
**Phase:** 29 - LoadingOverlay Animation Optimization

---

## Discussion Summary

### Area 1: Blur 处理策略

**Question:** backdrop-filter: blur(2px) 是主要性能瓶颈。如何处理？

**Options presented:**
1. 移除 backdrop-filter (推荐) — 最彻底的性能优化
2. 降低 blur 强度 (blur(1px)) — 减少计算复杂度
3. 用深色背景替代 — 无 GPU 开销
4. 保持现状

**User selection:** 移除 backdrop-filter (推荐)

**Notes:** 用户选择最彻底的性能优化方案，移除所有 blur 计算开销。

---

### Area 2: 过渡时长优化

**Question:** 过渡时长选择哪个？当前是 0.3s ease。

**Options presented:**
1. 0.15s (快速) — 最快响应
2. 0.2s (推荐) — 与 ImagePreview 动画一致
3. 0.3s (保持现状) — 当前值
4. 无过渡 (即时) — 立即显示/隐藏

**User selection:** 0.2s (推荐)

**Notes:** 与 ImagePreview 动画时长保持一致，统一的用户体验。

---

### Area 3: 动画复用策略

**Question:** 是否复用 Phase 25 创建的 animations.css？

**Options presented:**
1. 复用 animations.css (推荐) — 与项目其他组件保持一致
2. 保持组件内定义 — 更简洁
3. 新建专用 CSS 文件 — 便于未来扩展

**User selection:** 复用 animations.css (推荐)

**Notes:** 导入共享动画定义，便于统一维护和优化。

---

### Area 4: Reduced-motion 支持

**Question:** reduced-motion 模式下如何处理 loading 图标的旋转动画？

**Options presented:**
1. 禁用旋转动画 (推荐) — 停止 fa-spin，显示静态图标
2. 保持旋转动画 — 加载指示器必须有动态感
3. 显示静态文字 — 用文字替代图标

**User selection:** 禁用旋转动画 (推荐)

**Notes:** 尊重用户偏好，减少动画干扰。静态图标仍能清晰表达加载状态。

---

## Deferred Ideas

None — 讨论保持在阶段范围内。

---

*Generated: 2026-04-30*
