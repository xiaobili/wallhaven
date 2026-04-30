# Phase 28: Accessibility & Integration - Research

**Researched:** 2026-04-30
**Phase:** 28-accessibility-integration

---

## Executive Summary

Phase 28 集成 useImageTransition composable 到 ImagePreview.vue，完成 reduced-motion 支持。研究确认：

1. **Composable 已就绪** — useImageTransition 提供完整的 reduced-motion 检测和动画状态管理
2. **CSS 已就绪** — animations.css 包含完整的 reduced-media 查询规则
3. **集成路径清晰** — 替换现有 slideDirection ref，添加 Transition 事件
4. **回归测试范围明确** — 导航、收藏、下载、设置壁纸功能

---

## Technical Approach

### 1. Composable Integration Pattern

**Current ImagePreview.vue state management:**
```typescript
// Lines 129-130
const slideDirection = ref<string>('slide-left')
const isInitialOpen = ref<boolean>(true)
```

**Target integration:**
```typescript
import { useImageTransition } from '@/composables'

// Replace slideDirection with composable
const {
  slideDirection,
  isAnimating,
  transitionName,
  setDirection,
  startAnimation,
  endAnimation
} = useImageTransition()

// Keep isInitialOpen separate (controls modal-open animation)
const isInitialOpen = ref<boolean>(true)
```

### 2. Transition Event Binding

**Current:**
```vue
<Transition :name="slideDirection" mode="out-in">
  <img ...>
</Transition>
```

**Target:**
```vue
<Transition
  :name="transitionName"
  mode="out-in"
  @after-enter="endAnimation"
>
  <img ...>
</Transition>
```

### 3. Navigation Method Updates

**Current:**
```typescript
const navigatePrev = () => {
  if (canNavigatePrev.value) {
    isInitialOpen.value = false
    slideDirection.value = 'slide-left'
    emit('navigate', 'prev')
  }
}
```

**Target:**
```typescript
const navigatePrev = () => {
  if (canNavigatePrev.value && !isAnimating.value) {
    isInitialOpen.value = false
    setDirection('prev')  // Uses composable
    startAnimation()
    emit('navigate', 'prev')
  }
}
```

### 4. Reduced-Motion Support

**How it works:**
1. Composable detects `window.matchMedia('(prefers-reduced-motion: reduce)')`
2. `transitionName` computed returns `'fade'` when reduced-motion is preferred
3. animations.css has `@media (prefers-reduced-motion: reduce)` rules that use fade animation
4. Result: Users with reduced-motion preference see simple opacity transitions

**CSS already in place (animations.css lines 136-149):**
```css
@media (prefers-reduced-motion: reduce) {
  .slide-left-enter-active,
  .slide-left-leave-active,
  .slide-right-enter-active,
  .slide-right-leave-active {
    animation: fade 0.15s ease-out both;
    will-change: opacity;
  }
  .modal-open,
  .modal-close {
    animation: fade 0.15s ease-out both;
    will-change: opacity;
  }
}
```

---

## Code Patterns

### Composable Usage Pattern (from existing codebase)

**Example: useAlert in OnlineWallpaper.vue**
```typescript
import { useAlert } from '@/composables'

const { alert, showAlert, hideAlert } = useAlert()
```

**Pattern to follow:**
- Import from `@/composables` (barrel export)
- Destructure all needed functions
- Use in template and script

### Transition Event Pattern

**Vue 3 Transition events:**
```vue
<Transition
  @before-enter="onBeforeEnter"
  @enter="onEnter"
  @after-enter="onAfterEnter"
  @before-leave="onBeforeLeave"
  @leave="onLeave"
  @after-leave="onAfterLeave"
>
```

**For this phase, only @after-enter needed:**
- Called after enter animation completes
- Updates isAnimating state
- Re-enables navigation buttons

---

## Integration Points

### File: src/components/ImagePreview.vue

**Changes required:**

| Line(s) | Current | Target |
|---------|---------|--------|
| 96 | `import type { WallpaperItem } from '@/types';` | Add: `import { useImageTransition } from '@/composables'` |
| 129 | `const slideDirection = ref<string>('slide-left')` | Replace with composable destructuring |
| 187-192 | `navigatePrev` function | Add `isAnimating` check, use `setDirection('prev')`, call `startAnimation()` |
| 195-200 | `navigateNext` function | Add `isAnimating` check, use `setDirection('next')`, call `startAnimation()` |
| 29-33 | `<Transition :name="slideDirection">` | Change to `:name="transitionName"`, add `@after-enter="endAnimation"` |
| 139-144 | `canNavigatePrev` / `canNavigateNext` | Optionally add `&& !isAnimating.value` for button disable |

**No changes needed:**
- `isInitialOpen` — kept for modal-open animation control
- Template structure — only Transition attributes change
- CSS — already imports animations.css

---

## Regression Test Checklist

### Navigation Tests
- [ ] Left arrow key navigates to previous image
- [ ] Right arrow key navigates to next image
- [ ] Prev button click navigates to previous
- [ ] Next button click navigates to next
- [ ] Navigation at first image (prev disabled)
- [ ] Navigation at last image (next disabled)
- [ ] Rapid navigation doesn't cause animation overlap

### Animation Tests
- [ ] Slide animation plays on navigation
- [ ] Modal-open animation plays on first open
- [ ] Modal-close animation plays on close
- [ ] Animation direction correct (prev = left, next = right)

### Reduced-Motion Tests
- [ ] Enable reduced-motion in OS settings
- [ ] Verify fade animation used instead of slide
- [ ] Verify modal animations use fade
- [ ] Disable reduced-motion, verify slide animations return

### Favorite Tests
- [ ] Left click toggles favorite (add/remove)
- [ ] Right click shows collection dropdown
- [ ] Favorite state persists after navigation

### Download Tests
- [ ] Download button triggers download
- [ ] Download works from preview

### Set Wallpaper Tests
- [ ] Set wallpaper button works
- [ ] Correct image set as wallpaper

---

## Edge Cases & Pitfalls

### 1. Composable Lifecycle

**Pitfall:** reducedMotion ref uses `onMounted`/`onUnmounted` for media query listener.

**Mitigation:** Composable already handles this correctly. Just need to call it in component setup.

### 2. isAnimating State

**Pitfall:** If `endAnimation` not called, navigation stays disabled.

**Mitigation:** Ensure `@after-enter` event always fires. Vue Transition guarantees this for successful transitions.

### 3. isInitialOpen vs isAnimating

**Clarification:** These serve different purposes:
- `isInitialOpen` — Controls first-open modal animation (scale from 0)
- `isAnimating` — Controls navigation slide animation state

**Keep both** — they manage different animation types.

### 4. transitionName vs slideDirection

**Pitfall:** Using `slideDirection` directly ignores reduced-motion.

**Mitigation:** Always use `transitionName` computed property, which respects user preference.

### 5. Button Disable Timing

**Pitfall:** Disabling buttons during animation might feel unresponsive.

**Option:** Use CSS `pointer-events: none` during animation instead of `:disabled` for smoother UX.

---

## Validation Architecture

### Dimension 1: Goal Alignment
- Every task must trace to phase goal (A11Y-01, A11Y-02, ARCH-03)
- Success criteria must match ROADMAP

### Dimension 2: Requirement Coverage
- A11Y-01: reduced-motion media query support
- A11Y-02: simple opacity fallback
- ARCH-03: ImagePreview uses shared CSS and composable

### Dimension 3: Interface Contracts
- useImageTransition return type must match usage
- Transition events must be valid Vue 3 events

### Dimension 4: Dependency Resolution
- Phase 27 must be complete (✓)
- animations.css must exist (✓)
- useImageTransition must exist (✓)

### Dimension 5: Failure Mode Analysis
- reduced-motion detection failure → fallback to standard animations
- Animation event not firing → isAnimating stuck → add timeout fallback

### Dimension 6: Integration Proofs
- ImagePreview renders with composable
- Transition uses transitionName
- Navigation calls setDirection

### Dimension 7: Acceptance Criteria
- All 6 ROADMAP success criteria met
- Regression tests pass

### Dimension 8: Nyquist Validation
- Sample navigation interactions
- Sample reduced-motion toggle
- Sample favorite operations

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/ImagePreview.vue` | Integrate useImageTransition, update Transition, update navigation methods |

## Files to Read (Reference)

| File | Purpose |
|------|---------|
| `src/composables/animation/useImageTransition.ts` | Composable interface |
| `src/static/css/animations.css` | Animation definitions |
| `src/composables/index.ts` | Export pattern |

---

## RESEARCH COMPLETE

**Ready for planning.** All technical details documented above.
