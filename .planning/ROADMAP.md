# Roadmap: v3.0 首屏动画

---

## Overview

| Metric | Value |
|--------|-------|
| **Phases** | 3 |
| **Requirements** | 15 |
| **Starting Phase** | 30 |
| **Estimated** | ~300 lines of code |

---

## Phase Summary

| # | Phase | Goal | Requirements | Success Criteria |
|---|-------|------|--------------|------------------|
| 30 | Splash Window Foundation | Create and configure the splash window | SPLASH-01 ~ 04 | 4 |
| 31 | Bounce Logo Animation | Implement elastic bounce logo animation | ANIM-01 ~ 04 | 4 |
| 32 | Coordination & Transition | Timing logic + smooth transitions | TIME-01 ~ 04, TRANS-01 ~ 03 | 7 |

---

## Phase Details

### Phase 30: Splash Window Foundation

**Goal:** Create the splash window infrastructure in Electron main process

**Requirements:**
- **SPLASH-01**: User sees a dedicated splash window when launching the app
- **SPLASH-02**: Splash window is frameless (no title bar, no window controls)
- **SPLASH-03**: Splash window is centered on screen when shown
- **SPLASH-04**: Splash window uses same dark theme as the app

**Success Criteria:**
1. Launching `npm run dev` shows splash window before main window
2. Splash window has no title bar or window controls
3. Splash window appears centered on primary display
4. Splash window background is dark (#1a1a1a or matching app theme)
5. No errors in dev tools console related to splash window

---

### Phase 31: Bounce Logo Animation

**Goal:** Implement the "Wallhaven" text logo with bounce + elastic animation

**Requirements:**
- **ANIM-01**: Splash screen displays "Wallhaven" text as the logo
- **ANIM-02**: Logo animates with bounce + elastic effect (scale in)
- **ANIM-03**: Animation uses GPU-accelerated properties only (transform, opacity)
- **ANIM-04**: Animation plays smoothly at 60fps

**Success Criteria:**
1. "Wallhaven" text is clearly visible in splash window
2. Animation: scales from 0.3 → 1.05 → 0.9 → 1.0 (bounce effect)
3. Animation uses `transform: scale()` and `opacity` only
4. DevTools Performance tab shows consistent 60fps during animation
5. Animation timing: ~1 second total duration with elastic easing

---

### Phase 32: Coordination & Transition

**Goal:** Implement timing logic and smooth window transitions

**Requirements:**
- **TIME-01**: Splash screen displays for minimum 1 second (no flash)
- **TIME-02**: Splash screen stays visible until main window is fully ready
- **TIME-03**: Main window shows only after minimum time AND window ready
- **TIME-04**: On macOS reactivation (dock click), splash is NOT shown
- **TRANS-01**: Splash window fades out smoothly when closing
- **TRANS-02**: Main window fades in smoothly when showing
- **TRANS-03**: No visible gap between splash close and main window show

**Success Criteria:**
1. Fast dev load: Splash shows for exactly ~1 second, not less
2. Slow load simulation: Splash stays until main window ready
3. Closing and reopening app via dock (macOS) does NOT show splash
4. Splash opacity animates from 1 → 0 on close
5. Main window opacity animates from 0 → 1 on show
6. User never sees desktop between splash and main window
7. No memory leaks: splashWindow reference cleared after close

---

## Requirement Traceability

| ID | Phase | Description |
|----|-------|-------------|
| SPLASH-01 | 30 | Dedicated splash window on launch |
| SPLASH-02 | 30 | Frameless window |
| SPLASH-03 | 30 | Centered on screen |
| SPLASH-04 | 30 | Dark theme matching |
| ANIM-01 | 31 | "Wallhaven" text logo |
| ANIM-02 | 31 | Bounce + elastic animation |
| ANIM-03 | 31 | GPU-accelerated properties only |
| ANIM-04 | 31 | 60fps smooth animation |
| TIME-01 | 32 | Minimum 1 second display |
| TIME-02 | 32 | Wait for main window ready |
| TIME-03 | 32 | Both conditions required |
| TIME-04 | 32 | No splash on macOS reactivate |
| TRANS-01 | 32 | Splash fade out |
| TRANS-02 | 32 | Main window fade in |
| TRANS-03 | 32 | No visible gap |

---

*Created: 2026-04-30*
*v3.0 首屏动画 Roadmap ✓*
