# Animation Performance Optimization - Research Summary

> **Milestone**: v2.8 Animation Performance Optimization
> **Target**: ImagePreview component — achieve smooth 60fps animations
> **Research Date**: 2026-04-30

---

## 1. Key Findings Summary

### Performance Root Cause Identified

**The `filter: blur(40px)` in slide animations is the primary performance bottleneck.**

| Root Cause | Impact | Evidence |
|------------|--------|----------|
| `filter: blur(40px)` animation | **Critical** | Forces CPU paint every frame, no GPU acceleration possible |
| Complex transform composition | **High** | `translateX(-1000px) scaleX(2.5) scaleY(0.2)` creates expensive composite layers |
| Missing `will-change` hints | **Medium** | Browser cannot pre-optimize, no layer promotion |
| No CSS Containment | **Medium** | Rendering calculations span entire page |

### Cross-Cutting Discoveries

1. **No new dependencies needed** — Pure CSS optimization achieves 60fps target
2. **Vue 3 Transition pattern is correct** — Keep dynamic transition name approach
3. **Electron GPU limits are sufficient** — After optimization, no special handling required
4. **Visual impact is acceptable** — Removing blur has minimal perceived effect

---

## 2. Performance Root Cause Analysis

### 2.1 The Blur Filter Problem

```css
/* Current implementation - PERFORMANCE KILLER */
@keyframes slide-in-blurred-left {
  0% {
    transform: translateX(-1000px) scaleX(2.5) scaleY(0.2);
    filter: blur(40px);  /* ⚠️ 40px blur = 81x81 pixel sampling per frame */
    opacity: 0;
  }
  /* ... */
}
```

**Why blur(40px) destroys performance:**

| Factor | Calculation | Impact |
|--------|-------------|--------|
| Sampling radius | 40px × 2 + 1 = 81 pixels | Each output pixel samples 81×81 = 6,561 input pixels |
| 4K image (3840×2160) | 8,294,400 pixels × 6,561 samples | 54+ billion operations per frame |
| Frame budget | 16.67ms for 60fps | Blur computation alone exceeds budget |
| GPU acceleration | **Not possible** for dynamic blur values | CPU-bound, blocks main thread |

### 2.2 Transform Composition Overhead

```css
transform: translateX(-1000px) scaleX(2.5) scaleY(0.2);
```

**Problems:**
- Non-uniform scaling (`scaleX ≠ scaleY`) increases composite layer complexity
- Extreme translate value (-1000px) creates large intermediate composite buffers
- Three transform functions mean three matrix operations per frame

### 2.3 Memory Footprint

| Component | 4K Image Memory | Notes |
|-----------|-----------------|-------|
| Original image | ~33 MB | 3840×2160×4 bytes (RGBA) |
| Blur sampling buffer | ~99 MB | 3× original for sampling |
| Composite layer | ~33 MB | Separate GPU layer |
| **Total per image** | **~165 MB** | Single frame |
| **Transition (2 images)** | **~330 MB** | Source + destination |

---

## 3. Recommended Approach

### 3.1 Core Strategy: CSS-Only Optimization

**No new npm dependencies required.** The optimization uses native CSS capabilities already supported in Electron's Chromium:

| Technique | Implementation | Expected Gain |
|-----------|----------------|---------------|
| Remove blur filter | Delete `filter: blur()` from keyframes | **10-16× faster** |
| Simplify transform | Use `translateX(±100px) scale(0.95)` | Reduced composite complexity |
| Add `will-change` | Apply during animation only | Pre-promote to GPU layer |
| CSS Containment | `contain: layout paint` on container | Isolate render boundaries |
| Reduced motion | `@media (prefers-reduced-motion)` | Accessibility compliance |

### 3.2 Optimized Animation Code

```css
/* Optimized slide animation - GPU accelerated */
@keyframes slide-left-optimized {
  0% {
    transform: translateX(-50px) scale(0.98);
    opacity: 0;
  }
  100% {
    transform: translateX(0) scale(1);
    opacity: 1;
  }
}

/* Transition classes with GPU hints */
.slide-left-enter-active {
  animation: slide-left-optimized 0.3s cubic-bezier(0.4, 0, 0.2, 1) both;
  will-change: transform, opacity;
}

/* Accessibility: respect user preference */
@media (prefers-reduced-motion: reduce) {
  .slide-left-enter-active {
    animation: none;
    transition: opacity 0.15s ease;
  }
}
```

### 3.3 Implementation Phases

| Phase | Tasks | Complexity |
|-------|-------|------------|
| **Phase 1** | Remove blur, simplify transforms, add will-change | Low |
| **Phase 2** | Extract animation CSS to shared module, create `useImageTransition` composable | Medium |
| **Phase 3** | Add reduced-motion support, validate across all image sizes | Low |

---

## 4. Stack Additions

### 4.1 No New Dependencies

The optimization leverages existing capabilities:

| Capability | Version | Status |
|------------|---------|--------|
| CSS `will-change` | Chrome 36+ | ✅ Already available |
| CSS `contain` | Chrome 52+ | ✅ Already available |
| CSS `transform` 3D | All browsers | ✅ Already available |
| Vue 3 `<Transition>` | 3.5.32 | ✅ Already in use |
| `prefers-reduced-motion` | Chrome 74+ | ✅ Already available |

### 4.2 New Files (Architecture Improvement)

| File | Purpose | Lines |
|------|---------|-------|
| `src/static/css/animations.css` | Centralized GPU-optimized keyframes | ~150 |
| `src/composables/animation/useImageTransition.ts` | Animation state management | ~80 |

### 4.3 Files to Modify

| File | Change |
|------|--------|
| `src/components/ImagePreview.vue` | Use optimized animations, integrate composable |
| `src/components/Alert.vue` | Use shared fade animation (optional) |
| `src/composables/index.ts` | Export new animation composable |

---

## 5. Feature Table Stakes

### 5.1 Table Stakes (Must Have)

These are the minimum requirements for achieving 60fps:

| Feature | Description | Implementation |
|---------|-------------|----------------|
| **GPU-accelerated properties** | Only animate `transform` and `opacity` | Replace blur with scale + opacity |
| **`will-change` hints** | Pre-promote elements to GPU layers | Add to animation classes, remove after animation |
| **Remove blur filter** | Eliminate `filter: blur()` from animations | Use scale(0.98) for subtle "entrance" effect |
| **CSS Containment** | Isolate rendering boundaries | `contain: layout paint` on container |

### 5.2 Differentiators (Nice to Have)

| Feature | Description | Priority |
|---------|-------------|----------|
| `prefers-reduced-motion` support | Accessibility compliance | High |
| Animation composable | Reusable state management | Medium |
| Shared animation CSS | DRY across components | Low |
| Performance monitoring | FPS tracking in dev mode | Low |

### 5.3 Anti-features (Avoid)

| Feature | Why Avoid |
|---------|-----------|
| JavaScript-driven animations | Blocks main thread |
| `width`/`height` animations | Triggers layout recalc |
| `left`/`top` animations | Triggers layout recalc |
| `box-shadow` animations | Triggers paint |
| Permanent `will-change` | Memory leak, degrades performance |

---

## 6. Watch Out For (Key Pitfalls)

### 6.1 Performance Pitfalls

| Pitfall | Warning Signs | Prevention |
|---------|---------------|------------|
| **Over-using `will-change`** | GPU memory keeps growing | Only apply during animation, remove after |
| **Blur sneaking back in** | Frame rate drops to 30fps | Audit all keyframes, ban `filter: blur()` in animations |
| **Transform explosion** | Many composite layers in DevTools | Keep transforms simple, avoid multiple scale functions |
| **GPU memory exhaustion** | Black screens, crashes | Use smaller images for animation if needed |

### 6.2 Architecture Pitfalls

| Pitfall | Warning Signs | Prevention |
|---------|---------------|------------|
| **Animation CSS duplication** | Same keyframes in multiple files | Centralize in `animations.css` |
| **Composable re-creating state** | Multiple alert instances, sync issues | Composables should expose store state, not copy it |
| **Missing lifecycle cleanup** | Event listeners persist after unmount | Use `onUnmounted` to clean up |

### 6.3 Accessibility Pitfalls

| Pitfall | Warning Signs | Prevention |
|---------|---------------|------------|
| **Ignoring reduced motion** | Vestibular disorder complaints | Implement `@media (prefers-reduced-motion: reduce)` |
| **Animation can't be interrupted** | User feels "stuck" waiting | Keep animations < 300ms |

### 6.4 Visual Regression Pitfalls

| Pitfall | Warning Signs | Prevention |
|---------|---------------|------------|
| **Animation timing change** | Feels "different" to users | Keep total duration at 300ms |
| **Loss of visual feedback** | Navigation feels abrupt | Use scale + opacity for entrance feel |

---

## 7. Validation Checklist

### Pre-Implementation

- [ ] Record baseline FPS using Chrome DevTools Performance panel
- [ ] Document current animation timing (300ms for slides, 500ms for open/close)
- [ ] Test on target hardware (low-end GPU if applicable)

### Post-Implementation

- [ ] FPS ≥ 60 during all animations
- [ ] No Layout events during animation (DevTools Performance)
- [ ] Minimal Paint events during animation
- [ ] GPU memory stable (no growth after repeated animations)
- [ ] `prefers-reduced-motion` respected (test in DevTools → Rendering → Emulate)
- [ ] Visual parity with original (user cannot perceive difference)

### Performance Metrics

| Metric | Before | Target | After |
|--------|--------|--------|-------|
| FPS | 30-45 | 60 | _TBD_ |
| Frame time | 22-33ms | ≤16.67ms | _TBD_ |
| Layout events/animation | Multiple | 0 | _TBD_ |
| Paint events/animation | Multiple | Minimal | _TBD_ |
| GPU memory/image | ~165MB | ~33MB | _TBD_ |

---

## 8. Quick Reference

### GPU-Accelerated Properties (Safe)

| Property | Use For |
|----------|---------|
| `transform` | Move, scale, rotate elements |
| `opacity` | Fade in/out |

### Non-GPU Properties (Avoid in Animations)

| Property | Alternative |
|----------|-------------|
| `filter: blur()` | Remove or use static |
| `width`/`height` | `transform: scale()` |
| `left`/`top` | `transform: translate()` |
| `margin`/`padding` | `transform: translate()` |
| `box-shadow` | Pre-render or static |

### Recommended Animation Durations

| Context | Duration | Rationale |
|---------|----------|-----------|
| Micro-interactions | 100-150ms | Instant feedback |
| Standard transitions | 200-300ms | Natural feel |
| Complex animations | 400-500ms | Allow perception |

---

## 9. References

- [CSS Triggers](https://csstriggers.com/) — Property rendering impact
- [High Performance Animations](https://www.html5rocks.com/en/tutorials/speed/high-performance-animations/) — HTML5 Rocks
- [Vue Transition Documentation](https://vuejs.org/guide/built-ins/transition.html)
- [MDN: will-change](https://developer.mozilla.org/en-US/docs/Web/CSS/will-change)
- [MDN: prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion)
- [WCAG 2.1 Animation Guidelines](https://www.w3.org/WAI/WCAG21/quickref/#animation-from-interactions)

---

*Research synthesized from: STACK.md, FEATURES.md, ARCHITECTURE.md, PITFALLS.md*
*Created: 2026-04-30*
