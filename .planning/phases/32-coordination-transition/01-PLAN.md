---
wave: 1
depends_on: []
files_modified:
  - electron/main/index.ts
requirements:
  - TIME-01
  - TIME-02
  - TIME-03
  - TIME-04
  - TRANS-01
  - TRANS-02
  - TRANS-03
autonomous: true
---

# Phase 32: Coordination & Transition - Implementation Plan

## Goal
Implement timing coordination between splash window and main window with smooth fade transitions and correct macOS reactivation behavior.

## Tasks

<task id="1" type="execute">
<description>Add minimum display timer + Promise coordination</description>

<read_first>
  - electron/main/index.ts (current app initialization flow)
  - .planning/phases/32-coordination-transition/32-CONTEXT.md (timing decisions)
</read_first>

<acceptance_criteria>
  - A timer Promise exists that resolves after exactly 1000ms
  - Timer starts when splash window is created
  - Promise.all() pattern waits for BOTH timer AND main window ready
  - Timer has cleanup logic (clearTimeout if app quits early)
  - mainWindow.show() is only called after BOTH conditions met
</acceptance_criteria>

<action>
Modify electron/main/index.ts:

1. Add variable to track splash start time or timer promise
   ```typescript
   let splashMinTimePromise: Promise<void> | null = null;
   ```

2. After splash window creation, create timer promise
   ```typescript
   splashWindow.loadFile(...)
   splashMinTimePromise = new Promise(resolve => setTimeout(resolve, 1000));
   ```

3. Modify mainWindow 'ready-to-show' handler
   - Remove or comment out the existing `mainWindow.show()` call
   - Store the readiness state instead, or wrap with Promise.all
   - Pattern:
     ```typescript
     mainWindow.on('ready-to-show', async () => {
       // Wait for BOTH minimum time AND readiness
       await splashMinTimePromise;
       // Fade logic here (task 2)
       mainWindow.show();
     });
     ```

4. Ensure timer cleanup
   - On app quit, if timeout hasn't fired, clear it
   - Or store timeoutId and use clearTimeout
</action>
</task>

<task id="2" type="execute">
<description>Implement fade transition for both windows</description>

<read_first>
  - electron/main/index.ts (current window show logic)
  - .planning/phases/32-coordination-transition/32-CONTEXT.md (transition decisions)
</read_first>

<acceptance_criteria>
  - Splash window fades from opacity 1 → 0 over ~200ms
  - Main window fades from opacity 0 → 1 over ~200ms
  - Fades happen SIMULTANEOUSLY (no visible gap)
  - Splash window is closed after fade completes
  - splashWindow variable is nulled after close
  - Event listeners removed after transition
</acceptance_criteria>

<action>
Modify electron/main/index.ts in the ready-to-show handler:

1. Set initial main window opacity to 0 before show
   ```typescript
   mainWindow.setOpacity(0);
   ```

2. In ready-to-show handler after await:
   ```typescript
   // Start fades simultaneously
   splashWindow?.setOpacity(0);
   mainWindow.setOpacity(1);
   
   // Give CSS transition time to complete, then close splash
   setTimeout(() => {
     splashWindow?.close();
     splashWindow = null;
   }, 200);
   ```

3. Note: Consider using BrowserWindow.webContents.on('did-finish-load') if
   CSS-level transitions are needed on the HTML side, but for MVP use
   Electron's setOpacity() API directly on the BrowserWindow objects.

4. Add CSS transitions in splash.html and main index.html for smoother fade:
   - splash.html: body { transition: opacity 0.2s ease-out; }
   - main index.html: similar transition if applicable
</action>
</task>

<task id="3" type="execute">
<description>Fix macOS reactivation behavior (don't re-show splash)</description>

<read_first>
  - electron/main/index.ts (current activate handler lines 178-182)
  - .planning/phases/32-coordination-transition/32-CONTEXT.md (macOS decisions)
</read_first>

<acceptance_criteria>
  - app.on('activate') handler exists
  - Handler checks BrowserWindow.getAllWindows().length === 0 before creating
  - Splash window is NOT created during reactivation
  - Only mainWindow is created on activate (if no windows exist)
  - Matches macOS convention: dock click reopens app if all windows closed
</acceptance_criteria>

<action>
Modify electron/main/index.ts activate handler (around line 178):

1. Current handler likely looks like:
   ```typescript
   app.on('activate', function () {
     if (BrowserWindow.getAllWindows().length === 0) createWindow()
   })
   ```

2. Verify this is correct — it only creates mainWindow (via createWindow)
   when there are no windows. Since createWindow() does NOT create the
   splash window, this is already correct for the splash constraint.

3. If createWindow() DOES include splash creation logic, refactor:
   - Extract splash creation to separate function
   - Only call splash creation from top-level app.whenReady()
   - createWindow() only creates main window

4. Ensure splash creation is NOT inside createWindow() — splash should be created
   once at app startup only, not on every window creation.
</action>
</task>

## Verification Criteria

<must_haves>
  - Promise.all() or equivalent waits for 1s min AND main ready
  - mainWindow.show() guarded by the coordination logic
  - Both windows fade simultaneously (opacity animation)
  - Splash window closed and reference nulled
  - macOS activate only creates main if no windows exist
  - Timer cleanup logic exists
  - No visible gap between splash and main window
</must_haves>
