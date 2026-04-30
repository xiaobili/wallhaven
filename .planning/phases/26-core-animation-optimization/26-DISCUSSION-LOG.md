# Phase 26: Core Animation Optimization - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-30
**Phase:** 26-core-animation-optimization
**Mode:** --auto (autonomous)
**Areas discussed:** CSS Migration Strategy, Will-change Management, CSS Containment

---

## CSS Migration Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Replace inline animations with animations.css import | Delete lines 465-584, add @import, change slideDirection initial value | ✓ |
| Keep inline animations, modify keyframes | Edit existing @keyframes to remove blur, simplify transform | |
| Hybrid approach | Import animations.css but keep inline as fallback | |

**Auto-selected:** Replace inline animations with animations.css import (recommended default)
**Rationale:** animations.css already contains GPU-optimized animations from Phase 25. Reusing ensures consistency and reduces code duplication.

---

## Will-change Management

| Option | Description | Selected |
|--------|-------------|----------|
| Keep will-change in CSS classes (Phase 25 approach) | animations.css already has will-change in transition classes | ✓ |
| Add/remove will-change dynamically | Use JS to add will-change before animation, remove after | |
| Skip will-change entirely | Rely on browser heuristics | |

**Auto-selected:** Keep will-change in CSS classes (recommended default)
**Rationale:** Modern browsers automatically optimize will-change layers and clean them up after animations. No need for manual JS management.

---

## CSS Containment

| Option | Description | Selected |
|--------|-------------|----------|
| Add `contain: layout paint` to .img-view | Isolate rendering boundary per CORE-05 | ✓ |
| Add `contain: strict` | Maximum isolation but may break layout | |
| Skip containment | No performance impact expected | |

**Auto-selected:** Add `contain: layout paint` to .img-view (CORE-05 requirement)
**Rationale:** CSS containment isolates rendering boundaries, preventing animation repaints from affecting other elements. Required by CORE-05.

---

## Claude's Discretion

The following areas were delegated to Claude's discretion:

- Whether to preserve `-webkit-` prefixes (animations.css already includes them)
- Animation timing cleanup after transitions complete
- Exact line numbers for code removal (verify before deleting)

---

## Deferred Ideas

None — discussion stayed within phase scope.

---

## Summary

Phase 26 context captured with all requirements mapped to implementation decisions:

| Requirement | Decision |
|-------------|----------|
| CORE-01 (remove blur) | D-01: Use animations.css which has no blur |
| CORE-02 (simplify transform) | D-01: animations.css uses translateX(±50px) scale(0.98) |
| CORE-03 (GPU-only properties) | D-01: animations.css uses only transform/opacity |
| CORE-04 (will-change) | D-02: Already in animations.css transition classes |
| CORE-05 (contain) | D-03: Add to .img-view in ImagePreview.vue |

---

*Log generated: 2026-04-30*
*Mode: --auto (autonomous selection)*
