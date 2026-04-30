# Phase 26: Core Animation Optimization - Context

**Gathered:** 2026-04-30
**Status:** Ready for planning

<domain>
## Phase Boundary

核心动画优化 — 移除 blur 滤镜，使用 GPU 加速属性，确保图片切换动画达到 60fps。

**核心交付物：**
1. slide-in-blurred-left/right 动画移除 `filter: blur(40px)`
2. transform 简化为 `translateX(±50px) scale(0.98)`
3. 动画仅使用 `transform` 和 `opacity` 属性
4. 添加 `will-change: transform, opacity` 提示
5. `.img-view` 容器添加 `contain: layout paint`
6. 图片切换动画保持 60fps（Chrome DevTools 验证）

**阶段边界：**
- 仅修改 ImagePreview.vue 中的动画定义
- 迁移到使用 Phase 25 创建的 animations.css 类
- 不修改动画视觉效果（用户无感知差异）
- 不修改 useImageTransition composable（Phase 28 集成）

**当前状态：**
- ✅ Phase 25 完成 — animations.css 和 useImageTransition.ts 已创建
- ✅ 新的 GPU 优化 CSS 类已定义（slide-left/slide-right）
- ❌ ImagePreview.vue 仍使用旧的 slide-in-blurred-left/right（带 blur）
- ❌ .img-view 容器缺少 `contain` 属性

**依赖关系：**
- Phase 25 (Animation Infrastructure) — 必须完成

</domain>

<decisions>
## Implementation Decisions

### CSS 迁移策略 (D-01)

- **D-01:** 替换 ImagePreview.vue 中的内联动画定义为 animations.css 导入
  - 删除 `@keyframes slide-in-blurred-left/right` 内联定义（lines 465-584）
  - 添加 `@import url("@/static/css/animations.css");` 到 `<style scoped>`
  - 将 `slideDirection` 值从 `'slide-in-blurred-left'` 改为 `'slide-left'`
  - 理由：animations.css 已包含优化后的动画类，直接复用

### Will-change 管理 (D-02)

- **D-02:** 在动画类中保留 will-change 提示
  - animations.css 中的 `.slide-*-enter-active` 和 `.slide-*-leave-active` 已包含 `will-change: transform, opacity`
  - 动画结束后浏览器自动移除 will-change 层
  - 理由：现代浏览器会自动优化，无需手动管理

### CSS Containment (D-03)

- **D-03:** 在 `.img-view` 容器添加 `contain: layout paint`
  - 隔离渲染边界，防止动画影响其他元素
  - 添加位置：ImagePreview.vue 的 `.img-view` 样式规则
  - 理由：CORE-05 要求，提升动画性能

### 动画效果保持 (D-04)

- **D-04:** 保持动画视觉效果相似
  - 新动画：`translateX(±50px) scale(0.98)` + `opacity: 0 → 1`
  - 时长保持 300ms（与原动画一致）
  - 缓动函数：`cubic-bezier(0.4, 0, 0.2, 1)`（标准 ease-out）
  - 理由：用户无感知差异，符合项目约束

### Claude's Discretion

- 是否保留 `-webkit-` 前缀（animations.css 已包含，无需额外处理）
- 动画结束后的 will-change 清理时机
- 是否需要添加过渡完成事件监听

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 项目规划
- `.planning/PROJECT.md` — 项目核心价值、约束条件（功能行为不变、视觉效果不变）
- `.planning/ROADMAP.md` — Phase 26 定义和成功标准
- `.planning/REQUIREMENTS.md` — CORE-01 至 CORE-05 需求详情

### 前置阶段上下文
- `.planning/phases/25-animation-infrastructure/25-CONTEXT.md` — 动画基础设施设计决策
- `.planning/phases/25-animation-infrastructure/25-01-PLAN.md` — animations.css 和 composable 实现细节

### 关键代码文件

#### 需要修改的文件
- `src/components/ImagePreview.vue` — 主要修改目标，包含旧动画定义

#### 依赖的已创建文件
- `src/static/css/animations.css` — GPU 优化的动画类（Phase 25 创建）
- `src/composables/animation/useImageTransition.ts` — 动画状态管理（Phase 25 创建，本阶段不集成）

#### 参考文件
- `src/static/css/common.css` — CSS 文件结构参考

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

#### animations.css（Phase 25 创建）
```css
/* GPU 优化的 slide 动画类 */
.slide-left-enter-active {
  animation: slide-left 0.3s cubic-bezier(0.4, 0, 0.2, 1) both;
  will-change: transform, opacity;
}
.slide-right-enter-active {
  animation: slide-right 0.3s cubic-bezier(0.4, 0, 0.2, 1) both;
  will-change: transform, opacity;
}
/* 关键帧仅使用 transform 和 opacity */
@keyframes slide-left {
  0% { transform: translateX(-50px) scale(0.98); opacity: 0; }
  100% { transform: translateX(0) scale(1); opacity: 1; }
}
```

#### ImagePreview.vue 当前动画使用
```vue
<Transition :name="slideDirection" mode="out-in">
  <img :key="imgInfo.id" ...>
</Transition>
```
```typescript
// 当前 slideDirection 值
const slideDirection = ref<string>('slide-in-blurred-left')
// 需要改为
const slideDirection = ref<string>('slide-left')
```

#### ImagePreview.vue 当前动画定义（需删除）
```css
/* Lines 465-584: 旧的 slide-in-blurred-left/right 定义 */
@keyframes slide-in-blurred-left {
  0% {
    transform: translateX(-1000px) scaleX(2.5) scaleY(0.2);
    filter: blur(40px);  /* 性能瓶颈 */
    opacity: 0;
  }
  100% {
    transform: translateX(0) scaleY(1) scaleX(1);
    filter: blur(0);
    opacity: 1;
  }
}
```

### Established Patterns

- **CSS 导入模式**: `@import url("@/static/css/animations.css");` 在 `<style scoped>` 块顶部
- **动画类命名**: `slide-left`/`slide-right` 对应导航方向（prev/next）
- **Vue Transition**: 使用 `:name` 动态绑定动画名称

### Integration Points

- `src/components/ImagePreview.vue` — 唯一修改文件
- 删除内联动画定义（lines 465-584）
- 添加 animations.css 导入
- 修改 `slideDirection` 初始值
- 添加 `.img-view { contain: layout paint; }`

</code_context>

<specifics>
## Specific Ideas

- 动画参数基于 RESEARCH.md 的性能分析结论
- 新动画视觉效果应与原动画相似（用户无感知差异）
- 300ms 时长保持不变，确保流畅体验

</specifics>

<deferred>
## Deferred Ideas

None — 本阶段为动画优化，范围明确。

### 后续阶段

- **Phase 27**: 优化预览窗口打开/关闭动画（blowUpModal/blowUpModalTwo）
- **Phase 28**: ImagePreview 集成 useImageTransition composable，完成 reduced-motion 支持

</deferred>

---

*Phase: 26-core-animation-optimization*
*Context gathered: 2026-04-30*
