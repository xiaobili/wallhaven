# Phase 32: Coordination & Transition - Context

**Gathered:** 2026-04-30
**Status:** Ready for planning

<domain>
## Phase Boundary

Implement timing coordination between splash window and main window. Ensure splash shows for minimum 1 second, stays visible until main window is ready, with smooth fade transitions. Handle macOS dock activation behavior.

Delivers:
- Min 1 second splash display (no flash on fast loads)
- Splash stays visible until main window is fully ready
- Main window shows only after both conditions met
- Splash fade-out + main window fade-in
- No visible gap between windows
- macOS reactivation from dock doesn't re-show splash
</domain>

<decisions>
## Implementation Decisions

### Timing Logic
- **D-01**: Use Promise.all() pattern — wait for both: 1 second timer AND main window 'ready-to-show' event**
- **D-02**: Minimum display order: splash stays visible until BOTH conditions satisfied
- **D-03**: Splash close sequence: fade splash → show main → close splash (show main → close splash (correction: fade splash out, fade main in sync to avoid gap)
- **D-04**: Timer starts when splash window is created (app launch time)

### Transition Animation
- **D-05**: Fade out: splash opacity 1 → 0 over 200ms
- **D-06**: Fade in: main opacity 0 → 1 over 200ms
- **D-07**: Use CSS transition on body element
- **D-08**: Sync transitions for both windows
- **D-09**: Electron setOpacity() API for window-level fade
- **D-10**: Timing: start fade-out and fade-in happen simultaneously to prevent desktop visible gap

### macOS Reactivation
- **D-11**: On app.on('activate') event handler
- **D-12**: Check BrowserWindow.getAllWindows().length === 0 before creating new window
- **D-13**: Splash window is NOT recreated on activate — only main window
- **D-14**: Reactivation only when all windows closed + dock click (macOS convention)

### Implementation Location
- **D-15**: All logic in electron/main/index.ts
- **D-16**: No preload or renderer code needed for timing
- **D-17**: Fade implemented in main process using BrowserWindow.setOpacity()
- **D-18**: CSS-level fade on body elements for smoothness

### Error Handling
- **D-19**: Clear timeout if app quits before ready (cleanup)
- **D-20**: Event listeners removed after transition completes
- **D-21**: Splash window reference nulled after close

### Claude's Discretion
- Exact Promise structure for timing coordination
- Whether to use CSS transitions or Electron opacity API or both
- Exact easing curve for fade animations
- Where to store splashWindow reference (module-level variable or closure)
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Requirements
- `.planning/ROADMAP.md` §Phase 32 — TIME-01 to TIME-04, TRANS-01 to TRANS-03
- `.planning/REQUIREMENTS.md` §Timing & Coordination + §Smooth Transition

### Existing Code Patterns
- `electron/main/index.ts` — splash window creation and app lifecycle handlers
- `src/static/css/animations.css` — existing fade transition patterns
- Phase 30 CONTEXT.md — splash window foundation decisions

### Electron API Reference
- `BrowserWindow.setOpacity()` — window-level fade control
- `app.on('activate', ...)` — macOS dock activation event
- `mainWindow.on('ready-to-show', ...)` — window readiness event
- `app.on('window-all-closed', ...)` — window cleanup handling

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `splashWindow` variable already exists in index.ts (lines 28-29)
- splash window creation logic in app.whenReady() chain (lines 152-170)
- main window `ready-to-show` event handler exists (lines 112-119)
- macOS activate handler already exists (lines 178-182) — needs modification

### Established Patterns
- BrowserWindow options structure with show: false initially
- Promise chain in app.whenReady() for async initialization
- Event listener pattern for window lifecycle
- macOS platform conventions already followed

### Integration Points
- Modify splash creation to capture start time
- Wrap mainWindow.show() in timing + readiness check
- Add Promise.all() coordination between timer and ready event
- Modify activate handler to NOT recreate splash

</code_context>

<specifics>
## Specific Ideas

- Promise pattern: `Promise.all([splashTimeout, mainReady])` ensures BOTH conditions met
- Timer starts at splash window creation (not at main window start)
- Fade sequence: set splash opacity 0 + main opacity 1 simultaneously, then close splash
- No visible gap means: NEVER hide splash before main is visible, overlap fade
</specifics>

<deferred>
## Deferred Ideas

- Loading progress indicator in splash (REQUIREMENTS.md lists as future)
- Splash screen with app version / changelog info
- Progress bar state updates from main process
- Custom splash background image or gradient
- Platform-specific transition timing variations

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 32-Coordination & Transition*
*Context gathered: 2026-04-30*
