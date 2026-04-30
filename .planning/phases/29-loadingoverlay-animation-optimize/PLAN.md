---
phase: 29
plan: LoadingOverlay Animation Optimization
type: optimization
wave: 1
depends_on: []
files_modified:
  - src/components/LoadingOverlay.vue
  - src/static/css/animations.css
autonomous: true
---

# Phase 29: LoadingOverlay Animation Optimization

<objective>
优化 LoadingOverlay 组件动画性能，消除 GPU 开销和卡顿，添加 reduced-motion 支持。
</objective>

---

## Task 1: Add Fade Transition Classes to animations.css

<read_first>
- src/static/css/animations.css
</read_first>

<action>
在 `src/static/css/animations.css` 文件的 `/* ===== Reduced Motion Support ===== */` 注释之前添加以下代码块：

```css
/* ===== Fade Transition (Vue Transition) ===== */

/**
 * Fade Transition
 * Used by LoadingOverlay.vue and other components
 */
.fade-enter-active,
.fade-leave-active {
  animation: fade 0.2s ease-out both;
  will-change: opacity;
}
```

并在 `@media (prefers-reduced-motion: reduce)` 媒体查询块内添加：

```css
  .fade-enter-active,
  .fade-leave-active {
    animation: fade 0.15s ease-out both;
  }
```
</action>

<acceptance_criteria>
```bash
# 验证 fade transition 类存在
grep -n "\.fade-enter-active" src/static/css/animations.css
grep -n "\.fade-leave-active" src/static/css/animations.css
grep -n "animation: fade 0.2s ease-out both" src/static/css/animations.css
```
</acceptance_criteria>

---

## Task 2: Optimize LoadingOverlay.vue - Remove Blur and Add Import

<read_first>
- src/components/LoadingOverlay.vue
- src/static/css/animations.css
</read_first>

<action>
修改 `src/components/LoadingOverlay.vue`：

1. 删除第 39 行的 `backdrop-filter: blur(2px);`

2. 在 `<style scoped>` 标签后添加 CSS 导入（作为第一条样式规则）：
```css
@import url("@/static/css/animations.css");
```

3. 删除第 60-69 行的内联 fade 过渡定义：
```css
/* 删除以下内容 */
/* 淡入淡出动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
```
</action>

<acceptance_criteria>
```bash
# 验证 backdrop-filter 已移除
! grep -n "backdrop-filter" src/components/LoadingOverlay.vue

# 验证 CSS 导入已添加
grep -n '@import url("@/static/css/animations.css")' src/components/LoadingOverlay.vue

# 验证内联 fade 过渡已移除
! grep -n "transition: opacity 0.3s ease" src/components/LoadingOverlay.vue
```
</acceptance_criteria>

---

## Task 3: Add Reduced-Motion Support for fa-spin

<read_first>
- src/components/LoadingOverlay.vue
</read_first>

<action>
在 `src/components/LoadingOverlay.vue` 的 `<style scoped>` 块末尾（在 `</style>` 之前）添加：

```css
/* Reduced-motion: 禁用旋转动画 */
@media (prefers-reduced-motion: reduce) {
  .loading-icon.fa-spin {
    animation: none;
  }
}
```
</action>

<acceptance_criteria>
```bash
# 验证 reduced-motion 媒体查询存在
grep -n "prefers-reduced-motion" src/components/LoadingOverlay.vue

# 验证 fa-spin 禁用规则存在
grep -n "animation: none" src/components/LoadingOverlay.vue
```
</acceptance_criteria>

---

## Task 4: Verify TypeScript Compilation

<read_first>
- src/components/LoadingOverlay.vue
</read_first>

<action>
运行 TypeScript 编译检查确保无语法错误：
```bash
npx vue-tsc --noEmit
```
</action>

<acceptance_criteria>
```bash
# TypeScript 编译成功（命令返回码 0）
npx vue-tsc --noEmit && echo "SUCCESS"
```
</acceptance_criteria>

---

<verification>
## Verification Steps

1. **功能验证**
   - LoadingOverlay 正常显示/隐藏
   - 过渡效果为 fade（0.2s）
   - 视觉效果：半透明深色遮罩，无模糊效果

2. **性能验证**
   - 无 backdrop-filter GPU 开销
   - 过渡时长从 0.3s 减少到 0.2s

3. **可访问性验证**
   - reduced-motion 模式下 fa-spin 旋转停止
   - loading 图标静态显示

4. **代码验证**
   - animations.css 导入正确
   - 无重复的 fade 过渡定义
</verification>

<success_criteria>
1. `backdrop-filter: blur(2px)` 已从 LoadingOverlay.vue 移除
2. 过渡时长改为 0.2s（通过 animations.css 的 .fade-enter-active）
3. `@import url("@/static/css/animations.css")` 存在于 LoadingOverlay.vue
4. `@media (prefers-reduced-motion: reduce)` 禁用 fa-spin 动画
5. TypeScript 编译通过
6. 组件接口不变（props: show, text）
7. 视觉效果保持半透明遮罩
</success_criteria>

<must_haves>
- 无 backdrop-filter 属性
- 过渡时长 0.2s
- 复用 animations.css
- reduced-motion 支持
- 组件接口不变
</must_haves>

---

*Plan created: 2026-04-30*
