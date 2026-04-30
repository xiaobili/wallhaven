# Phase 25: Animation Infrastructure - Discussion Log

**Date:** 2026-04-30
**Mode:** --auto (autonomous selection)

---

## Discussion Summary

Phase 25 context gathered in autonomous mode. All gray areas auto-selected with recommended defaults based on prior research and established patterns.

---

## Gray Areas Discussed

### 1. CSS File Structure

**Question:** Where should the shared animation CSS file be created and what should it contain?

**Options presented:**
1. `src/static/css/animations.css` with GPU-optimized keyframes (Recommended)
2. `src/styles/animations.css` in a new styles directory
3. Inline in ImagePreview.vue `<style>` block

**Auto-selected:** Option 1 — `src/static/css/animations.css`

**Rationale:**
- Consistent with existing CSS file organization (`common.css`, `list.css`, `all.css`)
- Centralized location enables reuse across components
- Separate file allows Phase 26-28 to incrementally optimize

---

### 2. Animation Keyframe Parameters

**Question:** What transform parameters should the optimized slide animations use?

**Options presented:**
1. `translateX(±50px) scale(0.98)` + `opacity` (Recommended per RESEARCH.md)
2. `translateX(±100px)` + `opacity` (simpler, no scale)
3. `translateX(±1000px)` + `opacity` (matching current distance)

**Auto-selected:** Option 1 — `translateX(±50px) scale(0.98)` + `opacity`

**Rationale:**
- RESEARCH.md analysis shows this achieves 60fps target
- Smaller translate distance reduces composite layer complexity
- Subtle scale provides "entrance" feel without blur filter overhead
- GPU-accelerated properties only (transform, opacity)

---

### 3. Composable Interface Design

**Question:** What should the `useImageTransition` composable return?

**Options presented:**
1. `{ slideDirection, isAnimating, reducedMotion, transitionName }` (Recommended)
2. `{ direction, animating, reduced, name }` (shorter names)
3. Return individual refs via multiple return values

**Auto-selected:** Option 1 — Full descriptive names

**Rationale:**
- Follows `useAlert` pattern with explicit interface
- Descriptive names improve code readability
- `transitionName` computed property handles reduced-motion logic automatically

---

### 4. Reduced-motion Detection Method

**Question:** How should the composable detect user's reduced-motion preference?

**Options presented:**
1. Use VueUse `usePreferredReducedMotion()` (Recommended)
2. Manual `window.matchMedia('(prefers-reduced-motion: reduce)')`
3. CSS-only via `@media` query

**Auto-selected:** Option 1 — VueUse composable

**Rationale:**
- Reactive detection (responds to system preference changes)
- VueUse already available in project ecosystem
- Allows composable to provide both CSS class and JS state

**Note:** CSS `@media` rules also included in animations.css as fallback

---

## Decisions Captured

| ID | Decision | Rationale |
|----|----------|-----------|
| D-01 | Create `src/static/css/animations.css` | Centralized, consistent with existing structure |
| D-02 | GPU-optimized slide keyframes | RESEARCH.md analysis for 60fps |
| D-03 | Fade keyframes for reduced-motion | Simple alternative, 150ms duration |
| D-04 | CSS `@media (prefers-reduced-motion)` | WCAG 2.1 compliance |
| D-05 | Create `useImageTransition` composable | Encapsulate animation state logic |
| D-06 | Direction state management | Match existing ImagePreview navigation |
| D-07 | Animation state tracking | Enable UI feedback during animation |
| D-08 | Reduced-motion detection | Responsive to user preference |

---

## Deferred Ideas

None — discussion stayed within phase scope.

---

## Notes

- All decisions align with RESEARCH.md performance analysis
- Composable interface follows established `useAlert` pattern
- CSS file structure consistent with existing `src/static/css/` organization
- No new dependencies required (VueUse already available)

---

*Log generated: 2026-04-30*
*Mode: --auto*
