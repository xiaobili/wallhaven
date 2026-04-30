# Phase 29: LoadingOverlay Animation Optimization - Context

**Gathered:** 2026-04-30
**Status:** Ready for planning

<domain>
## Phase Boundary

优化 LoadingOverlay 组件的动画性能，消除卡顿和延迟。

**核心交付物：**
1. 移除 `backdrop-filter: blur(2px)` 性能瓶颈
2. 优化过渡时长为 0.2s，与 ImagePreview 动画一致
3. 复用 animations.css 的 fade 动画定义
4. 添加 reduced-motion 支持（禁用旋转动画）
5. 保持视觉效果不变（项目约束）

**阶段边界：**
- 修改仅限于 `src/components/LoadingOverlay.vue`
- 可能需要在 `src/static/css/animations.css` 添加 loading 专用动画类
- 不改变组件接口（props: show, text）
- 不改变组件使用方式
- 保持半透明遮罩视觉效果

**当前状态：**
- LoadingOverlay.vue 使用简单 fade 过渡
- backdrop-filter: blur(2px) 存在性能开销
- 过渡时长 0.3s ease
- 无 reduced-motion 支持

**依赖关系：**
- Phase 25 (Animation Infrastructure) — animations.css 已有 fade 动画 ✓

</domain>

<decisions>
## Implementation Decisions

### Blur 处理策略 (D-01)

- **D-01:** 移除 `backdrop-filter: blur(2px)`
  - backdrop-filter 是主要性能瓶颈，每次动画帧都需要重新计算模糊
  - 移除后背景仍保持半透明遮罩效果（rgba(0, 0, 0, 0.6)）
  - 理由：最彻底的性能优化，消除所有 blur 计算开销

[discuss] Blur 策略 — Q: "如何处理 backdrop-filter?" → Selected: "移除 backdrop-filter"

### 过渡时长优化 (D-02)

- **D-02:** 过渡时长从 0.3s 改为 0.2s
  - 与 ImagePreview 动画时长一致（Phase 26-27 模式）
  - 平衡流畅度与响应速度
  - 理由：用户感知更快的响应

[discuss] 过渡时长 — Q: "过渡时长选择?" → Selected: "0.2s (推荐)"

### 动画复用策略 (D-03)

- **D-03:** 复用 animations.css 的 fade 动画定义
  - 导入 `@import url("@/static/css/animations.css")`
  - 使用已有的 `.fade-enter-active`, `.fade-leave-active` 类
  - 移除组件内重复的动画定义
  - 理由：与项目其他组件保持一致，便于统一维护

[discuss] 动画复用 — Q: "是否复用 animations.css?" → Selected: "复用 animations.css"

### Reduced-motion 支持 (D-04)

- **D-04:** 在 reduced-motion 模式下禁用 fa-spin 旋转动画
  - 使用 CSS `@media (prefers-reduced-motion: reduce)` 检测
  - 停止 `fa-spin` 动画，显示静态图标
  - 加载提示仍然清晰可见
  - 理由：尊重用户偏好，减少动画干扰

[discuss] Reduced-motion — Q: "reduced-motion 如何处理旋转?" → Selected: "禁用旋转动画"

### Claude's Discretion

- 过渡缓动函数选择（建议使用 ease-out，与 animations.css 一致）
- 背景色透明度微调（可选，当前 0.6 已合适）
- 是否添加 `will-change: opacity` 提示（可选，fade 动画开销较小）

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 项目规划
- `.planning/PROJECT.md` — 项目核心价值、约束条件（功能行为不变、视觉效果不变）
- `.planning/ROADMAP.md` — Phase 29 定义
- `.planning/REQUIREMENTS.md` — 需求详情

### 前置阶段上下文
- `.planning/phases/25-animation-infrastructure/25-CONTEXT.md` — animations.css 设计决策
- `.planning/phases/26-core-animation-optimization/26-CONTEXT.md` — GPU 优化模式
- `.planning/phases/28-accessibility-integration/28-CONTEXT.md` — reduced-motion 实现模式

### 关键代码文件

#### 需要修改的文件
- `src/components/LoadingOverlay.vue` — 主要修改文件

#### 依赖的已创建文件
- `src/static/css/animations.css` — GPU 优化的 fade 动画类（Phase 25 完成）

#### 参考实现
- `src/components/ImagePreview.vue` — reduced-motion 集成参考

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

#### animations.css fade 动画（Phase 25 创建）
```css
.fade-enter-active,
.fade-leave-active {
  animation: fade 0.15s ease-out both;
  will-change: opacity;
}

@keyframes fade {
  from { opacity: 0; }
  to { opacity: 1; }
}

@media (prefers-reduced-motion: reduce) {
  .fade-enter-active,
  .fade-leave-active {
    animation: fade 0.15s ease-out both;
  }
}
```

#### LoadingOverlay.vue 当前实现
```vue
<template>
  <Transition name="fade">
    <div v-if="show" class="loading-overlay">
      <div class="loading-content">
        <i class="fas fa-spinner fa-spin loading-icon" />
        <p v-if="text" class="loading-text">{{ text }}</p>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.loading-overlay {
  /* ... */
  backdrop-filter: blur(2px); /* 性能瓶颈 — 需移除 */
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease; /* 需改为复用 animations.css */
}
</style>
```

### Established Patterns

- **动画复用模式**: `@import url("@/static/css/animations.css")` 导入共享动画
- **Reduced-motion CSS**: `@media (prefers-reduced-motion: reduce)` 媒体查询
- **禁用动画**: `animation: none` 或重置 `animation-duration: 0s`

### Integration Points

- `src/components/LoadingOverlay.vue` — 唯一修改文件
- 使用方式不变：`<LoadingOverlay :show="loading" text="加载中..." />`
- 被 `OnlineWallpaper.vue` 使用

</code_context>

<specifics>
## Specific Ideas

- 过渡时长 0.2s 与 ImagePreview 动画一致，提供统一的体验
- 移除 blur 后背景仍保持半透明遮罩效果，视觉差异小
- reduced-motion 下静态 loading 图标仍清晰表达"加载中"状态

</specifics>

<deferred>
## Deferred Ideas

None — 本阶段范围明确，仅优化 LoadingOverlay 动画性能。

### 后续阶段

- 为其他组件添加 reduced-motion 支持（Alert.vue 等）
- 考虑 loading 图标动画的替代方案（骨架屏等）

</deferred>

---

*Phase: 29-loadingoverlay-animation-optimize*
*Context gathered: 2026-04-30*
