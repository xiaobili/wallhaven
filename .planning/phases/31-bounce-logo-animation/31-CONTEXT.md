# Phase 31: Bounce Logo Animation - Context

**Gathered:** 2026-04-30
**Status:** Ready for planning

<domain>
## Phase Boundary

Implement the "Wallhaven" text logo with bounce + elastic scale animation in the splash window. The animation runs when the splash window loads and uses only GPU-accelerated CSS properties (transform, opacity) for 60fps performance.

Delivers:
- Text-based "Wallhaven" logo in splash.html
- Bounce + elastic scale animation (0.3 → 1.05 → 0.9 → 1.0)
- 1 second total duration
- 60fps smooth animation

</domain>

<decisions>
## Implementation Decisions

### Logo Styling
- **D-01:** Logo text is "Wallhaven" — clean modern typography
- **D-02:** Font stack: `system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`
- **D-03:** Font weight: bold (700), size: 42px, color: white (#fff)
- **D-04:** Centered vertically and horizontally in the 400×300 splash window

### Animation Behavior
- **D-05:** Animation sequence: scale from 0.3 → 1.05 (overshoot) → 0.9 (settle) → 1.0 (final)
- **D-06:** Total duration: 1 second
- **D-07:** Easing: cubic-bezier(0.68, -0.55, 0.265, 1.55) — classic elastic bounce
- **D-08:** Fade in opacity simultaneously: 0 → 1 during animation

### Performance & Accessibility
- **D-09:** Only GPU-accelerated properties: `transform` (scale), `opacity`
- **D-10:** Add `will-change: transform, opacity` hint for browser optimization
- **D-11:** Reduced motion support: simple fade fallback (0.15s duration)
- **D-12:** Add `contain: layout paint` for animation isolation

### Claude's Discretion
- Exact keyframe percentage splits (where 1.05, 0.9, and 1.0 land)
- Letter-spacing and subtle text-shadow details for visual polish
- Whether to reuse existing animations.css or keep splash CSS self-contained

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Requirements
- `.planning/ROADMAP.md` §Phase 31 — ANIM-01 to ANIM-04 requirements and success criteria
- `.planning/REQUIREMENTS.md` §Bounce Logo Animation — ANIM-01 to ANIM-04 detailed specs

### Existing Animation Patterns
- `src/static/css/animations.css` — GPU-optimized animation keyframes, transition classes, reduced motion support
- `src/components/LoadingOverlay.vue` — Example of animation CSS import and usage

### Splash Window Infrastructure
- `electron/main/index.ts` — Splash window creation and configuration (lines 153-170)
- `electron/renderer/splash.html` — Current splash window HTML template

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `animations.css` — Established pattern for GPU-optimized keyframes with `will-change` hints
- `@media (prefers-reduced-motion: reduce)` — Standard accessibility fallback used throughout the app
- `.animation-container` class — CSS containment pattern for performance isolation

### Established Patterns
- **Keyframe naming:** descriptive, single-purpose (e.g., `slide-left`, `modal-open`)
- **Transition classes:** Vue Transition naming convention (`fade-enter-active`, etc.)
- **CSS containment:** `contain: layout paint` used to isolate animation rendering
- **Easing conventions:** cubic-bezier curves for material-style animations (0.4, 0, 0.2, 1)

### Integration Points
- Modify `electron/renderer/splash.html` — Add logo element and inline `<style>` block (self-contained, no external dependencies)
- Animation triggers automatically on DOM load — no JS required for logo animation

</code_context>

<specifics>
## Specific Ideas

- Animation sequence matches success criteria exactly: scales from 0.3 → 1.05 → 0.9 → 1.0 (bounce effect)
- Follow existing animations.css patterns for consistency with app-wide animation style
- Splash.html should remain self-contained — no external CSS imports needed for MVP

</specifics>

<deferred>
## Deferred Ideas

- Loading progress bar or spinner below logo — Deferred to future milestone (REQUIREMENTS.md §Future)
- Staggered letter-by-letter animation — Deferred to future milestone (REQUIREMENTS.md §Future)
- Gradient or wallpaper background — Deferred to future milestone (REQUIREMENTS.md §Future)
- Dynamic loading state updates — Out of scope per REQUIREMENTS.md §Out of Scope

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 31-Bounce Logo Animation*
*Context gathered: 2026-04-30*
