# Phase 24: ImagePreview Switch Animation - Research

**Created:** 2026-04-29
**Status:** Research Complete

---

## 1. Technical Method Analysis

### 1.1 Current State

**ImagePreview.vue current structure:**
```vue
<div class="img-view">
  <img v-if="imgInfo" class="img-class" :src="imgInfo.path" :style="{'max-height':calHeight}">
</div>
```

**Navigation flow:**
1. User clicks nav button (prev/next) or presses arrow key
2. `navigatePrev()` or `navigateNext()` emits `'navigate'` event
3. Parent component (OnlineWallpaper/LocalWallpaper/FavoritesPage) handles navigation
4. Parent calls `preview(newWallpaper)` which updates `imgInfo.value`
5. ImagePreview receives new `imgInfo` prop, re-renders `<img>` with new src

**Key observation:** The `imgInfo` prop change happens in the **parent**, not in ImagePreview itself.

### 1.2 Animation Trigger Points

Two possible approaches:

| Approach | Trigger Point | Animation Control | Pros | Cons |
|----------|---------------|-------------------|------|------|
| A: Vue Transition | `imgInfo` prop change | CSS transition classes | Built-in, clean | Requires key binding, mode handling |
| B: Dynamic CSS Classes | Navigation emit | JS-controlled classes | Direct control | More manual timing management |

### 1.3 Vue 3 Transition Patterns

**Pattern 1: Single element with key**
```vue
<Transition :name="transitionName" mode="out-in">
  <img :key="imgInfo?.id" :src="imgInfo?.path" />
</Transition>
```
- Vue detects key change
- Applies `{name}-enter-from`, `{name}-enter-active`, etc.
- `mode="out-in"` ensures leave animation completes before enter

**Pattern 2: Dynamic class binding**
```vue
<img
  :class="[
    'img-class',
    animationClass,
    { 'slide-in-left': isNavigatingPrev },
    { 'slide-in-right': isNavigatingNext }
  ]"
/>
```
- Direct CSS class application
- Requires manual timing with `onAnimationEnd` or `watch`

---

## 2. Vue Animation Mode Selection

### 2.1 Challenge: Bidirectional Animation

The user requires:
- Old image slides OUT in opposite direction
- New image slides IN from navigation direction

**Vue transition modes:**
- `mode="out-in"`: Leave animation completes, then enter animation starts
- `mode="in-out"`: Enter animation starts, then leave animation (overlap)
- No mode: Both animations run simultaneously (overlap)

**Recommendation:** Use **no mode** (simultaneous) for smooth overlap effect, as specified in D-03.

### 2.2 Key Binding Strategy

Vue transitions require a `:key` to detect element changes:

```vue
<Transition :name="transitionName">
  <img :key="imgInfo?.id" ... />
</Transition>
```

When `imgInfo.id` changes, Vue knows to trigger transition.

### 2.3 Direction-Aware Transition Name

For different directions, use dynamic transition name:

```typescript
const transitionName = ref('slide-right')

const navigatePrev = () => {
  transitionName.value = 'slide-left'  // New image from left
  emit('navigate', 'prev')
}

const navigateNext = () => {
  transitionName.value = 'slide-right'  // New image from right
  emit('navigate', 'next')
}
```

**CSS Classes Required:**
```css
/* slide-left transition group */
.slide-left-enter-active { animation: slide-in-left 0.5s both; }
.slide-left-leave-active { animation: slide-out-right 0.5s both; }

/* slide-right transition group */
.slide-right-enter-active { animation: slide-in-right 0.5s both; }
.slide-right-leave-active { animation: slide-out-left 0.5s both; }
```

---

## 3. Implementation Strategy

### 3.1 Recommended Approach: Vue Transition with Dynamic Name

**Rationale:**
- Vue 3 built-in transition system handles timing automatically
- Cleaner separation of concerns
- Better integration with Vue's reactivity

**Changes required:**

#### A. animate.css - Add slide-out animations

```css
/* slide-out-left: 向左滑出 */
@-webkit-keyframes slide-out-left {
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
.slide-out-left {
  -webkit-animation: slide-out-left 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) both;
  animation: slide-out-left 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) both;
}

/* slide-out-right: 向右滑出 */
@-webkit-keyframes slide-out-right {
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
.slide-out-right {
  -webkit-animation: slide-out-right 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) both;
  animation: slide-out-right 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) both;
}

/* Transition wrapper classes */
.slide-left-enter-active {
  animation: slide-in-left 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) both;
}
.slide-left-leave-active {
  animation: slide-out-right 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) both;
  position: absolute;
}
.slide-right-enter-active {
  animation: slide-in-right 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) both;
}
.slide-right-leave-active {
  animation: slide-out-left 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) both;
  position: absolute;
}
```

#### B. ImagePreview.vue - Template Changes

```vue
<div class="img-view">
  <Transition :name="transitionName">
    <img
      v-if="imgInfo"
      :key="imgInfo.id"
      class="img-class"
      :src="imgInfo.path"
      :style="{'max-height': calHeight}"
    >
  </Transition>
  <!-- Keep existing close-bg img -->
  <img
    v-show="!showing"
    class="img-class close-bg"
    :src="imgBgSrc"
    :style="{'max-height': calHeight}"
  >
</div>
```

#### C. ImagePreview.vue - Script Changes

```typescript
// Add reactive transition name
const transitionName = ref<string>('slide-right')

// Modify navigation methods
const navigatePrev = () => {
  if (canNavigatePrev.value) {
    transitionName.value = 'slide-left'  // New image enters from left
    emit('navigate', 'prev')
  }
}

const navigateNext = () => {
  if (canNavigateNext.value) {
    transitionName.value = 'slide-right'  // New image enters from right
    emit('navigate', 'next')
  }
}
```

#### D. ImagePreview.vue - Style Changes

```css
/* Position absolute for leaving element to overlap */
.img-view {
  position: relative;  /* Add if not already */
}

.img-view .img-class {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
}

/* Or use Vue's built-in handling with .slide-*-leave-active position: absolute */
```

### 3.2 Alternative Approach: CSS Class Binding (Rejected)

This approach requires more manual timing control and is more error-prone. Not recommended for this use case.

---

## 4. File Modification List

| File | Changes | Complexity |
|------|---------|------------|
| `src/static/css/animate.css` | Add slide-out-left, slide-out-right animations + transition wrapper classes | Low |
| `src/components/ImagePreview.vue` | Wrap img in Transition, add :key, add transitionName ref, update navigation methods | Medium |

**Estimated LOC change:** ~50 lines (CSS) + ~15 lines (Vue)

---

## 5. Risks and Edge Cases

### 5.1 Technical Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Transition conflicts with existing blowUpModal animation | Visual glitch | Use `v-if="imgInfo"` with key to isolate navigation animation |
| Position absolute causes layout issues | Image misalignment | Use proper container positioning, test with various image sizes |
| Rapid navigation causes animation stacking | Multiple animations playing | Consider disabling nav buttons during animation (0.5s) |
| Keyboard navigation timing | Animation may feel laggy | Ensure animation duration matches expected UX (0.5s is acceptable) |

### 5.2 Edge Cases

1. **First/Last image navigation**
   - Navigating prev at first image: No animation (button hidden)
   - Navigating next at last image: No animation (button hidden)
   - Already handled by `canNavigatePrev/canNavigateNext`

2. **Rapid clicks during animation**
   - Current implementation: Allows rapid navigation
   - Consideration: Animation may feel jarring
   - Decision: Claude's discretion - can add debounce if needed

3. **Image load timing**
   - Large images may not be fully loaded during animation
   - Result: Image appears blank during slide-in, then pops in
   - Mitigation: Preload next/prev images (out of scope for this phase)

4. **Close during navigation animation**
   - User clicks close while animation playing
   - Result: Mask closes, animation cut off
   - Impact: Minimal, expected behavior

### 5.3 Constraint Verification

**From PROJECT.md:**
- ✅ User operation logic unchanged (nav buttons still work)
- ✅ Interface layout unchanged (DOM structure same, just wrapped in Transition)
- ✅ UI display unchanged (animation is enhancement, not modification)
- ✅ Functional behavior unchanged (same navigation logic)

---

## 6. Verification Architecture

### 6.1 Manual Test Cases

| Test | Expected Result |
|------|-----------------|
| Click next button | Old image slides left out, new image slides in from right |
| Click prev button | Old image slides right out, new image slides in from left |
| Press right arrow key | Same as next button |
| Press left arrow key | Same as prev button |
| Rapid navigation | Each navigation triggers animation |
| Close during animation | Mask closes smoothly |
| Open preview | blowUpModal animation plays (unchanged) |
| Close preview | blowUpModalTwo animation plays (unchanged) |

### 6.2 Regression Checks

- [ ] All existing navigation functionality works
- [ ] Keyboard shortcuts still function
- [ ] Image loads correctly after navigation
- [ ] Favorite button still works during preview
- [ ] Download button still works during preview
- [ ] Set as wallpaper still works

---

## 7. Summary

**Recommended implementation:**
- Use Vue 3 `<Transition>` component with dynamic `:name`
- Add `slide-out-left` and `slide-out-right` animations to animate.css
- Add transition wrapper classes for enter/leave states
- Use `:key="imgInfo.id"` to trigger transitions on prop change
- Set `transitionName` based on navigation direction

**Key decision points for planner:**
1. Confirm use of Vue Transition (recommended) vs CSS class binding
2. Decide whether to add navigation debounce during animation
3. Confirm transition timing parameters (default 0.5s, cubic-bezier)

**Files to modify:**
- `src/static/css/animate.css` (add animations)
- `src/components/ImagePreview.vue` (wrap img, add transition logic)

---

*Research complete. Ready for planning phase.*
