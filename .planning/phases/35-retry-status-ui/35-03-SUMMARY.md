# 35-03: UI Template & CSS — Summary

**Status:** Complete

## Changes Made

### src/views/DownloadWallpaper.vue (5 changes)

1. **Import** — Added `formatCountdown` from helpers
2. **Destructure** — Added `getRetryRemaining` from `useDownload()`
3. **`:class` binding** — Changed from ternary to object syntax, adds `'failed-item'` class when `state === 'failed' && retryCount === 3`
4. **Template blocks** — Added 3 new `v-show` blocks in `.rigth-bottoim`:
   - UI-01: `"重试中 (第{{ item.retryCount }}次/共3次)"` when `state === 'retrying'`
   - UI-02: Live countdown `formatCountdown(getRetryRemaining(item))` when `state === 'retrying'`
   - UI-03: `"下载失败 — 已重试 3 次"` when `state === 'failed' && retryCount === 3`
5. **CSS** — Added 3 rule sets:
   - `.failed-item .dowloaded-process-block` — gray progress bar (exhausted retries)
   - `.dowload-countdown` — margin styling for countdown text
   - `.failed-message` — red-tinted text for failure message

## Verification

- UI-01 "重试中 (第X次/共3次)" ✓
- UI-02 Live countdown via `formatCountdown(getRetryRemaining(item))` ✓
- UI-03 "下载失败 — 已重试 3 次" with gray progress bar ✓
- Cancel button always visible (not inside state-specific v-show) ✓
- No pause button during retrying ✓
