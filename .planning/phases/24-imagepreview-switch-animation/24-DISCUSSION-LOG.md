# Phase 24: ImagePreview Switch Animation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-29
**Phase:** 24-imagepreview-switch-animation
**Areas discussed:** 动画类型选择, 动画方向映射, 动画触发时机

---

## 动画类型选择

| Option | Description | Selected |
|--------|-------------|----------|
| 滑动动画 | 使用 slide-in-left/slide-in-right，符合常见图片库交互习惯 | ✓ |
| 旋转动画 | 使用 rotate-in-diag-1/rotate-in-diag-2 动画类（animate.css 中已定义） | |
| 中心旋转动画 | 使用 rotate-in-center 动画类（animate.css 中已定义） | |

**User's choice:** 滑动动画 (推荐)
**Notes:** 用户明确要求使用 animate.css 中的 slide-in-left 和 slide-in-right

---

## 动画方向映射

| Option | Description | Selected |
|--------|-------------|----------|
| 自然映射 | 下一张：图片从右侧滑入 (slide-in-right)，上一张：图片从左侧滑入 (slide-in-left)，符合物理直觉 | ✓ |
| 反向映射 | 下一张：图片从左侧滑入，上一张：图片从右侧滑入，反向效果 | |
| 单向动画 | 无论上一张还是下一张，都使用 slide-in-right 动画 | |

**User's choice:** 自然映射 (推荐)
**Notes:** 符合物理直觉，新图片从操作方向出现

---

## 动画触发时机

| Option | Description | Selected |
|--------|-------------|----------|
| 图片切换时触发 | 父组件更新 imgInfo prop 后，图片立即应用动画 | |
| 图片加载后触发 | 图片加载完成后才开始动画，需要监听 img.onload 事件 | |
| 旧图片滑出 + 新图片滑入 | 点击导航按钮时先播放旧图片滑出动画，再播放新图片滑入 | ✓ |

**User's choice:** 旧图片滑出 + 新图片滑入
**Notes:** 双向动画，视觉效果更流畅

---

## 旧图片滑出处理

| Option | Description | Selected |
|--------|-------------|----------|
| 旧图片反向滑出 | 新图片从反方向滑入，同时旧图片向操作方向滑出，视觉效果为"替换" | ✓ |
| 旧图片淡出 | 旧图片直接淡出消失，新图片滑入 | |
| 旧图片无动画 | 新图片滑入覆盖在旧图片上，旧图片无动画 | |

**User's choice:** 旧图片反向滑出 (推荐)
**Notes:** 需要创建 slide-out-left/slide-out-right 动画类

---

## 动画资源

| Option | Description | Selected |
|--------|-------------|----------|
| 添加滑出动画类 | 创建 slide-out-left 和 slide-out-right 动画类 | ✓ |
| 复用现有动画 | 尝试使用 CSS 过渡或反向播放滑入动画 | |

**User's choice:** 添加滑出动画类 (推荐)
**Notes:** animate.css 中无滑出动画类，需要新增

---

## 动画参数

| Option | Description | Selected |
|--------|-------------|----------|
| 保持默认 | 时长 0.5s，缓动曲线 cubic-bezier(0.25, 0.46, 0.45, 0.94) | ✓ |
| 自定义参数 | 根据用户偏好调整动画时长或缓动曲线 | |

**User's choice:** 保持默认 (推荐)
**Notes:** 与 animate.css 现有动画保持一致

---

## Claude's Discretion

- Vue transition 或动态 class 的具体实现方式
- 动画期间是否禁用导航按钮
- 键盘操作时的动画处理
- 动画重叠期间的性能优化

## Deferred Ideas

None — 讨论保持在阶段范围内。

---

*Phase: 24-imagepreview-switch-animation*
*Discussion completed: 2026-04-29*
