# Plan 24-01: Add Slide-Out Animation Classes to animate.css

**Status:** Complete
**Executed:** 2026-04-29
**Commit:** 9c84499

## Summary

Successfully added slide-out animation classes to `src/static/css/animate.css` for bidirectional slide animations during ImagePreview navigation.

## Changes Made

### File: `src/static/css/animate.css`
- Added `@keyframes slide-out-left` definition (translateX 0 -> -1000px, opacity 1 -> 0)
- Added `@keyframes slide-out-right` definition (translateX 0 -> 1000px, opacity 1 -> 0)
- Added `.slide-out-left` class applying the animation
- Added `.slide-out-right` class applying the animation
- Added `.slide-left-enter-active` class using slide-in-left
- Added `.slide-left-leave-active` class using slide-out-right with `position: absolute`
- Added `.slide-right-enter-active` class using slide-in-right
- Added `.slide-right-leave-active` class using slide-out-left with `position: absolute`

## Verification

- [x] File contains `@keyframes slide-out-left`
- [x] File contains `@keyframes slide-out-right`
- [x] All animations use 0.5s duration
- [x] All animations use `cubic-bezier(0.25, 0.46, 0.45, 0.94)` easing
- [x] Leave-active classes include `position: absolute`

## Requirements Satisfied

- ANIM-04: Add slide-out animation classes to animate.css

## Self-Check

**Status:** PASSED
- All acceptance criteria met
- Animation parameters match existing slide-in animations
- Browser compatibility with -webkit- prefixes
