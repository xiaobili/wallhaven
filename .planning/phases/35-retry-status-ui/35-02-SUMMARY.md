# 35-02: Composable & Store Updates — Summary

**Status:** Complete

## Changes Made

### src/composables/download/useDownload.ts (7 changes)

1. **Vue import** — Added `ref` to import from vue
2. **UseDownloadReturn interface** — Added `getRetryRemaining: (item: DownloadItem) => number`
3. **Countdown state** — Added `tickCounter` ref + `countdownInterval` variable
4. **handleProgress** — Inserted `'retrying'` branch BEFORE `if (error)` check (D-05), stores `retryCount`, `retryDelay`, `retryStartedAt` on task
5. **if(error) block** — Modified to suppress error toast for exhausted retries (`error.includes('已重试')`), sets `task.retryCount = 3` and `task.error = error`
6. **onMounted/onUnmounted** — Replaced with countdown-aware versions, starts `setInterval(1000)` on mount, clears on unmount
7. **cancelDownload** — Added `task.state === 'retrying'` to IPC cancel condition
8. **getRetryRemaining** — New function computing remaining seconds from `retryDelay` and `retryStartedAt`, with reactivity via `tickCounter` ref
9. **Return object** — Added `getRetryRemaining`

### src/stores/modules/download/index.ts (1 change)

10. **activeDownloads** — Updated filter to include both `'downloading'` and `'retrying'` tasks

## Verification

- `'retrying'` branch in handleProgress before `if (error)` check ✓
- Exhausted retry failures DO NOT call `showError` ✓
- `cancelDownload` sends IPC for `'retrying'` tasks ✓
- `activeDownloads` includes `'retrying'` alongside `'downloading'` ✓
- Countdown timer starts on mount, clears on unmount ✓
