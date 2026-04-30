# Milestone v3.0 Requirements: 首屏动画

---

## Active Requirements (This Milestone)

### Splash Window Infrastructure

- [ ] **SPLASH-01**: User sees a dedicated splash window when launching the app
- [ ] **SPLASH-02**: Splash window is frameless (no title bar, no window controls)
- [ ] **SPLASH-03**: Splash window is centered on screen when shown
- [ ] **SPLASH-04**: Splash window uses same dark theme as the app

### Bounce Logo Animation

- [ ] **ANIM-01**: Splash screen displays "Wallhaven" text as the logo
- [ ] **ANIM-02**: Logo animates with bounce + elastic effect (scale in)
- [ ] **ANIM-03**: Animation uses GPU-accelerated properties only (transform, opacity)
- [ ] **ANIM-04**: Animation plays smoothly at 60fps

### Timing & Coordination

- [ ] **TIME-01**: Splash screen displays for minimum 1 second (no flash)
- [ ] **TIME-02**: Splash screen stays visible until main window is fully ready
- [ ] **TIME-03**: Main window shows only after minimum time AND window ready
- [ ] **TIME-04**: On macOS reactivation (dock click), splash is NOT shown

### Smooth Transition

- [ ] **TRANS-01**: Splash window fades out smoothly when closing
- [ ] **TRANS-02**: Main window fades in smoothly when showing
- [ ] **TRANS-03**: No visible gap between splash close and main window show

---

## Future Requirements (Deferred)

- Loading progress bar or spinner below logo
- Staggered letter-by-letter animation
- Gradient or wallpaper background
- Skip splash on fast subsequent launches (cache)
- Custom animation timing configuration

---

## Out of Scope

| Feature | Reason |
|---------|--------|
| Interactive splash screen | Splash is display-only, no user interaction |
| Dynamic loading state updates | MVP doesn't track load progress |
| Platform-specific variations | Same experience on all platforms |
| Multi-monitor position logic | Center on primary monitor is sufficient |

---

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| SPLASH-01 to SPLASH-04 | TBD | Pending |
| ANIM-01 to ANIM-04 | TBD | Pending |
| TIME-01 to TIME-04 | TBD | Pending |
| TRANS-01 to TRANS-03 | TBD | Pending |

---

*Created: 2026-04-30*
*v3.0 首屏动画 - MVP Scope*
