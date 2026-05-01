/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * Download Queue Infrastructure
 *
 * FIFO download queue that enforces the maxConcurrentDownloads setting.
 * Designed with zero circular dependencies — receives callbacks rather than
 * importing from download.handler.ts.
 *
 * - enqueue(): Add task, emit 'waiting' progress, attempt to start
 * - processQueue(): Read maxConcurrentDownloads from store, dequeue if slots available
 * - remove(): Remove a queued task by ID (for pause/cancel of waiting tasks)
 * - has(): Check if task is already queued (dedup)
 * - clear(): Reset entire queue (for app shutdown)
 */

import { BrowserWindow } from 'electron'
import { store } from '../index'
import { logHandler } from './base'

/**
 * A queued download task containing the parameters needed to start execution.
 */
export interface QueuedDownload {
  taskId: string
  url: string
  filename: string
  saveDir: string
}

/**
 * FIFO download queue that enforces maxConcurrentDownloads.
 * Reads concurrency setting fresh from electron-store on each processQueue() call (DL-03).
 * Uses callback pattern (getActiveCount, onDequeue) to avoid circular dependencies
 * with download.handler.ts.
 */
export class DownloadQueue {
  private _queue: QueuedDownload[] = []
  private _getActiveCount: () => number
  private _onDequeue: (item: QueuedDownload) => Promise<void>

  constructor(
    getActiveCount: () => number,
    onDequeue: (item: QueuedDownload) => Promise<void>,
  ) {
    this._getActiveCount = getActiveCount
    this._onDequeue = onDequeue
  }

  /** Number of tasks currently waiting in the queue */
  get length(): number {
    return this._queue.length
  }

  /**
   * Check if a task is already in the queue (dedup check).
   * Used by enqueue() to prevent duplicate entries (Pitfall 4).
   */
  has(taskId: string): boolean {
    return this._queue.some((item) => item.taskId === taskId)
  }

  /**
   * Add a task to the queue and attempt to start it immediately.
   * If at capacity, the task stays queued and a 'waiting' progress
   * event is emitted to all windows.
   */
  enqueue(item: QueuedDownload): void {
    if (this.has(item.taskId)) {
      logHandler('download-queue', `Task already queued: ${item.taskId}`, 'warn')
      return
    }

    this._queue.push(item)

    // Emit 'waiting' progress event so renderer shows queue state (DL-02)
    this._emitProgress(item.taskId, 'waiting', 0)

    this.processQueue()
  }

  /**
   * Core dequeue logic: reads maxConcurrentDownloads fresh from store,
   * starts as many tasks as slots allow, and updates remaining queue
   * items with their waiting status.
   *
   * Called after every state change that could free a slot:
   * - New task enqueued
   * - Active download completes/fails
   * - Active download paused or cancelled
   * - maxConcurrentDownloads setting changes (via getQueueInstance)
   */
  processQueue(): void {
    const maxConcurrent = store.get('appSettings')?.maxConcurrentDownloads ?? 3
    const activeCount = this._getActiveCount()

    logHandler(
      'download-queue',
      `processQueue: active=${activeCount}, max=${maxConcurrent}, queued=${this._queue.length}`,
      'info',
    )

    while (this._getActiveCount() < maxConcurrent && this._queue.length > 0) {
      const next = this._queue.shift()!
      logHandler('download-queue', `Dequeuing task: ${next.taskId}`, 'info')

      // Fire-and-forget — progress events communicate state to renderer.
      // The onDequeue callback calls processQueue() in its finally block
      // when the download completes or fails.
      this._onDequeue(next).catch((err: Error) => {
        logHandler('download-queue', `Queue task failed: ${next.taskId}: ${err.message}`, 'error')
      })
    }

    // Update waiting tasks with current queue information
    for (const item of this._queue) {
      this._emitProgress(item.taskId, 'waiting', 0)
    }
  }

  /**
   * Remove a queued task by taskId.
   * Used by pause/cancel handlers when the target is waiting in the queue.
   *
   * NOTE: Does NOT emit progress events — the caller (PAUSE/CANCEL handler)
   * handles state notification.
   *
   * @returns true if found and removed, false if not in queue
   */
  remove(taskId: string): boolean {
    const idx = this._queue.findIndex((item) => item.taskId === taskId)
    if (idx !== -1) {
      this._queue.splice(idx, 1)
      logHandler('download-queue', `Removed queued task: ${taskId}`, 'info')
      return true
    }
    logHandler('download-queue', `Task not found in queue: ${taskId}`, 'warn')
    return false
  }

  /**
   * Clear the entire queue (e.g., app shutdown).
   * Does NOT affect active downloads — only removes waiting tasks.
   */
  clear(): void {
    const count = this._queue.length
    this._queue = []
    logHandler('download-queue', `Queue cleared: ${count} tasks removed`, 'info')
  }

  /**
   * Emit a progress event to all BrowserWindows.
   * Uses the existing 'download-progress' channel (D-12, no new IPC channels).
   */
  private _emitProgress(
    taskId: string,
    state: 'waiting' | 'downloading' | 'paused',
    progress: number,
  ): void {
    const windows = BrowserWindow.getAllWindows()
    for (const win of windows) {
      win.webContents.send('download-progress', {
        taskId,
        state,
        progress,
        offset: 0,
        speed: 0,
      })
    }
  }
}

// ---- Singleton accessors for cross-module queue access (DL-03) ----

let _instance: DownloadQueue | null = null

/**
 * Register the queue singleton instance.
 * Called once from download.handler.ts after creating the queue.
 */
export function setQueueInstance(instance: DownloadQueue): void {
  _instance = instance
}

/**
 * Get the queue singleton instance from any module.
 * Returns null if not yet initialized.
 * Used by store.handler.ts (Plan 02) to trigger processQueue() on settings change.
 */
export function getQueueInstance(): DownloadQueue | null {
  return _instance
}
