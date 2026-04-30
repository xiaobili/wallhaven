# Phase 28: Accessibility & Integration - Context

**Gathered:** 2026-04-30
**Status:** Ready for planning

<domain>
## Phase Boundary

添加可访问性支持，完成 ImagePreview 重构 — 集成 useImageTransition composable，确保 reduced-motion 模式正常工作，完成功能回归测试。

**核心交付物：**
1. 添加 `@media (prefers-reduced-motion: reduce)` 支持（已在 animations.css 中实现）
2. reduced-motion 模式使用简单 opacity 过渡（已在 animations.css 中实现）
3. ImagePreview.vue 重构使用共享动画 CSS（已完成导入）
4. ImagePreview.vue 集成 useImageTransition composable（待实现）
5. 所有动画在 reduced-motion 模式下正常工作
6. 功能回归测试通过（导航、收藏、下载等）

**阶段边界：**
- 集成 useImageTransition composable 到 ImagePreview.vue
- 使用 composable 的 reducedMotion 检测和 transitionName 计算
- 保持现有动画视觉效果不变
- 不修改 animations.css（Phase 25-27 已完成）
- 不修改 useImageTransition composable 接口

**当前状态：**
- ✅ animations.css 已包含完整 reduced-motion 支持
- ✅ ImagePreview.vue 已导入 animations.css
- ✅ useImageTransition composable 已创建并导出
- ✅ slide 动画和 modal 动画已优化
- ❌ ImagePreview.vue 未使用 useImageTransition composable
- ❌ 未使用 composable 的 reducedMotion 检测
- ❌ 未使用 composable 的 transitionName 计算

**依赖关系：**
- Phase 27 (Preview Animation Optimization) — 必须完成 ✓
- Phase 26 (Core Animation Optimization) — 必须完成 ✓
- Phase 25 (Animation Infrastructure) — 必须完成 ✓

</domain>

<decisions>
## Implementation Decisions

### Composable 集成策略 (D-01)

- **D-01:** 在 ImagePreview.vue 中导入并使用 useImageTransition composable
  - 替换现有的 `slideDirection` ref 为 composable 提供的
  - 使用 `transitionName` 计算属性替代直接使用 `slideDirection`
  - 理由：composable 提供 reduced-motion 自动检测，无需手动管理

[auto] Composable 集成 — Q: "如何集成 useImageTransition?" → Selected: "替换现有 slideDirection 状态" (recommended default)

### 动画状态管理 (D-02)

- **D-02:** 使用 isAnimating 状态禁用导航按钮防止快速点击
  - 在 navigatePrev/navigateNext 中调用 startAnimation()
  - 添加 @after-enter 事件调用 endAnimation()
  - 导航按钮添加 `:disabled="isAnimating"` 属性
  - 理由：防止动画重叠，提升用户体验

[auto] 动画状态 — Q: "是否使用 isAnimating 禁用导航?" → Selected: "是，防止快速点击" (recommended default)

### 过渡事件处理 (D-03)

- **D-03:** 在 Transition 组件添加 @after-enter 事件
  - 调用 composable 的 endAnimation() 方法
  - 用于更新 isAnimating 状态
  - 理由：准确追踪动画完成时机

[auto] 过渡事件 — Q: "添加哪些 Transition 事件?" → Selected: "@after-enter 调用 endAnimation" (recommended default)

### 初始动画处理 (D-04)

- **D-04:** 保留 isInitialOpen 状态用于首次打开动画
  - isInitialOpen 控制首次打开时的 modal-open 动画
  - 导航时禁用初始动画，使用 slide 动画
  - 与 composable 的 isAnimating 分离管理
  - 理由：首次打开动画与导航动画是不同的动画类型

[auto] 初始动画 — Q: "isInitialOpen 如何与 composable 配合?" → Selected: "分离管理，职责不同" (recommended default)

### Reduced-motion 集成 (D-05)

- **D-05:** 使用 composable 的 transitionName 计算属性
  - Transition :name 绑定改为 transitionName
  - reduced-motion 时自动使用 'fade' 动画
  - 理由：composable 自动处理系统偏好检测

[auto] Reduced-motion — Q: "如何使用 transitionName?" → Selected: "绑定到 Transition :name" (recommended default)

### Claude's Discretion

- 是否在 composable 中添加动画时长配置项（推迟，当前时长合适）
- 是否添加 @after-leave 事件（可选，当前 @after-enter 足）
- 导航按钮禁用样式细节（CSS 实现）

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 项目规划
- `.planning/PROJECT.md` — 项目核心价值、约束条件（功能行为不变、视觉效果不变）
- `.planning/ROADMAP.md` — Phase 28 定义和成功标准
- `.planning/REQUIREMENTS.md` — A11Y-01, A11Y-02, ARCH-03 需求详情

### 前置阶段上下文
- `.planning/phases/25-animation-infrastructure/25-CONTEXT.md` — animations.css 和 composable 设计决策
- `.planning/phases/26-core-animation-optimization/26-CONTEXT.md` — slide 动画优化模式
- `.planning/phases/27-preview-animation-optimization/27-CONTEXT.md` — modal 动画优化模式

### 研究文档
- `.planning/research/SUMMARY.md` — 动画性能优化研究结论
- `.planning/research/PITFALLS.md` — CSS/Vue 动画性能陷阱

### 关键代码文件

#### 需要修改的文件
- `src/components/ImagePreview.vue` — 集成 useImageTransition composable

#### 依赖的已创建文件
- `src/static/css/animations.css` — GPU 优化的动画类（Phase 25-27 完成）
- `src/composables/animation/useImageTransition.ts` — 动画状态管理（Phase 25 创建）
- `src/composables/index.ts` — Composable 导出（已导出 useImageTransition）

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

#### useImageTransition composable（Phase 25 创建）
```typescript
export interface UseImageTransitionReturn {
  slideDirection: Ref<SlideDirection>
  isAnimating: Ref<boolean>
  reducedMotion: ComputedRef<boolean>
  transitionName: ComputedRef<string>
  setDirection: (direction: NavigationDirection) => void
  startAnimation: () => void
  endAnimation: () => void
}
```
- 提供 reduced-motion 自动检测
- 提供 transitionName 计算（reduced-motion 时返回 'fade'）
- 提供 isAnimating 状态管理

#### animations.css reduced-motion 支持
```css
@media (prefers-reduced-motion: reduce) {
  .slide-left-enter-active,
  .slide-left-leave-active,
  .slide-right-enter-active,
  .slide-right-leave-active {
    animation: fade 0.15s ease-out both;
    will-change: opacity;
  }
  .modal-open,
  .modal-close {
    animation: fade 0.15s ease-out both;
    will-change: opacity;
  }
}
```
- 所有动画已有 reduced-motion fallback

#### ImagePreview.vue 当前实现
```vue
<script setup lang="ts">
// 当前状态管理
const slideDirection = ref<string>('slide-left')
const isInitialOpen = ref<boolean>(true)

// 导航方法
const navigatePrev = () => {
  if (canNavigatePrev.value) {
    isInitialOpen.value = false
    slideDirection.value = 'slide-left'
    emit('navigate', 'prev')
  }
}
</script>

<template>
  <Transition :name="slideDirection" mode="out-in">
    <img ...>
  </Transition>
</template>
```
- 需要替换为 composable 提供的状态和方法

### Established Patterns

- **Composable 使用模式**: 在 `<script setup>` 顶部调用，解构返回值
- **Transition 事件**: `@after-enter="onAfterEnter"` 绑定
- **导航按钮禁用**: `:disabled="isAnimating"` + CSS `:disabled` 样式

### Integration Points

- `src/components/ImagePreview.vue` — 唯一修改文件
- 导入: `import { useImageTransition } from '@/composables'`
- Transition :name 绑定改为 `transitionName`
- 导航方法使用 `setDirection()` 和 `startAnimation()`
- 添加 @after-enter 事件调用 `endAnimation()`

</code_context>

<specifics>
## Specific Ideas

- 集成后功能回归测试重点：导航（左右键、按钮点击）、收藏（左键/右键）、下载、设置壁纸
- reduced-motion 测试：系统偏好切换后动画自动切换
- 动画视觉效果保持不变（项目约束）

</specifics>

<deferred>
## Deferred Ideas

None — 本阶段为可访问性集成，范围明确。

### 后续阶段

- v2.9 或后续版本：为其他组件（Alert.vue, LoadingOverlay.vue）添加 reduced-motion 支持
- v2.9 或后续版本：添加 FPS 监控功能（仅开发模式）

</deferred>

---

*Phase: 28-accessibility-integration*
*Context gathered: 2026-04-30*
