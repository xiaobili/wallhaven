# Phase 25: Animation Infrastructure - Research

**Research Date:** 2026-04-30
**Target:** Planning Phase 25

---

## 1. Executive Summary

Phase 25 creates the **animation infrastructure foundation** for subsequent optimization phases. This is a **pure creation phase** with no modifications to existing components.

### Key Insight
- **No new npm dependencies required** — VueUse is already noted as available in the project ecosystem (per DISCUSSION-LOG.md)
- **Pure CSS + Composable creation** — No component modifications
- **Follow existing patterns** — CSS files in `src/static/css/`, composables in `src/composables/{domain}/`

---

## 2. CSS File Structure Research

### 2.1 Existing CSS Organization

| File | Purpose | Pattern |
|------|---------|---------|
| `src/static/css/common.css` | Global resets, scrollbar styles | Base styles |
| `src/static/css/list.css` | Thumbnail list styling | Component-specific |
| `src/static/css/all.css` | Unknown (needs investigation) | — |

**Import pattern in components:**
```vue
<style scoped>
@import url("@/static/css/list.css");
</style>
```

### 2.2 Recommended Structure for animations.css

Based on RESEARCH.md §3 and FEATURES.md §7:

```css
/* src/static/css/animations.css */

/* ===== GPU-Optimized Slide Animations ===== */

/* Slide Left - New image enters from left */
@keyframes slide-left {
  0% {
    transform: translateX(-50px) scale(0.98);
    opacity: 0;
  }
  100% {
    transform: translateX(0) scale(1);
    opacity: 1;
  }
}

/* Slide Right - New image enters from right */
@keyframes slide-right {
  0% {
    transform: translateX(50px) scale(0.98);
    opacity: 0;
  }
  100% {
    transform: translateX(0) scale(1);
    opacity: 1;
  }
}

/* Vue Transition Classes */
.slide-left-enter-active {
  animation: slide-left 0.3s cubic-bezier(0.4, 0, 0.2, 1) both;
  will-change: transform, opacity;
}

.slide-left-leave-active {
  animation: slide-right 0.3s cubic-bezier(0.4, 0, 0.2, 1) reverse both;
  will-change: transform, opacity;
}

.slide-right-enter-active {
  animation: slide-right 0.3s cubic-bezier(0.4, 0, 0.2, 1) both;
  will-change: transform, opacity;
}

.slide-right-leave-active {
  animation: slide-left 0.3s cubic-bezier(0.4, 0, 0.2, 1) reverse both;
  will-change: transform, opacity;
}

/* ===== Fade Animation (for reduced-motion) ===== */

@keyframes fade {
  0% { opacity: 0; }
  100% { opacity: 1; }
}

/* ===== Reduced Motion Support ===== */

@media (prefers-reduced-motion: reduce) {
  .slide-left-enter-active,
  .slide-left-leave-active,
  .slide-right-enter-active,
  .slide-right-leave-active {
    animation: fade 0.15s ease-out both;
    will-change: opacity;
  }
}

/* ===== Utility Classes ===== */

/* Container with CSS containment for performance */
.animation-container {
  contain: layout paint;
}
```

### 2.3 Key CSS Decisions

| Decision | Value | Rationale |
|----------|-------|-----------|
| Translate distance | `±50px` | Reduced from 1000px for better performance |
| Scale | `0.98` | Subtle "entrance" feel without blur |
| Duration | `300ms` | Matches existing animation timing |
| Easing | `cubic-bezier(0.4, 0, 0.2, 1)` | Material Design standard |
| Will-change | Applied during animation only | Prevents memory leaks |

---

## 3. Composable Pattern Research

### 3.1 Existing Composable Structure

**File organization:**
```
src/composables/
├── index.ts                    # Barrel export
├── core/
│   └── useAlert.ts             # Pattern reference
├── wallpaper/
│   └── useWallpaperList.ts
├── download/
│   └── useDownload.ts
├── settings/
│   └── useSettings.ts
├── local/
│   └── useLocalFiles.ts
└── favorites/
    ├── useCollections.ts
    └── useFavorites.ts
```

**Pattern from useAlert.ts:**
```typescript
// 1. Type definitions first
export type AlertType = 'success' | 'error' | 'warning' | 'info'
export interface AlertState { /* ... */ }
export interface UseAlertReturn { /* ... */ }

// 2. Implementation
export function useAlert(defaultDuration = 3000): UseAlertReturn {
  const alert = reactive<AlertState>({ /* ... */ })

  const showAlert = (message: string, type?: AlertType, duration?: number): void => {
    // ...
  }

  return {
    alert,
    showAlert,
    hideAlert,
    showSuccess,
    showError,
    showWarning,
    showInfo,
  }
}
```

### 3.2 Recommended useImageTransition.ts Structure

```typescript
/**
 * src/composables/animation/useImageTransition.ts
 *
 * Animation state management for image transitions.
 * Provides direction state, reduced-motion detection, and transition name computation.
 */

import { ref, computed, type Ref, type ComputedRef } from 'vue'
// Note: VueUse needs to be installed. If not available, use manual detection.
// import { usePreferredReducedMotion } from '@vueuse/core'

/* ===== Type Definitions ===== */

export type SlideDirection = 'slide-left' | 'slide-right'
export type NavigationDirection = 'prev' | 'next'

export interface UseImageTransitionReturn {
  /** Current slide animation direction */
  slideDirection: Ref<SlideDirection>
  /** Whether an animation is in progress */
  isAnimating: Ref<boolean>
  /** User's reduced-motion preference */
  reducedMotion: ComputedRef<boolean>
  /** Computed transition name (respects reduced-motion) */
  transitionName: ComputedRef<string>
  /** Set direction based on navigation */
  setDirection: (direction: NavigationDirection) => void
  /** Mark animation as started */
  startAnimation: () => void
  /** Mark animation as ended (call from @after-enter/@after-leave) */
  endAnimation: () => void
}

/* ===== Implementation ===== */

export function useImageTransition(): UseImageTransitionReturn {
  // State
  const slideDirection = ref<SlideDirection>('slide-left')
  const isAnimating = ref<boolean>(false)

  // Reduced motion detection
  // Option A: VueUse (recommended)
  // const motionPreference = usePreferredReducedMotion()
  // const reducedMotion = computed(() => motionPreference.value === 'reduce')

  // Option B: Manual detection (fallback)
  const reducedMotion = computed(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  })

  // Computed transition name
  const transitionName = computed<string>(() => {
    return reducedMotion.value ? 'fade' : slideDirection.value
  })

  // Actions
  const setDirection = (direction: NavigationDirection): void => {
    slideDirection.value = direction === 'prev' ? 'slide-left' : 'slide-right'
  }

  const startAnimation = (): void => {
    isAnimating.value = true
  }

  const endAnimation = (): void => {
    isAnimating.value = false
  }

  return {
    slideDirection,
    isAnimating,
    reducedMotion,
    transitionName,
    setDirection,
    startAnimation,
    endAnimation,
  }
}
```

### 3.3 VueUse Availability

**Finding:** The DISCUSSION-LOG.md states VueUse is "already available in project ecosystem." However, `package.json` does NOT show `@vueuse/core` as a dependency.

**Recommendation:**
1. **First check:** Verify if VueUse can be added, or
2. **Fallback:** Use manual `window.matchMedia` detection (implemented above)

**Manual detection pattern (from FEATURES.md):**
```typescript
const reducedMotion = ref(false)

const checkReducedMotion = () => {
  reducedMotion.value = window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

onMounted(() => {
  checkReducedMotion()
  window.matchMedia('(prefers-reduced-motion: reduce)')
    .addEventListener('change', checkReducedMotion)
})

onUnmounted(() => {
  window.matchMedia('(prefers-reduced-motion: reduce)')
    .removeEventListener('change', checkReducedMotion)
})
```

---

## 4. Integration Points

### 4.1 Files to Create

| File | Purpose | Lines (est.) |
|------|---------|--------------|
| `src/static/css/animations.css` | GPU-optimized keyframes | ~80 |
| `src/composables/animation/useImageTransition.ts` | Animation state composable | ~60 |

### 4.2 Files to Modify (This Phase)

| File | Change |
|------|--------|
| `src/composables/index.ts` | Add export for useImageTransition |

### 4.3 Future Integration (Phase 26-28)

Phase 28 will integrate these into ImagePreview.vue:

```vue
<script setup lang="ts">
import { useImageTransition } from '@/composables'

const { slideDirection, isAnimating, transitionName, setDirection } = useImageTransition()

const navigatePrev = () => {
  if (canNavigatePrev.value) {
    isInitialOpen.value = false
    setDirection('prev')  // Uses composable instead of direct ref
    emit('navigate', 'prev')
  }
}
</script>

<template>
  <Transition :name="transitionName" mode="out-in">
    <!-- ... -->
  </Transition>
</template>

<style scoped>
@import url("@/static/css/animations.css");
</style>
```

---

## 5. TypeScript Interface Design

### 5.1 Return Type Interface

```typescript
export interface UseImageTransitionReturn {
  // State refs
  slideDirection: Ref<SlideDirection>
  isAnimating: Ref<boolean>

  // Computed values
  reducedMotion: ComputedRef<boolean>
  transitionName: ComputedRef<string>

  // Actions
  setDirection: (direction: NavigationDirection) => void
  startAnimation: () => void
  endAnimation: () => void
}
```

### 5.2 Type Exports

```typescript
// Direction types
export type SlideDirection = 'slide-left' | 'slide-right'
export type NavigationDirection = 'prev' | 'next'
```

---

## 6. Pitfall Prevention

### 6.1 CSS Pitfalls (from PITFALLS.md §9)

| Pitfall | Prevention |
|---------|------------|
| Over-using will-change | Only apply during animation, remove after |
| Blur sneaking back | Audit all keyframes, no `filter: blur()` |
| Permanent will-change | Use animation classes only, not static styles |
| Missing reduced-motion | Include `@media (prefers-reduced-motion: reduce)` |

### 6.2 Composable Pitfalls (from PITFALLS.md §7)

| Pitfall | Prevention |
|---------|------------|
| Breaking reactivity | Return `Ref`/`ComputedRef` types, not raw values |
| Duplicate state | Composable should not copy store state |
| Missing lifecycle cleanup | If using mediaQuery listener, clean up on unmount |

### 6.3 Integration Pitfalls

| Pitfall | Prevention |
|---------|------------|
| CSS not imported | Document import requirement in comments |
| Circular dependencies | Composable should not import from components |

---

## 7. Validation Checklist for Planning

### Pre-Planning Verification

- [x] Existing CSS structure understood (`src/static/css/`)
- [x] Composable pattern understood (`useAlert.ts` as reference)
- [x] VueUse availability verified (need to confirm or use manual fallback)
- [x] Animation parameters from RESEARCH.md captured
- [x] Reduced-motion pattern identified
- [x] TypeScript conventions from CONVENTIONS.md reviewed

### Planning Requirements

- [ ] Determine VueUse vs. manual reduced-motion detection
- [ ] Define exact animation keyframe parameters
- [ ] Define composable export structure in `index.ts`
- [ ] Plan for TypeScript compilation verification

---

## 8. Key Decisions for Planning Phase

### Must-Decide Items

1. **VueUse Availability**
   - If VueUse is installed: Use `usePreferredReducedMotion()`
   - If not: Use manual `window.matchMedia` with lifecycle cleanup

2. **CSS Import Location**
   - Import in `main.ts` globally, or
   - Import per-component in `<style scoped>`

3. **Composable File Location**
   - `src/composables/animation/useImageTransition.ts` (new directory)
   - Or `src/composables/core/useImageTransition.ts` (existing directory)

### Recommended Defaults

Based on established patterns:
- **VueUse:** Use manual detection unless VueUse is already installed
- **CSS Import:** Per-component import (consistent with existing pattern)
- **File Location:** `src/composables/animation/` (new domain-specific directory)

---

## 9. Reference Summary

### Canonical References Read

| Document | Key Information |
|----------|-----------------|
| `.planning/phases/25-animation-infrastructure/25-CONTEXT.md` | Phase boundary, decisions D-01 to D-08 |
| `.planning/REQUIREMENTS.md` | ARCH-01, ARCH-02 requirements |
| `.planning/STATE.md` | Phase 24 completed, Phase 25 not started |
| `.planning/research/SUMMARY.md` | Animation performance root cause, optimization approach |
| `.planning/research/PITFALLS.md` | CSS/Vue animation pitfalls §9 |

### Code References Read

| File | Key Information |
|------|-----------------|
| `src/static/css/common.css` | CSS file structure pattern |
| `src/composables/core/useAlert.ts` | Composable interface pattern |
| `src/composables/index.ts` | Export structure |
| `src/components/ImagePreview.vue` | Current animation implementation |
| `package.json` | Dependencies (no VueUse found) |

---

## 10. Answer: What Do I Need to Know to PLAN This Phase Well?

### Critical Information

1. **VueUse is NOT in package.json** — The DISCUSSION-LOG assumed it was available, but verification shows it's not installed. Plan must use manual `window.matchMedia` detection with proper lifecycle cleanup.

2. **CSS File Location is Consistent** — Use `src/static/css/animations.css` matching existing pattern.

3. **Composable Needs New Directory** — Create `src/composables/animation/` for domain organization.

4. **No Component Modifications** — This phase is purely infrastructure creation. ImagePreview.vue integration is Phase 28.

5. **Animation Parameters Are Defined** — Use `translateX(±50px) scale(0.98)` + `opacity: 0→1` over 300ms with Material Design easing.

### Planning Priorities

1. **First:** Define exact TypeScript interfaces for composable
2. **Second:** Create CSS keyframe definitions
3. **Third:** Implement composable with manual reduced-motion detection
4. **Fourth:** Update index.ts exports
5. **Fifth:** Verify TypeScript compilation

### Risk Mitigation

- Manual reduced-motion detection requires lifecycle cleanup (onMounted/onUnmounted)
- CSS must include both standard and reduced-motion variants
- Composable must not depend on VueUse (not installed)

---

*Research completed: 2026-04-30*
*Ready for: Planning Phase*
