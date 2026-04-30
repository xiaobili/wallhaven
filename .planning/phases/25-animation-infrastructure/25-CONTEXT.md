# Phase 25: Animation Infrastructure - Context

**Gathered:** 2026-04-30
**Status:** Ready for planning

<domain>
## Phase Boundary

创建动画基础设施 — 共享 CSS 文件和 Vue composable，为后续动画优化阶段提供基础支撑。

**核心交付物：**
1. `src/static/css/animations.css` 文件创建，包含 GPU 优化的动画关键帧模板
2. `src/composables/animation/useImageTransition.ts` 文件创建，提供动画状态管理
3. composable 导出 reduced-motion 检测功能
4. 新文件通过 TypeScript 编译检查

**阶段边界：**
- 仅创建基础设施文件，不修改现有组件
- CSS 文件仅定义关键帧和工具类，不引用具体组件
- composable 提供通用动画状态管理，不包含业务逻辑
- 不修改 ImagePreview.vue（Phase 26-28 职责）

**当前状态：**
- ✅ Phase 24 完成 — ImagePreview 图片切换动画已实现
- ✅ 动画使用 slide-in-blurred-left/right 类（带 blur 滤镜）
- ✅ Vue Transition 组件已正确配置
- ❌ 缺少共享动画 CSS 文件
- ❌ 缺少动画状态管理 composable
- ❌ 缺少 reduced-motion 支持

</domain>

<decisions>
## Implementation Decisions

### 动画 CSS 文件结构 (D-01)

- **D-01:** 创建 `src/static/css/animations.css` 作为共享动画资源
  - 包含 GPU 优化的关键帧定义
  - 包含 slide-left/slide-right 动画类（优化版本，无 blur）
  - 包含 fade 动画类（用于 reduced-motion）
  - 包含 will-change 工具类
  - 理由：集中管理动画资源，便于后续阶段复用和优化

### CSS 关键帧定义 (D-02 ~ D-03)

- **D-02:** 定义 GPU 优化的 slide 动画关键帧
  - 仅使用 `transform` 和 `opacity` 属性（GPU 加速）
  - 动画参数：`translateX(±50px) scale(0.98)` + `opacity: 0 → 1`
  - 时长：300ms（与现有动画一致）
  - 缓动曲线：`cubic-bezier(0.4, 0, 0.2, 1)`（Material Design 标准缓动）
  - 理由：根据 RESEARCH.md 分析，此参数组合可实现 60fps

- **D-03:** 定义 fade 动画关键帧（reduced-motion 使用）
  - 仅使用 `opacity: 0 → 1` 过渡
  - 时长：150ms（快速响应）
  - 理由：为 reduced-motion 模式提供简单的替代动画

### Reduced-motion CSS 支持 (D-04)

- **D-04:** 在 CSS 文件中添加 `@media (prefers-reduced-motion: reduce)` 规则
  - 所有 slide 动画类在 reduced-motion 模式下使用 fade 动画
  - 动画时长缩短至 150ms
  - 理由：符合 WCAG 2.1 无障碍标准

### Composable 结构 (D-05)

- **D-05:** 创建 `src/composables/animation/useImageTransition.ts`
  - 导出 `useImageTransition()` 函数
  - 返回接口：`{ slideDirection, isAnimating, reducedMotion, transitionName }`
  - 使用 VueUse 的 `usePreferredReducedMotion()` 检测用户偏好
  - 理由：封装动画状态逻辑，便于 ImagePreview 集成

### Composable 功能定义 (D-06 ~ D-08)

- **D-06:** 动画方向状态管理
  - `slideDirection`: `'slide-left' | 'slide-right'` 响应式状态
  - 提供 `setDirection(direction: 'prev' | 'next')` 方法
  - 'prev' → 'slide-left'（新图从左侧进入）
  - 'next' → 'slide-right'（新图从右侧进入）
  - 理由：与现有 ImagePreview 导航逻辑一致

- **D-07:** 动画状态追踪
  - `isAnimating`: `Ref<boolean>` 动画进行中状态
  - 通过 Vue Transition 事件（@after-enter/@after-leave）更新
  - 理由：可用于禁用导航按钮、防止快速点击

- **D-08:** reduced-motion 检测
  - `reducedMotion`: `ComputedRef<boolean>` 用户偏好
  - `transitionName`: `ComputedRef<string>` 根据偏好返回动画名称
  - reduced-motion 时返回 'fade'，否则返回 slideDirection
  - 理由：响应式适配用户系统偏好

### Claude's Discretion

- CSS 文件中是否添加前缀（-webkit- 等）
- composable 中是否添加动画时长配置项
- 是否在 composable 中添加 `onMounted`/`onUnmounted` 生命周期钩子
- CSS 类命名前缀规范

</decisions>

<specifics>
## Specific Ideas

- 动画参数基于 RESEARCH.md 的性能分析结论
- 关键帧模板参考 animate.css 风格，便于理解
- composable 设计参考现有 `useAlert` 的接口风格

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 项目规划
- `.planning/PROJECT.md` — 项目核心价值、约束条件（功能行为不变）
- `.planning/ROADMAP.md` — Phase 25 定义和成功标准
- `.planning/REQUIREMENTS.md` — ARCH-01, ARCH-02 需求详情

### 研究文档
- `.planning/research/SUMMARY.md` — 动画性能优化研究结论
- `.planning/research/PITFALLS.md` §9 — CSS/Vue 动画性能陷阱

### 前置阶段上下文
- `.planning/phases/24-imagepreview-switch-animation/24-CONTEXT.md` — 现有动画实现

### 关键代码文件

#### 现有动画实现（参考）
- `src/components/ImagePreview.vue` — 现有动画类使用方式
- `src/static/css/common.css` — 现有 CSS 文件结构参考

#### 现有 Composable 模式（参考）
- `src/composables/core/useAlert.ts` — Composable 接口风格参考
- `src/composables/index.ts` — Composable 导出方式

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

#### ImagePreview.vue 现有动画类使用
```vue
<Transition :name="slideDirection" mode="out-in">
  <img :key="imgInfo.id" ...>
</Transition>
```
- 已使用 Vue Transition 组件
- slideDirection 响应式变量控制动画方向
- 需要迁移到使用 composable

#### ImagePreview.vue 现有动画类定义
```css
/* 当前 slide-in-blurred-left/right 定义 */
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
- 包含 blur 滤镜（性能问题）
- transform 过于复杂
- Phase 26 将优化这些关键帧

#### useAlert composable 接口风格
```typescript
export interface UseAlertReturn {
  alert: Reactive<AlertState>
  showAlert: (message: string, type?: AlertType, duration?: number) => void
  hideAlert: () => void
  // ...
}

export function useAlert(defaultDuration = 3000): UseAlertReturn
```
- 返回接口明确定义
- 使用 reactive/ref 管理状态
- 提供 action 方法

### Established Patterns

- **CSS 文件位置**: `src/static/css/` 目录
- **Composable 文件位置**: `src/composables/{domain}/use{Feature}.ts`
- **Composable 导出**: 通过 `src/composables/index.ts` 统一导出
- **TypeScript 接口**: 显式定义返回类型接口

### Integration Points

- `src/static/css/animations.css` — 新文件，需在 main.ts 或 App.vue 中导入
- `src/composables/animation/useImageTransition.ts` — 新文件
- `src/composables/index.ts` — 需添加新 composable 导出
- Phase 26 将修改 ImagePreview.vue 使用新文件

</code_context>

<deferred>
## Deferred Ideas

None — 本阶段为基础设施创建，范围明确。

### 后续阶段

- **Phase 26**: 使用 animations.css 优化现有动画，移除 blur 滤镜
- **Phase 27**: 优化预览窗口打开/关闭动画
- **Phase 28**: ImagePreview 集成 composable，完成 reduced-motion 支持

</deferred>

---

*Phase: 25-animation-infrastructure*
*Context gathered: 2026-04-30*
