# Phase 29: LoadingOverlay Animation Optimization - Research

**Date:** 2026-04-30
**Phase:** 29 - LoadingOverlay Animation Optimization

---

## 1. Current Implementation Analysis

### LoadingOverlay.vue Current State

```vue
<template>
  <Transition name="fade">
    <div v-if="show" class="loading-overlay">
      <div class="loading-content">
        <i class="fas fa-spinner fa-spin loading-icon" />
        <p v-if="text" class="loading-text">{{ text }}</p>
      </div>
    </div>
  </Transition>
</template>
```

**Key observations:**
1. Uses Vue 3 `<Transition>` with `name="fade"`
2. Icon uses FontAwesome `fa-spin` class for rotation
3. Has `backdrop-filter: blur(2px)` on overlay
4. Transition duration: `0.3s ease`
5. No reduced-motion support
6. No shared CSS import

### Current CSS Structure

```css
.loading-overlay {
  backdrop-filter: blur(2px);  /* PERFORMANCE BOTTLENECK */
  background: rgba(0, 0, 0, 0.6);
  z-index: 9998;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;  /* Should use shared animations.css */
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
```

---

## 2. Shared Animations Analysis (Phase 25)

### animations.css Structure

Location: `src/static/css/animations.css`

**Key resources available:**

1. **Fade keyframe:**
```css
@keyframes fade {
  0% { opacity: 0; }
  100% { opacity: 1; }
}
```

2. **Reduced-motion pattern:**
```css
@media (prefers-reduced-motion: reduce) {
  .slide-left-enter-active,
  .slide-left-leave-active,
  .slide-right-enter-active,
  .slide-right-leave-active {
    animation: fade 0.15s ease-out both;
    will-change: opacity;
  }
}
```

3. **Import pattern (from ImagePreview.vue):**
```css
@import url("@/static/css/animations.css");
```

**Gap identified:** animations.css has `@keyframes fade` but no `.fade-enter-active` / `.fade-leave-active` Vue transition classes. These need to be added.

---

## 3. Reduced-Motion Pattern from ImagePreview.vue

### Implementation Pattern

ImagePreview.vue demonstrates the reduced-motion approach:

1. **Import shared CSS:**
```css
@import url("@/static/css/animations.css");
```

2. **Use shared animation classes:**
```css
.mask .img-view .img-class.initial-anim {
  animation: modal-open 0.5s cubic-bezier(0.165, 0.84, 0.44, 1) forwards;
  will-change: transform;
}
```

3. **Reduced-motion handled in animations.css:**
```css
@media (prefers-reduced-motion: reduce) {
  .modal-open,
  .modal-close {
    animation: fade 0.15s ease-out both;
    will-change: opacity;
  }
}
```

### fa-spin Disable Pattern

FontAwesome's `fa-spin` uses CSS animation. To disable in reduced-motion:

```css
@media (prefers-reduced-motion: reduce) {
  .fa-spin {
    animation: none;
  }
}
```

---

## 4. backdrop-filter Performance Research

### Why backdrop-filter is a Performance Bottleneck

1. **GPU-intensive:** Each frame requires re-computing the blur effect
2. **No caching:** Cannot be pre-computed; must be recalculated on every paint
3. **Battery drain:** Significant impact on mobile/laptop battery
4. **Jank potential:** Can cause frame drops during animations

### Recommended Alternative

Replace `backdrop-filter: blur(2px)` with:
- Keep `background: rgba(0, 0, 0, 0.6)` — provides sufficient visual separation
- Visual impact is minimal: blur(2px) is subtle, users won't notice absence

**Performance gain:** Eliminates all GPU blur computation during overlay transitions.

---

## 5. fa-spin Animation Disable Approach

### Current Implementation

FontAwesome `fa-spin` applies this CSS:
```css
.fa-spin {
  animation: fa-spin 2s linear infinite;
}

@keyframes fa-spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
```

### Disable in Reduced-Motion

**Option A: Override in component CSS (recommended)**
```css
@media (prefers-reduced-motion: reduce) {
  .loading-icon.fa-spin {
    animation: none;
  }
}
```

**Option B: Add to animations.css (shared utility)**
```css
@media (prefers-reduced-motion: reduce) {
  .fa-spin {
    animation: none !important;
  }
}
```

**Recommendation:** Option A — keep it in component CSS for explicitness.

---

## 6. Integration Points

### Component Usage

LoadingOverlay is used in:
- `src/components/OnlineWallpaper.vue`

```vue
<LoadingOverlay :show="loading" text="加载中..." />
```

**Interface (unchanged):**
```typescript
defineProps<{
  show: boolean
  text?: string
}>()
```

### Dependencies

| Dependency | Status | Notes |
|------------|--------|-------|
| animations.css | ✓ Available | Phase 25 created |
| ImagePreview.vue pattern | ✓ Reference | Reduced-motion implementation |
| FontAwesome fa-spin | ✓ Available | No changes needed |

---

## 7. Implementation Requirements

### Required Changes

| Change | File | Priority |
|--------|------|----------|
| Remove `backdrop-filter: blur(2px)` | LoadingOverlay.vue | HIGH |
| Change transition from 0.3s to 0.2s | LoadingOverlay.vue | MEDIUM |
| Import animations.css | LoadingOverlay.vue | MEDIUM |
| Add fade transition classes to animations.css | animations.css | MEDIUM |
| Add reduced-motion support for fa-spin | LoadingOverlay.vue | MEDIUM |

### animations.css Extension Needed

Add Vue transition classes for fade:
```css
/* ===== Fade Transition (Vue Transition) ===== */

.fade-enter-active,
.fade-leave-active {
  animation: fade 0.2s ease-out both;
  will-change: opacity;
}

@media (prefers-reduced-motion: reduce) {
  .fade-enter-active,
  .fade-leave-active {
    animation: fade 0.15s ease-out both;
  }
}
```

---

## 8. Validation Architecture

### Test Scenarios

| Scenario | Expected Result |
|----------|-----------------|
| Show overlay | Fade in 0.2s, no blur computation |
| Hide overlay | Fade out 0.2s |
| Reduced-motion | No fa-spin, instant opacity transition |
| Visual appearance | Semi-transparent dark overlay, loading icon visible |

### Performance Verification

| Metric | Before | After |
|--------|--------|-------|
| GPU operations | blur(2px) per frame | None |
| Transition duration | 0.3s | 0.2s |
| Reduced-motion | None | Full support |

### Acceptance Criteria

1. ✓ No `backdrop-filter` in LoadingOverlay.vue
2. ✓ Transition uses 0.2s duration
3. ✓ `@import url("@/static/css/animations.css")` present
4. ✓ `@media (prefers-reduced-motion: reduce)` disables fa-spin
5. ✓ Component interface unchanged (props: show, text)
6. ✓ TypeScript compilation passes
7. ✓ Visual appearance unchanged (dark semi-transparent overlay)

---

## 9. Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| Visual change perceived | Low | Test side-by-side; blur(2px) is minimal |
| Reduced-motion users confused | Low | Static icon still shows "loading" state |
| CSS import conflicts | None | animations.css uses scoped classes |

---

## 10. Summary

**Phase 29 is a focused optimization with clear scope:**

1. **Primary goal:** Remove performance bottleneck (backdrop-filter)
2. **Secondary goal:** Consistency with project animation standards (0.2s, animations.css)
3. **Tertiary goal:** Accessibility compliance (reduced-motion)

**Implementation complexity:** LOW
- Single file modification (LoadingOverlay.vue)
- Minor addition to shared CSS (animations.css)
- No interface changes
- No behavioral changes

**Estimated changes:**
- ~10 lines removed from LoadingOverlay.vue
- ~5 lines added to LoadingOverlay.vue
- ~10 lines added to animations.css

---

*Research completed: 2026-04-30*
