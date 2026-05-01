---
status: resolved
trigger: "Running npm run build:mac gives Vite warnings about modules being both dynamically and statically imported"
slug: vite-build-mixed-import-warnings
created: 2026-05-01
updated: 2026-05-01
---

## Current Focus

hypothesis: "Mixed static/dynamic imports caused by circular dependency avoidance pattern for `store` from index.ts"
test: "npm run build:mac"
expecting: "No Vite warnings about mixed static/dynamic imports"
next_action: "extract store to its own module, make all imports consistent"
reasoning_checkpoint: ""
tdd_checkpoint: ""

## Symptoms

- **Expected behavior**: `npm run build:mac` completes with no warnings
- **Actual behavior**: Two Vite warnings about mixed static/dynamic imports
- **Warning 1**: `download-queue.ts` is dynamically imported by `store.handler.ts` but statically imported by `download.handler.ts`
- **Warning 2**: `index.ts` (main) is dynamically imported by `download.handler.ts` and `store.handler.ts` but statically imported by `download-queue.ts`
- **Reproduction**: Run `npm run build:mac`
- **Timeline**: Just discovered

## Evidence

- [x] Warning details collected from user
- [x] Build reproduced locally with both warnings confirmed
- [x] Import graph analyzed

## Eliminated

- Making all imports dynamic does not work because `DownloadQueue` class is used at module level in `download.handler.ts` (line 708)
- Making all imports static does not work because `store.handler.ts` dynamically imports `../../index` to avoid circular dependency through `electron/main/index.ts`

## Resolution

**Root Cause**: `download-queue.ts` statically imports `{ store }` from `electron/main/index.ts` (line 17), while `store.handler.ts` and `download.handler.ts` dynamically import `../../index` to access `store`. This creates mixed-import warnings because:
- `download-queue.ts` -> `index.ts` is a static import
- `store.handler.ts` -> `index.ts` is a dynamic import
- `download.handler.ts` -> `index.ts` is a dynamic import

The dynamic imports were introduced to break circular dependencies: `index.ts` imports `handlers/index.ts` which imports `store.handler.ts`, and `store.handler.ts` needs `store` from `index.ts`.

Additionally, `store.handler.ts` dynamically imports `download-queue.ts` to access `getQueueInstance` for the same circular dependency reason.

**Fix**: Extract `store` initialization into its own module `electron/main/store.ts` with no circular dependencies. This allows:
1. All static imports for `store` (no more Warning 2)
2. Static import of `download-queue.ts` from `store.handler.ts` (no more Warning 1)
3. The circular dependency chain is broken: `index.ts` -> `store.ts` (dead end, no back edge)

**Files changed:**
- `electron/main/store.ts` (NEW) -- extracted store instance
- `electron/main/index.ts` -- import store from ./store instead of inline
- `electron/main/ipc/handlers/download-queue.ts` -- import store from ../../store
- `electron/main/ipc/handlers/store.handler.ts` -- static imports for store and download-queue
- `electron/main/ipc/handlers/download.handler.ts` -- static import for store

**Verification**: `npm run build` completes with 0 Vite warnings (previously 2). Module count: 397 (was 396). Output slightly smaller: 320.72 kB (was 321.32 kB).
