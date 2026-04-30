# Pitfalls Research: Electron Splash Screen

## Target: v3.0 首屏动画

---

## Common Mistakes & Solutions

### 1. Splash Window Flash / Flicker

**Problem:** User sees splash appear then instantly disappear because main window was already ready.

**Solution:** Enforce minimum display time (1000ms). Use Promise.all to wait for BOTH minimum time AND window ready.

```typescript
// ❌ Bad: Close as soon as ready
mainWindow.on('ready-to-show', () => {
  splash.close()
  mainWindow.show()
})

// ✅ Good: Guarantee minimum display time
const minTime = new Promise(r => setTimeout(r, 1000))
const windowReady = new Promise(r => mainWindow.once('ready-to-show', r))
Promise.all([minTime, windowReady]).then(...)
```

---

### 2. Memory Leaks from Unclosed Window

**Problem:** Splash window reference is never cleared, or listeners never removed.

**Solution:** Use `once()` not `on()` for events. Clear reference after close.

```typescript
splashWindow.once('closed', () => {
  splashWindow = null
})
```

---

### 3. Transparent Window Issues on Windows

**Problem:** `transparent: true` has rendering issues on some Windows versions.

**Solution:**
- Test on target platforms
- Fallback to solid background if needed
- Avoid rounded corners on transparent windows (anti-aliasing issues)

**For MVP:** Use solid dark background matching app theme.

---

### 4. File Path Issues in Production

**Problem:** `splash.html` path works in dev but not in built app.

**Solution:**
- Use `__dirname` relative paths consistently
- Ensure splash.html is in Electron's build output directory
- Test `npm run build` + run packaged app

```typescript
// ✅ Correct
splash.loadFile(join(__dirname, 'splash.html'))
```

---

### 5. DevTools Auto-open Triggers Early Show

**Problem:** In dev mode, `mainWindow.webContents.openDevTools()` triggers `ready-to-show` prematurely.

**Solution:** Check if splash window still exists before closing. Or open DevTools after showing.

---

### 6. macOS Activate Event

**Problem:** On macOS, clicking dock icon when no windows open calls `createWindow()` again. Don't show splash on reactivation.

**Solution:**
```typescript
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    // Skip splash on reactivation
    createMainWindow({ skipSplash: true })
  }
})
```

---

### 7. Animation Performance

**Problem:** CSS animation janks because it's not GPU-accelerated.

**Solution:** Always animate `transform` and `opacity` only. Avoid animating `width`, `height`, `top`, `left`.

```css
/* ❌ Bad: Triggers layout */
@keyframes bad {
  from { margin-top: 100px; }
  to { margin-top: 0; }
}

/* ✅ Good: GPU accelerated */
@keyframes good {
  from { transform: translateY(100px); }
  to { transform: translateY(0); }
}
```

---

## Priority of Issues

| Issue | Severity | When to Address |
|-------|----------|-----------------|
| Minimum time enforcement | High | Phase 1 |
| File path handling | High | Phase 1 |
| Memory leak prevention | Medium | Phase 1 |
| macOS activate handling | Low | Phase 2 |
| Transparent window issues | Low | Phase 2 |
| DevTools timing | Low | Optional |

---

*Created: 2026-04-30*
*Research complete ✓*
