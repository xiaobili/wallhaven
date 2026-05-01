# Phase 33: 下载队列与并发控制 - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-01
**Phase:** 33-下载队列与并发控制
**Areas discussed:** Queue Architecture, Concurrency Model, Integration with Existing Handlers, IPC Changes, Settings Access
**Mode:** --auto (all decisions auto-selected)

---

## Queue Architecture

| Option | Description | Selected |
|--------|-------------|----------|
| New DownloadQueue class in separate file | Clean separation from 900-line handler, encapsulated queue state | ✓ |
| Add queue logic to existing download.handler.ts | Simpler but increases file size and coupling | |

**Auto choice:** New DownloadQueue class in `electron/main/ipc/handlers/download-queue.ts`

## Concurrency Model

| Option | Description | Selected |
|--------|-------------|----------|
| Read maxConcurrentDownloads from electron-store on each dequeue | Live propagation, no IPC round-trip needed | ✓ |
| Pass setting via IPC from renderer | More complex, adds coupling to IPC flow | |

**Auto choice:** Read from electron-store (`import { store } from '../index'`)

## Integration with Existing Handlers

| Option | Description | Selected |
|--------|-------------|----------|
| Modify existing IPC handlers to enqueue instead of start | Minimal API change, backward compatible | ✓ |
| Add new IPC channels for queue operations | More explicit but breaks existing renderer code | |

**Auto choice:** Modify existing handlers (enqueue in start, dequeue-next in pause/cancel/complete)

## IPC Changes

| Option | Description | Selected |
|--------|-------------|----------|
| No new IPC channels — existing 'waiting' state sufficient | Zero API surface change | ✓ |
| Add queue status IPC channels | More visibility but unnecessary for this phase | |

**Auto choice:** No new IPC channels needed

---

## Claude's Discretion

- Queue<T> implementation details (array-based)
- Error handling for queue operations
- Logging strategy
- Function extraction approach for download execution logic

## Deferred Ideas

None — discussion stayed within phase scope.
