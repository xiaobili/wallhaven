---
phase: 38-downloadwallpaperfile-layer-refactor-dedup
plan: 01
completed: 2026-05-02
status: complete
tasks:
  - task: 1
    name: Add FILE_EXISTS to IPC channel constants, types, and main-process handler
    status: complete
  - task: 2
    name: Add checkFileExists to preload bridge and whitelist
    status: complete
  - task: 3
    name: Add fileExists to electronClient and env.d.ts
    status: complete
---

# Plan 38-01 Summary: Add fileExists IPC channel

## Objective
Add a `fileExists` IPC channel end-to-end (main process handler -> preload bridge -> electron client wrapper) so that the service layer can check file existence on disk before downloading.

## Changes Made

### Files Modified (7 files)

1. **src/shared/types/ipc.ts**
   - Added `FILE_EXISTS: 'file-exists'` to `IPC_CHANNELS` object
   - Added `FileExistsRequest` and `FileExistsResponse` interfaces

2. **electron/main/ipc/handlers/file.handler.ts**
   - Added `file-exists` IPC handler using `fs.existsSync()` to check file existence

3. **electron/main/ipc/handlers/index.ts**
   - Added `'file-exists'` to `REGISTERED_CHANNELS` array

4. **electron/preload/types.ts**
   - Added `FileExistsResponse` to type re-exports
   - Added `IPC_CHANNELS.FILE_EXISTS` to `VALID_INVOKE_CHANNELS` whitelist

5. **electron/preload/index.ts**
   - Added `checkFileExists` method to `ElectronAPI` interface and bridge implementation

6. **src/clients/electron.client.ts**
   - Added `fileExists()` method returning `IpcResponse<boolean>` following the `deleteFile` pattern

7. **env.d.ts**
   - Added `checkFileExists` declaration to `ElectronAPI` interface

### Architecture
Main Process → IPC handler (`file-exists`) using `fs.existsSync()`
Preload → `checkFileExists` bridge method via `ipcRenderer.invoke()`
Renderer → `electronClient.fileExists()` returning `IpcResponse<boolean>`

## Verification
- Type-check: passed
- All 7 files modified as specified
- Acceptance criteria verified via grep

## Self-Check: PASSED
