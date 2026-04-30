# Phase 27: Preview Animation Optimization - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-30
**Phase:** 27-preview-animation-optimization
**Mode:** --auto (autonomous)
**Areas discussed:** Animation Location, Will-change Strategy, Reduced-motion Behavior, Animation Timing

---

## Animation Location

| Option | Description | Selected |
|--------|-------------|----------|
| Move to animations.css | Consistency with Phase 25/26 approach, centralized animation management | ✓ |
| Keep inline in ImagePreview.vue | No migration needed, but duplicates pattern from prior phases | |

**Auto-selected:** Move to animations.css (recommended default)
**Notes:** Consistent with Phase 25/26 architecture decisions, enables reuse and centralized management

---

## Will-change Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Add to animation class selectors in CSS | Matches Phase 26 pattern, browser auto-manages lifecycle | ✓ |
| Add via JavaScript before animation | More control but adds complexity | |
| Skip will-change | Simpler but misses GPU pre-promotion | |

**Auto-selected:** Add to animation class selectors in CSS (recommended default)
**Notes:** Follows established pattern from Phase 26, minimal code change with performance benefit

---

## Reduced-motion Behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Simple opacity fade 0.15s | Matches slide animation fallback, WCAG 2.1 compliant | ✓ |
| Scale-only animation | Preserves some motion, simpler than full animation | |
| Instant appearance (no animation) | Most reduced, but may feel abrupt | |

**Auto-selected:** Simple opacity fade 0.15s (recommended default)
**Notes:** Consistent with Phase 25 reduced-motion fallback pattern, maintains smooth UX for accessibility users

---

## Animation Timing

| Option | Description | Selected |
|--------|-------------|----------|
| Keep 0.5s | User constraint: no visual perception change, current timing is well-tuned | ✓ |
| Reduce to 0.3s | Faster, matches slide animations, but may feel different | |
| Increase to 0.6s | More dramatic, but slower UX | |

**Auto-selected:** Keep 0.5s (recommended default)
**Notes:** Preserves existing user experience per project constraints

---

## Claude's Discretion

- animations.css 中动画命名（modal-open/modal-close vs blowUpModal/blowUpModalTwo）
- 是否添加 -webkit- 前缀（animations.css 已有模式可参考）
- 是否在 composable 中添加 modal 动画状态（推迟到 Phase 28）

---

## Deferred Ideas

None — discussion stayed within phase scope.

---

*Auto-mode discussion completed: 2026-04-30*
