# Phase 24: ImagePreview Switch Animation - Context

**Gathered:** 2026-04-29
**Status:** Ready for planning

<domain>
## Phase Boundary

为 ImagePreview 组件的图片切换功能添加滑动动画效果，使用 animate.css 中已定义的 `slide-in-left` 和 `slide-in-right` 动画类，并新增 `slide-out-left` 和 `slide-out-right` 滑出动画类。

**核心交付物：**
1. 图片切换时播放双向滑动动画（旧图片滑出 + 新图片滑入）
2. 动画方向与导航操作自然映射
3. 添加滑出动画类到 animate.css
4. 所有现有功能行为不变

**阶段边界：**
- 仅修改 ImagePreview.vue 组件的动画行为
- 修改 animate.css 添加滑出动画类
- 不改变导航逻辑、键盘交互等现有功能

**当前状态：**
- ✅ ImagePreview 组件已有导航功能（Phase 15）
- ✅ animate.css 已有 slide-in-left/slide-in-right 动画类
- ❌ 图片切换无动画效果
- ❌ animate.css 缺少滑出动画类

</domain>

<decisions>
## Implementation Decisions

### 动画类型 (D-01)

- **D-01:** 使用滑动动画 (slide-in-left/slide-in-right)
  - 新图片从操作方向滑入
  - 与常见图片库交互习惯一致
  - 理由：用户已明确指定使用 animate.css 中的滑动动画

### 动画方向映射 (D-02)

- **D-02:** 自然映射方向
  - **下一张**：新图片从右侧滑入 (slide-in-right)，旧图片向左滑出 (slide-out-left)
  - **上一张**：新图片从左侧滑入 (slide-in-left)，旧图片向右滑出 (slide-out-right)
  - 理由：符合物理直觉，新图片从操作方向出现，旧图片向反方向离开

### 动画触发时机 (D-03 ~ D-05)

- **D-03:** 双向动画（旧图片滑出 + 新图片滑入）
  - 点击导航按钮时同时触发两个动画
  - 旧图片向反方向滑出，新图片从操作方向滑入
  - 理由：视觉效果更流畅，有"替换"的感觉

- **D-04:** 添加滑出动画类
  - 创建 `slide-out-left`：向左滑出 (translateX: 0 → -1000px)
  - 创建 `slide-out-right`：向右滑出 (translateX: 0 → 1000px)
  - 理由：animate.css 中无滑出动画类，需要新增

- **D-05:** 动画参数保持默认
  - 时长：0.5s
  - 缓动曲线：cubic-bezier(0.25, 0.46, 0.45, 0.94)
  - 理由：与 animate.css 现有动画保持一致

### Claude's Discretion

- Vue transition 或动态 class 的具体实现方式
- 动画期间是否禁用导航按钮
- 键盘操作时的动画处理
- 动画重叠期间的性能优化

</decisions>

<specifics>
## Specific Ideas

- 动画方向与操作方向自然对应：下一张=新图从右来，上一张=新图从左来
- 旧图片向反方向滑出，形成"被替换"的视觉效果
- 双向动画同时播放，确保流畅的过渡体验

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 项目规划
- `.planning/PROJECT.md` — 项目核心价值、约束条件（功能行为不变）
- `.planning/ROADMAP.md` — Phase 24 定义

### 前置阶段上下文
- `.planning/phases/15-imagepreview-navigation/15-CONTEXT.md` — 导航功能实现上下文

### 关键代码文件

#### 目标组件（需要修改）
- `src/components/ImagePreview.vue` — 添加动画逻辑
- `src/static/css/animate.css` — 添加滑出动画类

#### 动画参考
- `src/static/css/animate.css` — 现有 slide-in-left/slide-in-right 动画定义

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

#### animate.css 现有动画定义
```css
/* slide-in-left: 从左侧滑入 */
.slide-in-left {
  -webkit-animation: slide-in-left 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) both;
  animation: slide-in-left 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) both;
}

/* slide-in-right: 从右侧滑入 */
.slide-in-right {
  -webkit-animation: slide-in-right 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) both;
  animation: slide-in-right 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) both;
}
```

#### ImagePreview.vue 导航方法（需添加动画触发）
```typescript
const navigatePrev = () => {
  if (canNavigatePrev.value) {
    emit('navigate', 'prev')
  }
}

const navigateNext = () => {
  if (canNavigateNext.value) {
    emit('navigate', 'next')
  }
}
```

#### ImagePreview.vue 图片显示结构
```vue
<div class="img-view">
  <img v-if="imgInfo" class="img-class" :src="imgInfo.path" :style="{'max-height':calHeight}">
</div>
```

### Integration Points

- `src/components/ImagePreview.vue` — 添加动画 class 绑定逻辑
- `src/static/css/animate.css` — 添加 slide-out-left/slide-out-right 动画类
- 父组件更新 imgInfo 时触发动画

### 需要新增的动画类

```css
/* slide-out-left: 向左滑出 */
@keyframes slide-out-left {
  0% {
    -webkit-transform: translateX(0);
    transform: translateX(0);
    opacity: 1;
  }
  100% {
    -webkit-transform: translateX(-1000px);
    transform: translateX(-1000px);
    opacity: 0;
  }
}

/* slide-out-right: 向右滑出 */
@keyframes slide-out-right {
  0% {
    -webkit-transform: translateX(0);
    transform: translateX(0);
    opacity: 1;
  }
  100% {
    -webkit-transform: translateX(1000px);
    transform: translateX(1000px);
    opacity: 0;
  }
}
```

</code_context>

<deferred>
## Deferred Ideas

None — 本阶段功能明确，无延后需求。

### Future Enhancements (Out of Scope)

- 循环浏览模式（最后一张后跳到第一张）
- 图片缩放功能
- 图片拖拽排序
- 全屏模式
- 更多动画类型选择（旋转、淡入淡出等）

</deferred>

---

*Phase: 24-imagepreview-switch-animation*
*Context gathered: 2026-04-29*
