---
status: resolved
trigger: ImagePreview 中 img-class 类的动画覆盖了Transition动画
created: 2026-04-30
updated: 2026-04-30
---

# Symptoms

**Expected behavior:**
- 打开图片预览时显示 img-class 动画
- 切换图片时显示 Transition 动画

**Actual behavior:**
- Transition 动画完全不播放（切换图片时）

**Trigger:**
- 在图片预览中切换图片时

**Timeline:**
- 不确定何时开始，不确定是否曾经正常工作

## Current Focus

hypothesis: CSS specificity conflict - always-on animation overrides Vue Transition
test: Check CSS specificity of .img-class animation vs transition classes
expecting: .img-class animation wins due to higher specificity
next_action: "Fix by only applying blowUpModal animation on initial open"

## Evidence

1. **CSS Rule on line 364-366 (before fix):**
   ```css
   .mask .img-view .img-class {
     animation: blowUpModal 0.5s cubic-bezier(0.165, 0.84, 0.44, 1) forwards;
   }
   ```
   - This applied `blowUpModal` animation to ALL `.img-class` elements ALWAYS

2. **Specificity Analysis:**
   - `.mask .img-view .img-class` has specificity of 0,0,3,0 (three classes)
   - `.slide-left-enter-active` has specificity of 0,0,1,0 (one class)
   - The always-on rule WON, blocking Vue Transition animations

3. **Vue Transition Classes (lines 504-571):**
   - `.slide-right-leave-active`
   - `.slide-left-enter-active`
   - `.slide-right-enter-active`
   - `.slide-left-leave-active`
   - These define proper slide animations but were overridden

4. **Template Structure (lines 29-40):**
   ```vue
   <Transition :name="slideDirection" mode="out-in">
     <img v-if="imgInfo" :key="imgInfo.id" class="img-class" ...>
   </Transition>
   ```
   - Transition uses `:key` correctly for re-triggering
   - `slideDirection` changes based on navigation direction

## Root Cause

**The `blowUpModal` animation was defined as an always-on CSS rule that applies to every `.img-class` element.**

When Vue Transition tried to apply `slide-left-enter-active` or `slide-right-enter-active` classes during image switching, the existing CSS rule `.mask .img-view .img-class` (higher specificity) continued to apply `blowUpModal`, overriding the transition's animation.

## Fix Implementation

### Changes Made:

1. **Added `watch` import** - to monitor `showing` prop changes
2. **Added `isInitialOpen` ref** - tracks if initial open animation should play
3. **Added watcher for `showing`** - resets `isInitialOpen` to `true` when preview opens
4. **Modified template** - added `:class="{ 'initial-anim': isInitialOpen }"` to img element
5. **Modified navigatePrev/navigateNext** - set `isInitialOpen = false` when navigating
6. **Modified CSS** - changed selector from `.mask .img-view .img-class` to `.mask .img-view .img-class.initial-anim`

### Code Changes:

```typescript
// Added to imports
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';

// Added reactive variable
const isInitialOpen = ref<boolean>(true);

// Added watcher
watch(() => props.showing, (newVal) => {
  if (newVal) {
    isInitialOpen.value = true;
  }
})

// Modified navigate methods
const navigatePrev = () => {
  if (canNavigatePrev.value) {
    isInitialOpen.value = false;  // Added: disable initial animation
    slideDirection.value = 'slide-left'
    emit('navigate', 'prev')
  }
}
```

```css
/* Changed from always-on to conditional */
.mask .img-view .img-class.initial-anim {
  animation: blowUpModal 0.5s cubic-bezier(0.165, 0.84, 0.44, 1) forwards;
}
```

## Resolution

root_cause: "CSS specificity conflict: always-on .img-class animation (0,0,3,0) overrides Vue Transition classes (0,0,1,0)"
fix: "Conditionally apply blowUpModal animation only on initial modal open via `initial-anim` class, disabled during navigation"
verification: "Build succeeded. Manual testing needed: open preview, navigate images, close preview - each should have correct animation"
files_changed: ["src/components/ImagePreview.vue"]
