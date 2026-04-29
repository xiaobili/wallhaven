# Plan 24-02: Add Vue Transition to ImagePreview Component

**Status:** Complete
**Executed:** 2026-04-29
**Commit:** 92e1c05

## Summary

Successfully wrapped the main image element in a Vue Transition component with dynamic name binding to enable bidirectional slide animations during ImagePreview navigation.

## Changes Made

### File: `src/components/ImagePreview.vue`

**Script changes:**
- Added `const transitionName = ref<string>('slide-right')` ref
- Modified `navigatePrev()` to set `transitionName.value = 'slide-left'` before emit
- Modified `navigateNext()` to set `transitionName.value = 'slide-right'` before emit

**Template changes:**
- Wrapped main img element in `<Transition :name="transitionName">`
- Added `:key="imgInfo.id"` to img element to trigger transition on image change
- Preserved existing `v-if="imgInfo"` condition
- Preserved close-bg img element unchanged

**Style changes:**
- Added `position: relative` to `.img-view` CSS for absolute positioning of leaving element

## Verification

- [x] File contains `const transitionName = ref<string>('slide-right')`
- [x] File contains `<Transition :name="transitionName">`
- [x] File contains `:key="imgInfo.id"` on the img element
- [x] `navigatePrev` contains `transitionName.value = 'slide-left'`
- [x] `navigateNext` contains `transitionName.value = 'slide-right'`
- [x] `.img-view` CSS contains `position: relative`
- [x] Existing `emit('navigate', 'prev')` and `emit('navigate', 'next')` calls unchanged
- [x] Existing `v-if="imgInfo"` on img element preserved
- [x] Existing close-bg img element unchanged
- [x] Existing blowUpModal animations in style section unchanged

## Requirements Satisfied

- ANIM-01: Add slide animation to ImagePreview navigation
- ANIM-02: Direction-aware animation (prev=slide-left, next=slide-right)
- ANIM-03: Smooth bidirectional transition (enter + leave animations)

## Self-Check

**Status:** PASSED
- All acceptance criteria met
- No changes to existing user operation logic
- No changes to existing UI layout
- Navigation emits unchanged
