# Research Summary: v3.0 首屏动画

---

## Stack Additions

**No new npm packages required.** Implementation uses:
- Native Electron `BrowserWindow` API
- Pure CSS keyframe animations (GPU-accelerated: `transform`, `opacity`)
- Standard `Promise.all()` for timing coordination

**Recommended:** Native HTML splash file (not Vue-based) for instant display.

---

## Feature Table Stakes

| Feature | Status | Notes |
|---------|--------|-------|
| Independent splash window | MVP | Frameless, centered, same dark theme |
| "Wallhaven" bounce animation | MVP | CSS `scale()` with cubic-bezier elastic easing |
| Minimum 1s display | MVP | Prevents flash when app loads fast |
| Wait for main window ready | MVP | `ready-to-show` event synchronization |
| Smooth transition | MVP | Fade splash out, main window in |

**Differentiators (Post-MVP):**
- Loading progress bar
- Staggered letter animation
- Wallpaper/gradient background
- Skip on cached fast launches

---

## Integration Points

**Modified:** `electron/main/index.ts`
- Add `createSplashWindow()` function
- Modify `createWindow()` to coordinate with splash
- Use Promise.all() for timing

**New Files:**
- `electron/main/splash.html` - Splash markup + CSS

**No renderer/src changes needed for MVP.**

---

## Watch Out For

1. **File path issues** - Test production build paths early
2. **Window flash** - Always enforce minimum display time
3. **macOS activate** - Don't show splash on dock reactivation
4. **Memory leaks** - Use `once()` not `on()`, null out references
5. **Animation performance** - Only animate `transform` and `opacity`

---

## Build Order Recommendation

1. **Phase 30:** Splash Window Foundation - Create window, basic HTML
2. **Phase 31:** Bounce Animation - Implement logo + elastic animation
3. **Phase 32:** Window Coordination - Timing, transitions, edge cases

---

*Created: 2026-04-30*
*Research complete ✓*
