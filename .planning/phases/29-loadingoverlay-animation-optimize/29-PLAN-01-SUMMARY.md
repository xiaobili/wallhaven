---
phase: 29
plan: 01
subsystem: ui
tags: [performance, animation, reduced-motion, accessibility]
key-files:
  created: []
  modified:
    - src/components/LoadingOverlay.vue
    - src/static/css/animations.css
metrics:
  lines_removed: 12
  lines_added: 34
  files_modified: 2
---

# Plan 29-01: LoadingOverlay Animation Performance Optimization

## Summary

优化 LoadingOverlay 组件动画性能，消除 `backdrop-filter: blur(2px)` 性能瓶颈，统一使用共享动画 CSS，添加 reduced-motion 可访问性支持。

## Changes

### animations.css

添加 Vue fade transition 类：

```css
.fade-enter-active,
.fade-leave-active {
  animation: fade 0.2s ease-out both;
  will-change: opacity;
}
```

包含 `@media (prefers-reduced-motion: reduce)` 支持。

### LoadingOverlay.vue

| Before | After |
|--------|-------|
| `backdrop-filter: blur(2px)` | 已移除（性能瓶颈） |
| `transition: opacity 0.3s ease` | 复用 animations.css (0.2s) |
| 无 reduced-motion 支持 | fa-spin 在 reduced-motion 下禁用 |

## Commits

| Commit | Description |
|--------|-------------|
| `282dd2d` | perf(LoadingOverlay): optimize animation performance |

## Verification

- [x] TypeScript compilation passes (`npx vue-tsc --noEmit`)
- [x] backdrop-filter 已移除
- [x] animations.css 导入已添加
- [x] reduced-motion 支持已添加
- [x] 过渡时长统一为 0.2s

## Deviations

None — 实现完全按照 CONTEXT.md 决策执行。

## Self-Check: PASSED

所有 acceptance criteria 验证通过，TypeScript 编译无错误。
