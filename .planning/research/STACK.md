# Stack Research: Electron Splash Screen

## Target: v3.0 首屏动画

---

## Current Stack (No changes needed)

The existing Electron + Vue 3 stack is fully capable for splash screen implementation:

| Component | Version | Usage for Splash Screen |
|-----------|---------|-------------------------|
| Electron | v41.2.2 | `BrowserWindow` for splash window, `ready-to-show` event |
| Vue 3 | v3.5.32 | CSS transitions, keyframe animations in Vue components |
| TypeScript | v6.0.0 | Type-safe window management |

**No new dependencies required.**

---

## Implementation Options

### Option A: Native HTML Splash (Recommended)

**Approach:** Simple local HTML file loaded directly by Electron, no Vue needed.

```javascript
// electron/main/index.ts
const splash = new BrowserWindow({
  width: 400,
  height: 300,
  frame: false,
  transparent: true,
  alwaysOnTop: true,
})
splash.loadFile('splash.html')
```

**Pros:**
- Instant load (no Vue bootstrap overhead)
- No dependency on renderer process
- Can show before app is ready
- Zero extra dependencies

**Cons:**
- Separate HTML/CSS file to maintain
- Animation is purely CSS-based

### Option B: Vue-based Splash in Same Window

**Approach:** Show splash screen as a Vue component in the main window.

**Pros:**
- Reuse Vue animation utilities
- Consistent styling with app
- Single window lifecycle

**Cons:**
- User sees blank window until Vue loads
- Splash screen delay defeats the purpose

### Option C: Vue-based Splash in Separate Window

**Approach:** Load a minimal Vue app just for splash.

**Pros:**
- Full Vue animation capabilities
- Same tech stack

**Cons:**
- Overhead of loading Vue twice
- Slower initial display

---

## Recommendation

**Use Option A (Native HTML Splash)** for fastest perceived performance. The splash screen should display instantly, not wait for Vue to load.

**Animation Stack:** Pure CSS keyframes + transforms (GPU-accelerated)
- `transform: scale()` for bounce
- `opacity` for fade
- `cubic-bezier(0.68, -0.55, 0.265, 1.55)` for elastic feel

**No npm packages needed.**

---

*Created: 2026-04-30*
*Research complete ✓*
