---
wave: 1
depends_on: []
files_modified:
  - electron/renderer/splash.html
requirements:
  - ANIM-01
  - ANIM-02
  - ANIM-03
  - ANIM-04
autonomous: true
---

# Phase 31: Bounce Logo Animation - Implementation Plan

## Goal
Add "Wallhaven" text logo with elastic bounce animation to splash.html, using only GPU-accelerated CSS properties.

## Tasks

<task id="1" type="execute">
<description>Add logo element and CSS animation to splash.html</description>

<read_first>
  - electron/renderer/splash.html (current splash page structure)
  - src/static/css/animations.css (existing GPU animation patterns)
  - .planning/phases/31-bounce-logo-animation/31-CONTEXT.md (animation decisions)
</read_first>

<acceptance_criteria>
  - splash.html contains a visible div or h1 with text "Wallhaven"
  - Element has CSS animation using transform: scale() only (no top/left/margin)
  - Animation includes elastic bounce sequence: scale 0.3 → 1.05 → 0.9 → 1.0
  - Animation duration is approximately 1 second
  - CSS contains will-change: transform, opacity hint
  - CSS contains contain: layout paint or similar isolation
  - @media (prefers-reduced-motion: reduce) fallback exists with simple fade/no animation
  - Element is centered vertically and horizontally on the page
  - Text is white, bold, and uses system-ui font stack
</acceptance_criteria>

<action>
Modify electron/renderer/splash.html:

1. Add logo element inside body:
   ```html
   <div class="logo">Wallhaven</div>
   ```

2. Add CSS to the existing style block:
   ```css
   .logo {
     font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
     font-weight: 700;
     font-size: 42px;
     color: #fff;
     opacity: 0;
     transform: scale(0.3);
     animation: logoBounce 1s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards;
     will-change: transform, opacity;
     contain: layout paint;
   }

   @keyframes logoBounce {
     0% {
       opacity: 0;
       transform: scale(0.3);
     }
     50% {
       opacity: 1;
       transform: scale(1.05);
     }
     70% {
       transform: scale(0.9);
     }
     100% {
       opacity: 1;
       transform: scale(1);
     }
   }

   @media (prefers-reduced-motion: reduce) {
     .logo {
       animation-name: fadeIn;
       animation-duration: 0.15s;
       animation-timing-function: ease-out;
     }
     
     @keyframes fadeIn {
       0% { opacity: 0; }
       100% { opacity: 1; }
     }
   }
   ```

3. Verify the body already has display: flex, align-items: center, justify-content: center
   (from Phase 30 splash foundation) so the logo centers correctly.
</action>
</task>

## Verification Criteria

<must_haves>
  - Logo element "Wallhaven" exists in splash.html
  - Animation uses only transform: scale() and opacity (GPU-accelerated)
  - Keyframes include 0.3 → 1.05 → 0.9 → 1.0 sequence
  - 1 second duration with cubic-bezier(0.68, -0.55, 0.265, 1.55) easing
  - will-change and containment hints present
  - prefers-reduced-motion fallback exists
  - No JavaScript required for animation
</must_haves>
