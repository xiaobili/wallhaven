# 35-01: Type Foundation & Main Process Emission — Summary

**Status:** Complete

## Changes Made

### 1. Type definitions updated (3 files)

- **src/types/index.ts** — Added `'retrying'` to `DownloadState` union; added `retryCount?`, `retryDelay?`, `retryStartedAt?`, `error?` to `DownloadItem`
- **src/shared/types/ipc.ts** — Added `'retrying'` to `DownloadProgressData.state`; added `retryCount?`, `retryDelay?` fields
- **src/services/download.service.ts** — Same changes as ipc.ts for local type parity

### 2. formatCountdown utility added

- **src/utils/helpers.ts** — New `export function formatCountdown(seconds: number): string` producing `"下次重试: Xs"` or `"即将重试..."` for ≤0

### 3. Retrying emission added to main process

- **electron/main/ipc/handlers/download.handler.ts** — In `executeWithRetry`, emits `state: 'retrying'` progress event with `retryCount` and `retryDelay` before each `waitWithBackoff()` call

## Verification

All acceptance criteria pass:
- `'retrying'` present in all 3 type files' state unions
- `retryCount`, `retryDelay`, `retryStartedAt`, `error` fields added to `DownloadItem`
- `retryCount`, `retryDelay` fields added to `DownloadProgressData` in both ipc.ts and download.service.ts
- `formatCountdown` exported from helpers.ts
- `state: 'retrying'` emission inserted before `waitWithBackoff`
