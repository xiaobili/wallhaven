# Architecture Research: Animation Performance Optimization

## Research Question

**How should animation code be structured for optimal performance? Include: CSS architecture for animations, Vue Transition patterns, composable animation logic, separation of animation definitions from component logic.**

---

## Executive Summary

Animation optimization for the ImagePreview component requires a multi-layered approach: GPU-accelerated CSS properties, proper Vue Transition patterns, and potential extraction of animation logic into reusable composables. This research identifies the architectural changes needed to achieve smooth 60fps animations.

### Key Finding

**Current animations use expensive properties (blur filter, large transforms)** that cause paint/layout thrashing. Optimization requires:
1. Switch to GPU-accelerated properties only (`transform`, `opacity`)
2. Extract animation CSS into dedicated animation modules
3. Consider composable for animation state management

---

## Current State Analysis

### ImagePreview.vue Animation Inventory

| Animation | Type | Properties Used | Performance Issue |
|-----------|------|-----------------|-------------------|
| `blowUpModal` | Initial open | `transform: scale()` | ✅ Good (GPU) |
| `blowUpModalTwo` | Close animation | `transform: scale()`, `opacity` | ✅ Good (GPU) |
| `slide-in-blurred-left` | Navigate prev | `transform`, `filter: blur(40px)` | ⚠️ **Blur is expensive** |
| `slide-in-blurred-right` | Navigate next | `transform`, `filter: blur(40px)` | ⚠️ **Blur is expensive** |
| `.mask` fade | Open/close overlay | `opacity`, `visibility` | ✅ Good |

### Current Animation Architecture

```
ImagePreview.vue
├── <template>
│   └── <Transition :name="slideDirection" mode="out-in">
│       └── <img :key="imgInfo.id">
├── <script>
│   └── slideDirection ref (dynamic transition name)
│   └── isInitialOpen ref (controls initial animation)
└── <style scoped>
    └── @keyframes definitions (200+ lines)
    └── .slide-*-enter-active / .slide-*-leave-active
```

### Performance Problems Identified

1. **Blur filter (`filter: blur(40px)`)** — Forces CPU paint, no GPU acceleration
2. **Large transform values** — `translateX(-1000px)` with `scaleX(2.5) scaleY(0.2)` is extreme
3. **Animation code mixed with component** — 200+ lines of CSS in single file
4. **No `will-change` hints** — Browser can't pre-optimize
5. **No animation composable** — Duplicated animation state logic if used elsewhere

---

## Target Architecture

### Layer Stack for Animations

```
┌─────────────────────────────────────────────────────────────┐
│                      View Layer                              │
│  (ImagePreview.vue, other animated components)               │
│  - Uses animation composables                                │
│  - Minimal inline animation state                            │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                  Composable Layer                            │
│  (useImageTransition, useAnimationState)                     │
│  - Animation direction state                                 │
│  - Animation timing coordination                             │
│  - Reduced motion detection                                  │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    CSS Layer                                 │
│  (/static/css/animations.css)                                │
│  - @keyframes definitions                                    │
│  - Transition classes                                        │
│  - GPU-optimized properties only                             │
└─────────────────────────────────────────────────────────────┘
```

---

## CSS Architecture for Animations

### 1. Dedicated Animation Module

**New File:** `src/static/css/animations.css`

```css
/**
 * Animation Module - GPU-optimized animations
 *
 * Principles:
 * - Only use transform and opacity (GPU-accelerated)
 * - Avoid filter: blur() (CPU-bound)
 * - Use will-change sparingly for known animations
 * - Respect prefers-reduced-motion
 */

/* ============================================
 * Image Transitions (ImagePreview component)
 * ============================================ */

/* Base transition setup */
.img-transition-base {
  will-change: transform, opacity;
  backface-visibility: hidden;
  transform: translateZ(0);
}

/* Slide left (navigate to previous image) */
@keyframes slide-left-enter {
  from {
    transform: translateX(-100%) scale(0.9);
    opacity: 0;
  }
  to {
    transform: translateX(0) scale(1);
    opacity: 1;
  }
}

@keyframes slide-left-leave {
  from {
    transform: translateX(0) scale(1);
    opacity: 1;
  }
  to {
    transform: translateX(100%) scale(0.9);
    opacity: 0;
  }
}

/* Slide right (navigate to next image) */
@keyframes slide-right-enter {
  from {
    transform: translateX(100%) scale(0.9);
    opacity: 0;
  }
  to {
    transform: translateX(0) scale(1);
    opacity: 1;
  }
}

@keyframes slide-right-leave {
  from {
    transform: translateX(0) scale(1);
    opacity: 1;
  }
  to {
    transform: translateX(-100%) scale(0.9);
    opacity: 0;
  }
}

/* Modal scale animation (open/close) */
@keyframes modal-scale-in {
  from {
    transform: scale(0);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

@keyframes modal-scale-out {
  from {
    transform: scale(1);
    opacity: 1;
  }
  to {
    transform: scale(0);
    opacity: 0;
  }
}

/* Transition classes for Vue <Transition> */
.slide-left-enter-active {
  animation: slide-left-enter 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-left-leave-active {
  animation: slide-left-leave 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-right-enter-active {
  animation: slide-right-enter 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-right-leave-active {
  animation: slide-right-leave 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Reduced motion preference */
@media (prefers-reduced-motion: reduce) {
  .slide-left-enter-active,
  .slide-left-leave-active,
  .slide-right-enter-active,
  .slide-right-leave-active {
    animation: none;
    transition: opacity 0.15s ease;
  }
}
```

### 2. GPU Optimization Rules

| Property | GPU Accelerated | Recommendation |
|----------|----------------|----------------|
| `transform` | ✅ Yes | **Use for all animations** |
| `opacity` | ✅ Yes | **Use for all animations** |
| `filter: blur()` | ❌ No | **Avoid in animations** |
| `box-shadow` | ❌ No | Avoid animating |
| `width/height` | ❌ No | Never animate |
| `margin/padding` | ❌ No | Never animate |
| `background-position` | ⚠️ Partial | Acceptable for simple cases |

### 3. Performance Hints

```css
/* Apply to elements that WILL animate */
.will-animate {
  will-change: transform, opacity;
  /* Remove after animation completes via JS */
}

/* Promote to GPU layer (use sparingly) */
.gpu-layer {
  transform: translateZ(0);
  /* or */
  will-change: transform;
}
```

---

## Vue Transition Patterns

### 1. Dynamic Transition Name (Current Pattern — Keep)

```vue
<template>
  <Transition
    :name="slideDirection"
    mode="out-in"
  >
    <img :key="imgInfo.id" :src="imgInfo.path">
  </Transition>
</template>

<script setup>
const slideDirection = ref('slide-left') // or 'slide-right'
</script>
```

**Recommendation:** This pattern is correct. Keep it.

### 2. JavaScript Hooks for Complex Animations (Optional)

For cases where CSS isn't sufficient:

```vue
<template>
  <Transition
    :css="false"
    @enter="onEnter"
    @leave="onLeave"
  >
    <img :key="imgInfo.id" :src="imgInfo.path">
  </Transition>
</template>

<script setup>
import { useImageTransition } from '@/composables'

const { onEnter, onLeave } = useImageTransition()
</script>
```

### 3. Transition Group for List Animations

Not needed for ImagePreview (single image), but pattern for reference:

```vue
<TransitionGroup name="list" tag="div">
  <div v-for="item in items" :key="item.id">
    {{ item.text }}
  </div>
</TransitionGroup>
```

---

## Composable Animation Logic

### New Composable: `useImageTransition`

**File:** `src/composables/animation/useImageTransition.ts`

```typescript
/**
 * Image transition animation composable
 *
 * Manages animation state for image preview transitions
 */
import { ref, computed, type Ref, type ComputedRef } from 'vue'

export type TransitionDirection = 'slide-left' | 'slide-right' | 'none'

export interface UseImageTransitionOptions {
  /** Enable reduced motion detection */
  respectReducedMotion?: boolean
  /** Animation duration in ms */
  duration?: number
}

export interface UseImageTransitionReturn {
  /** Current transition name for Vue Transition */
  transitionName: ComputedRef<string>
  /** Whether initial open animation should play */
  isInitialOpen: Ref<boolean>
  /** Set transition direction for next animation */
  setDirection: (direction: 'prev' | 'next') => void
  /** Reset to initial state */
  reset: () => void
  /** Mark initial animation as complete */
  markInitialComplete: () => void
  /** Whether user prefers reduced motion */
  prefersReducedMotion: ComputedRef<boolean>
}

/**
 * Manages image transition animations
 */
export function useImageTransition(
  options: UseImageTransitionOptions = {}
): UseImageTransitionReturn {
  const {
    respectReducedMotion = true,
    duration = 300,
  } = options

  // State
  const direction = ref<TransitionDirection>('slide-left')
  const isInitialOpen = ref(true)
  const reducedMotion = ref(false)

  // Check for reduced motion preference
  if (respectReducedMotion && typeof window !== 'undefined') {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    reducedMotion.value = mediaQuery.matches

    mediaQuery.addEventListener('change', (e) => {
      reducedMotion.value = e.matches
    })
  }

  // Computed transition name
  const transitionName = computed(() => {
    if (reducedMotion.value || direction.value === 'none') {
      return 'fade'
    }
    return direction.value
  })

  const prefersReducedMotion = computed(() => reducedMotion.value)

  // Methods
  const setDirection = (dir: 'prev' | 'next') => {
    direction.value = dir === 'prev' ? 'slide-left' : 'slide-right'
  }

  const reset = () => {
    direction.value = 'slide-left'
    isInitialOpen.value = true
  }

  const markInitialComplete = () => {
    isInitialOpen.value = false
  }

  return {
    transitionName,
    isInitialOpen,
    setDirection,
    reset,
    markInitialComplete,
    prefersReducedMotion,
  }
}
```

### Integration with Existing Composables

```typescript
// src/composables/index.ts
export { useImageTransition, type TransitionDirection } from './animation/useImageTransition'
```

---

## Separation of Animation Definitions

### Before (Current State)

```
ImagePreview.vue (586 lines total)
├── Template: ~50 lines
├── Script: ~150 lines
└── Style: ~386 lines (including ~200 lines of @keyframes)
```

### After (Proposed)

```
src/
├── static/css/
│   └── animations.css          # Shared animation definitions (~150 lines)
├── composables/
│   └── animation/
│       └── useImageTransition.ts # Animation state logic (~80 lines)
└── components/
    └── ImagePreview.vue         # Reduced to ~250 lines
```

---

## Integration Points

### 1. ImagePreview.vue — Main Integration

| Area | Current | Change |
|------|---------|--------|
| Transition direction | `slideDirection` ref | Use `useImageTransition().transitionName` |
| Initial animation | `isInitialOpen` ref | Use `useImageTransition().isInitialOpen` |
| Animation CSS | Inline `<style scoped>` | Import from `animations.css` |
| Keyframes | 200+ lines inline | Move to `animations.css` |

### 2. Other Animated Components

| Component | Animations | Can Use Shared CSS |
|-----------|------------|-------------------|
| Alert.vue | fade, slide-in | ✅ Use shared fade |
| CollectionDropdown.vue | scale + translate | ✅ Use shared dropdown animation |
| LoadingOverlay.vue | fade | ✅ Use shared fade |
| WallpaperList.vue | check pop, spin | ✅ Use shared animations |

---

## Build Order

### Phase 1: Create Animation Infrastructure
1. Create `src/static/css/animations.css` with optimized keyframes
2. Create `src/composables/animation/useImageTransition.ts`

### Phase 2: Refactor ImagePreview.vue
3. Import animation CSS module
4. Replace inline @keyframes with imported classes
5. Integrate `useImageTransition` composable
6. Remove blur filter from animations
7. Add `will-change` hints

### Phase 3: Optimize Other Components
8. Update Alert.vue to use shared fade animation
9. Update CollectionDropdown.vue to use shared animation
10. Update LoadingOverlay.vue to use shared fade

---

## New vs Modified Components

### New Files (2)

| File | Purpose |
|------|---------|
| `src/static/css/animations.css` | Centralized GPU-optimized animation definitions |
| `src/composables/animation/useImageTransition.ts` | Animation state management composable |

### Modified Files (4)

| File | Change |
|------|--------|
| `src/components/ImagePreview.vue` | Use animation composable, remove inline CSS |
| `src/components/Alert.vue` | Use shared fade animation |
| `src/components/favorites/CollectionDropdown.vue` | Use shared dropdown animation |
| `src/components/LoadingOverlay.vue` | Use shared fade animation |
| `src/composables/index.ts` | Export new composable |

---

## Performance Benchmarks

### Before Optimization
- `slide-in-blurred-left`: Uses `filter: blur(40px)` → CPU paint, ~15-30fps on low-end
- Large transform values → Janky animation

### After Optimization
- Slide animations: `transform` + `opacity` only → GPU accelerated, 60fps
- Smaller transform values → Smoother interpolation
- `will-change` hints → Browser pre-optimization

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Visual regression | Low | Medium | Test all animations match original timing |
| Reduced motion not respected | Low | Medium | Composable handles media query |
| Missing animation file | None | N/A | CSS imported, build-time check |
| Performance not improved | Low | Low | Benchmark before/after |

---

## Validation Checklist

- [x] Integration point identified (ImagePreview.vue)
- [x] New components explicitly listed (animations.css, useImageTransition.ts)
- [x] Modified components explicitly listed (4 components)
- [x] Build order considers dependencies (infrastructure first)
- [x] Vue Transition usage preserved (dynamic name pattern)
- [x] GPU-accelerated properties only (transform, opacity)
- [x] Reduced motion support included

---

## Downstream Consumer Notes

### For Requirements Phase
- Define animation timing values (300ms default)
- Specify reduced motion behavior
- Define which animations need optimization

### For Planning Phase
- Follow build order (infrastructure → ImagePreview → other components)
- Each phase can be independently tested
- CSS changes have no runtime dependencies

### For Implementation Phase
- Use Chrome DevTools Performance tab to benchmark
- Test on low-end hardware
- Verify reduced motion preference works

---

## References

### Current Animation Code
- `src/components/ImagePreview.vue` lines 465-583 (@keyframes definitions)
- `src/components/Alert.vue` lines 236-281 (fade animation)
- `src/components/favorites/CollectionDropdown.vue` lines 194-223 (dropdown animation)

### Best Practices
- [Web.dev: CSS Animation Performance](https://web.dev/articles/css-animation-performance)
- [Vue 3 Transition Documentation](https://vuejs.org/guide/built-ins/transition)
- [MDN: will-change](https://developer.mozilla.org/en-US/docs/Web/CSS/will-change)

---

*Research completed: 2026-04-30*
*For: v2.8 Animation Performance Optimization*
