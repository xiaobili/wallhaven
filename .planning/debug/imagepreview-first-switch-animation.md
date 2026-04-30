---
status: fixing
trigger: "ImagePreview 第一次切换图片，划出动画没有显示"
created: 2026-04-30
updated: 2026-04-30
---

# Debug Session: imagepreview-first-switch-animation

## Symptoms

**Expected behavior:**
当切换图片时，图片应该平滑滑出屏幕（向左/右滑出视图区域）

**Actual behavior:**
新图片有动画，旧图片没有（新图片出现时有动画，但旧图片消失时没有）

**Error messages:**
无

**Timeline:**
不确定具体什么时候开始的

**Reproduction:**
只在第一次切换时出现（第一次切换时有问题，后续切换正常）

## Current Focus

hypothesis: CSS 动画冲突导致 Vue Transition 状态混乱。打开预览时，`initial-anim` 类的 `modal-open` 动画（特异性 0-0-4）覆盖了 Vue Transition 的 `slide-left-enter-active` 动画（特异性 0-0-1），两者都修改 `transform` 属性。这导致 Vue 的 `animationend` 事件触发时机不正确，影响后续 leave 动画。
test: 移除打开时的 Vue Transition enter 动画，只保留 `initial-anim` 的 `modal-open` 动画
expecting: 第一次切换时 leave 动画正常显示
next_action: 实现修复方案 - 在打开预览时跳过 Vue Transition 的 enter 动画
reasoning_checkpoint: 

## Evidence

- timestamp: 2026-04-30
  observation: ImagePreview.vue 第 38 行，图片同时受 `initial-anim` 类和 Vue Transition 控制
  file: src/components/ImagePreview.vue
  line: 38

- timestamp: 2026-04-30
  observation: animations.css 中 `slide-left-enter-active` 和 `modal-open` 都修改 transform
  file: src/static/css/animations.css
  lines: 17-26, 60-67

- timestamp: 2026-04-30
  observation: CSS 特异性 `.mask .img-view .img-class.initial-anim` (0-0-4) > `.slide-left-enter-active` (0-0-1)
  file: src/static/css/animations.css

## Eliminated

## Resolution

root_cause: CSS 动画冲突。打开预览时，`initial-anim` 类的 `modal-open` 动画和 Vue Transition 的 `slide-left-enter-active` 动画同时运行，都修改 `transform` 属性。由于 `.mask .img-view .img-class.initial-anim` 的 CSS 特异性 (0-0-4) 高于 `.slide-left-enter-active` (0-0-1)，`modal-open` 动画覆盖了 slide 动画。这导致 Vue Transition 的 `animationend` 事件触发时机不正确，内部状态混乱，影响第一次切换时的 leave 动画。

fix: 
1. 添加 `effectiveTransitionName` 计算属性，当 `isInitialOpen` 为 true 时返回 `'noop'`
2. 在 `animations.css` 中添加 `.noop-enter-active` 和 `.noop-leave-active` 类，设置 `animation: none`
3. 这样打开预览时 Vue Transition 不执行动画，只有 `modal-open` 动画运行，避免冲突

verification: 手动测试 - 打开预览，第一次切换图片时观察旧图片是否有滑出动画
files_changed: 
  - src/components/ImagePreview.vue
  - src/static/css/animations.css 
