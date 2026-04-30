# Features Research: Electron Splash Screen

## Target: v3.0 首屏动画

---

## Feature Categories

### Core Features (Must-have for MVP)

| Feature | Description | Complexity |
|---------|-------------|------------|
| **Splash Window Creation** | Independent frameless window for splash screen | Low |
| **Bounce Text Animation** | "Wallhaven" logo with bounce + elastic CSS animation | Low |
| **Minimum Display Time** | Guarantee splash shows for at least 1 second (prevents flash) | Low |
| **Main Window Coordination** | Wait for main window's `ready-to-show` before closing splash | Low |
| **Smooth Transition** | Fade out splash while fading in main window | Medium |

---

### Optional Features (Future)

| Feature | Description | Priority |
|---------|-------------|----------|
| **Loading Progress Bar** | Show app loading progress with animation | Low |
| **Loading Spinner** | Animated spinner below logo | Low |
| **Custom Background** | Wallpaper or gradient background | Low |
| **Skip on Second Launch** | Skip splash if app launches quickly (cached) | Low |

---

## Animation Pattern: Bounce + Elastic

The user specified "弹跳 + 弹性" style. Here's the standard implementation:

```css
@keyframes bounceIn {
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
    transform: scale(1);
  }
}

.logo {
  animation: bounceIn 1s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}
```

**Variations:**
- Staggered letter animation: each letter animates sequentially
- Follow-through: small secondary bounce
- Subtle background pulse

---

## MVP Scope

For v3.0, focus on:
1. ✅ Splash window creation (frameless, centered)
2. ✅ Bounce-in text logo animation ("Wallhaven")
3. ✅ Minimum 1 second display
4. ✅ Wait for main window ready-to-show
5. ✅ Smooth fade transition

**Out of scope for v3.0:**
- Progress bar / loading spinner
- Variable loading states
- Skip-on-fast-launch logic

---

*Created: 2026-04-30*
*Research complete ✓*
