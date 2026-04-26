---
plan: 09-PLAN-02
phase: 09-error-handling-edge-cases
requirement: ERRH-01
status: complete
completed: 2026-04-27
---

# PLAN-02: Range Support Notification - Summary

## What Was Built

Added user notification when server doesn't support Range requests during resume. When a resume attempt receives a 200 response instead of 206, users now see a clear Chinese message: "服务器不支持断点续传，已重新开始下载"

## Changes Made

### 1. Extended DownloadProgressData interface
- Added `resumeNotSupported?: boolean` field to both:
  - `src/shared/types/ipc.ts` (IPC layer)
  - `src/services/download.service.ts` (Service layer)

### 2. Updated download handler
- Modified `download.handler.ts` RESUME_DOWNLOAD_TASK handler
- Set `resumeNotSupported: true` when server returns 200 during resume
- Added log message for Range not supported scenario

### 3. Updated useDownload composable
- Added `showWarning` to destructured alert methods
- Modified `handleProgress` to show warning when flag is true
- Chinese message: "服务器不支持断点续传，已重新开始下载"

## Verification

- [x] Type-check passes (`npm run type-check`)
- [x] `resumeNotSupported` field present in both type definitions
- [x] Warning message shows in Chinese

## Files Modified

- `src/shared/types/ipc.ts` - Added resumeNotSupported field
- `src/services/download.service.ts` - Added resumeNotSupported field
- `electron/main/ipc/handlers/download.handler.ts` - Set flag on 200 response
- `src/composables/download/useDownload.ts` - Handle flag and show warning
