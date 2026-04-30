# Architecture Research: Electron Splash Screen

## Target: v3.0 首屏动画

---

## Integration Points

### Current Main Process Flow

```
app.whenReady()
  ├── registerLocalFileProtocol()
  ├── createWindow()  <-- Hook here
  │     ├── new BrowserWindow({ show: false })
  │     ├── on('ready-to-show', () => window.show())
  │     └── loadURL() / loadFile()
  └── registerAllHandlers()
```

### New Flow with Splash Screen

```
app.whenReady()
  ├── createSplashWindow()  <-- NEW: show immediately
  │     └── loadFile('splash.html')
  ├── registerLocalFileProtocol()
  ├── createMainWindow()    <-- Modified, show: false
  │     └── on('ready-to-show', () => {
  │             // Wait for BOTH:
  │             // 1. Minimum splash time (1s)
  │             // 2. Main window ready
  │             closeSplashAndShowMain()
  │           })
  └── registerAllHandlers()
```

---

## File Structure Changes

```
electron/
├── main/
│   ├── index.ts           <-- Add splash window creation
│   ├── splash.html        <-- NEW: Splash markup
│   └── ipc/handlers/
└── preload/

src/
└── No changes needed for splash (pure HTML/CSS)
```

---

## Window Coordination Strategy

### Approach: Promise-based Synchronization

```typescript
// Track both conditions
const splashMinTime = new Promise(resolve => setTimeout(resolve, 1000))
const mainWindowReady = new Promise(resolve => mainWindow.once('ready-to-show', resolve))

// Wait for both
Promise.all([splashMinTime, mainWindowReady]).then(() => {
  splashWindow.close()
  mainWindow.show()
})
```

### Edge Cases Handled:

1. **Main window loads faster than 1s** → Wait for minimum time, no flash
2. **Main window loads slower than 1s** → Splash stays until ready
3. **Dev mode with DevTools auto-open** → DevTools opening doesn't trigger early show
4. **macOS app activation** → Don't show splash on reactivation

---

## IPC Communication (Optional)

If we want the main app to signal when it's truly ready (not just DOM ready):

```typescript
// Main process
ipcMain.once('app-fully-loaded', () => closeSplash())

// Vue app (App.vue mounted)
window.electronAPI.appFullyLoaded()
```

**For MVP:** Not needed. `ready-to-show` is sufficient.

---

## Build Considerations

The `splash.html` file must be bundled correctly:
- In `electron.vite.config.ts`, ensure `electron/main/splash.html` is copied to output
- Use `loadFile()` with path relative to the built output directory

**Alternative:** Embed splash HTML as a string to avoid file path issues.

---

*Created: 2026-04-30*
*Research complete ✓*
