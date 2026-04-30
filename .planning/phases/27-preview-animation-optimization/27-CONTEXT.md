# Phase 27: Preview Animation Optimization - Context

**Gathered:** 2026-04-30
**Status:** Ready for planning

<domain>
## Phase Boundary

优化预览窗口打开/关闭动画性能 (blowUpModal / blowUpModalTwo)，添加 will-change 提示和 reduced-motion 支持。

**核心交付物：**
1. blowUpModal 打开动画优化，移除性能瓶颈
2. blowUpModalTwo 关闭动画优化，与打开动画性能一致
3. 预览窗口打开/关闭保持 60fps
4. 动画视觉效果与原版相似（用户无感知差异）

**阶段边界：**
- 迁移 blowUpModal/blowUpModalTwo 到 animations.css
- 添加 will-change 提示优化 GPU 层提升
- 添加 reduced-motion 支持
- 不修改动画时序（保持 0.5s 时长）
- 不修改动画视觉效果

**当前状态：**
- ✅ Phase 26 完成 — slide 动画已优化
- ✅ blowUpModal/blowUpModalTwo 已使用 GPU 加速属性（transform + opacity）
- ✅ 动画时序合理（0.5s cubic-bezier）
- ❌ 缺少 will-change 提示
- ❌ 缺少 reduced-motion 支持
- ❌ 动画定义内联在 ImagePreview.vue

**依赖关系：**
- Phase 26 (Core Animation Optimization) — 必须完成
- Phase 25 (Animation Infrastructure) — animations.css 已创建

**性能分析：**
好消息！blowUpModal 和 blowUpModalTwo 已使用 GPU 加速属性：
- `blowUpModal`: `transform: scale(0) → scale(1)` — 纯 transform，GPU 加速
- `blowUpModalTwo`: `transform: scale(1) → scale(0), opacity: 1 → 0` — transform + opacity，GPU 加速

本阶段主要优化：
1. 添加 will-change 提示预提升 GPU 层
2. 迁移到 animations.css 统一管理
3. 添加 reduced-motion 支持

</domain>

<decisions>
## Implementation Decisions

### 动画迁移策略 (D-01)

- **D-01:** 将 blowUpModal/blowUpModalTwo 迁移到 animations.css
  - 从 ImagePreview.vue 删除内联 @keyframes 定义
  - 在 animations.css 添加 modal-open 和 modal-close 关键帧
  - 添加 .modal-open 和 .modal-close 动画类
  - 理由：与 Phase 25/26 保持一致，集中管理动画资源

### Will-change 优化 (D-02)

- **D-02:** 在动画类中添加 will-change 提示
  - `.modal-open`: `will-change: transform`
  - `.modal-close`: `will-change: transform, opacity`
  - 浏览器自动管理 will-change 层生命周期
  - 理由：预提升 GPU 层，避免首帧卡顿

### Reduced-motion 支持 (D-03)

- **D-03:** 添加 @media (prefers-reduced-motion: reduce) 支持
  - modal-open: 使用 opacity: 0 → 1 过渡，时长 150ms
  - modal-close: 使用 opacity: 1 → 0 过渡，时长 150ms
  - 理由：WCAG 2.1 无障碍合规，与 slide 动画 fallback 一致

### 动画时序保持 (D-04)

- **D-04:** 保持现有动画时序不变
  - 时长：0.5s
  - 缓动曲线：cubic-bezier(0.165, 0.84, 0.44, 1)（弹性效果）
  - 理由：用户无感知差异，当前时序体验良好

### CSS 选择器更新 (D-05)

- **D-05:** 更新 ImagePreview.vue CSS 选择器使用新动画类
  - `.mask .img-view .img-class.initial-anim` 使用 animations.css 的动画
  - `.mask.out .img-view .img-class` 使用 animations.css 的动画
  - 删除内联 @keyframes blowUpModal/blowUpModalTwo
  - 理由：解耦动画定义与组件样式

### Claude's Discretion

- animations.css 中动画命名（modal-open/modal-close vs blowUpModal/blowUpModalTwo）
- 是否添加 -webkit- 前缀（animations.css 已有模式可参考）
- 是否在 composable 中添加 modal 动画状态（推迟到 Phase 28）

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 项目规划
- `.planning/PROJECT.md` — 项目核心价值、约束条件（功能行为不变、视觉效果不变）
- `.planning/ROADMAP.md` — Phase 27 定义和成功标准
- `.planning/REQUIREMENTS.md` — PREV-01, PREV-02 需求详情

### 前置阶段上下文
- `.planning/phases/25-animation-infrastructure/25-CONTEXT.md` — animations.css 设计决策
- `.planning/phases/25-animation-infrastructure/25-01-PLAN.md` — animations.css 实现细节
- `.planning/phases/26-core-animation-optimization/26-CONTEXT.md` — slide 动画优化模式

### 研究文档
- `.planning/research/SUMMARY.md` — 动画性能优化研究结论
- `.planning/research/PITFALLS.md` — CSS/Vue 动画性能陷阱

### 关键代码文件

#### 需要修改的文件
- `src/components/ImagePreview.vue` — 包含 blowUpModal/blowUpModalTwo 内联定义

#### 依赖的已创建文件
- `src/static/css/animations.css` — GPU 优化的动画类（Phase 25 创建）

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

#### animations.css（Phase 25 创建，Phase 26 扩展）
```css
/* 已有 slide 动画和 reduced-motion 支持模式 */
.slide-left-enter-active {
  animation: slide-left 0.3s cubic-bezier(0.4, 0, 0.2, 1) both;
  will-change: transform, opacity;
}

@media (prefers-reduced-motion: reduce) {
  .slide-left-enter-active {
    animation: fade 0.15s ease-out both;
    will-change: opacity;
  }
}
```
- 已有 will-change 使用模式
- 已有 reduced-motion fallback 模式
- 可复用相同的 CSS 结构

#### ImagePreview.vue 当前动画定义
```css
/* Lines 378-407: 内联动画定义 */
.mask .img-view .img-class.initial-anim {
  animation: blowUpModal 0.5s cubic-bezier(0.165, 0.84, 0.44, 1) forwards;
}

.mask.out .img-view .img-class {
  animation: blowUpModalTwo 0.5s cubic-bezier(0.165, 0.84, 0.44, 1) forwards;
}

@keyframes blowUpModal {
  0% { transform: scale(0); }
  100% { transform: scale(1); }
}

@keyframes blowUpModalTwo {
  0% { transform: scale(1); opacity: 1; }
  100% { transform: scale(0); opacity: 0; }
}
```
- 动画已使用 GPU 加速属性（transform + opacity）
- 缺少 will-change 提示
- 缺少 reduced-motion 支持

#### ImagePreview.vue 模板使用
```vue
<img
  class="img-class"
  :class="{ 'initial-anim': isInitialOpen }"
  ...
>
```
- isInitialOpen 控制 initial-anim 类
- out 类控制关闭动画

### Established Patterns

- **动画类命名**: 动作-方向（slide-left, modal-open）
- **will-change 位置**: 在 *-enter-active / *-leave-active 类中
- **reduced-motion fallback**: 简化 fade 动画，150ms 时长
- **CSS 导入模式**: `@import url("@/static/css/animations.css");`

### Integration Points

- `src/static/css/animations.css` — 添加 modal 动画定义
- `src/components/ImagePreview.vue` — 删除内联动画，保持选择器引用

</code_context>

<specifics>
## Specific Ideas

- 动画参数基于 RESEARCH.md 的性能分析结论
- 弹性缓动曲线 cubic-bezier(0.165, 0.84, 0.44, 1) 提供良好的视觉体验
- 与 slide 动画保持相同的 will-change 和 reduced-motion 模式

</specifics>

<deferred>
## Deferred Ideas

None — 本阶段为动画优化，范围明确。

### 后续阶段

- **Phase 28**: ImagePreview 集成 useImageTransition composable，完成 reduced-motion 检测集成

</deferred>

---

*Phase: 27-preview-animation-optimization*
*Context gathered: 2026-04-30*
