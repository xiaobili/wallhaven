# Roadmap: Wallhaven 壁纸浏览器

---

## Milestones

- ✅ **v2.0 架构重构** -- Phases 1-5 (shipped 2026-04-26)
- ✅ **v2.1 下载断点续传** -- Phases 6-9 (shipped 2026-04-27)
- ✅ **v2.2 Store 分层迁移** -- Phases 10-13 (shipped 2026-04-27)
- ✅ **v2.3 ElectronAPI 分层重构** -- Phase 14 (shipped 2026-04-27)
- ✅ **v2.4 ImagePreview 导航功能** -- Phase 15 (shipped 2026-04-27)
- ✅ **v2.5 壁纸收藏功能** -- Phases 16-22 (shipped 2026-04-29)
- ✅ **v2.6 设置页缓存优化** -- Phase 23 (shipped 2026-04-29)
- ✅ **v2.7 图片切换动画** -- Phases 24-25 (shipped 2026-04-29)
- ✅ **v2.8 动画性能优化** -- Phases 26-27 (shipped 2026-04-30)
- ✅ **v2.9 LoadingOverlay 动画优化** -- Phases 28-29 (shipped 2026-04-30)
- ✅ **v3.0 首屏动画** -- Phases 30-32 (shipped 2026-04-30)
- 🚧 **v4.0 多线程下载与重试退避机制** -- Phases 33-35 (in progress)
- 🚧 **v4.1 壁纸列表全选功能** -- Phase 36 (in progress)

---

## Phases

- [x] **Phase 33: 下载队列与并发控制** -- Enforce concurrent download limits with main-process queue
- [x] **Phase 34: 错误分类与重试退避** -- Auto-retry transient failures with exponential backoff and jitter (2026-05-01)
- [ ] **Phase 35: 重试状态展示与UI集成** -- Show retry progress, countdown, and final failure state in download list

- [ ] **Phase 36: 壁纸列表全选功能** -- Add "select all" button to WallpaperList.vue header for batch selection on current page

---

## Phase Details

### Phase 33: 下载队列与并发控制
**Goal**: Download queue in main process gates concurrent execution so the maxConcurrentDownloads setting actually limits parallel work
**Depends on**: Nothing (first phase of v4.0)
**Requirements**: DL-01, DL-02, DL-03, DL-04
**Success Criteria** (what must be TRUE):
  1. User sets maxConcurrentDownloads=N and exactly N downloads execute in parallel; the (N+1)th enters waiting state
  2. When an active download finishes, the next waiting task auto-starts without user action
  3. Changing maxConcurrentDownloads from 3 to 5 immediately allows 2 more waiting tasks to begin
  4. Reducing maxConcurrentDownloads from 5 to 2 does not interrupt the 5 active downloads (they complete; new tasks respect limit of 2)
**Plans**: 3 plans

```
Plans:
- [x] 33-01-PLAN.md — Queue infrastructure: DownloadQueue class + executeDownload extraction (DONE)
- [ ] 33-02-PLAN.md — Handler integration: IPC handlers use queue + settings propagation (DL-03)
- [ ] 33-03-PLAN.md — Renderer adjustments: useDownload.ts for 'waiting' state handling
```

### Phase 34: 错误分类与重试退避
**Goal**: Automatic retry of transient download failures with exponential backoff + full jitter, slot-holding to prevent starvation
**Depends on**: Phase 33 (retry needs the queue for slot-holding)
**Requirement IDs**: DL-05, DL-06, DL-07, DL-08, DL-09
**Success Criteria** (what must be TRUE):
  1. Transient errors (ECONNRESET, ETIMEDOUT, 5xx, 429) trigger automatic retry; permanent errors (404, 403, 401) mark as failed immediately
  2. Retry delay follows exponential backoff with full jitter (base doubling + random offset, capped at 30s)
  3. A download fails permanently after 3 failed retry attempts
  4. A retrying download holds its queue slot -- no extra concurrent connections are created for retries
  5. Cancelling or pausing a download cancels any pending retry timer (no zombie downloads)
**Plans**: 3 plans

```
Plans:
- [x] 34-01-PLAN.md — Error classification and backoff utilities (DONE)
- [x] 34-02-PLAN.md — Retry loop: executeWithRetry + modified catch block (DONE)
- [x] 34-03-PLAN.md — Handler integration: queue + PAUSE + CANCEL (DONE)
```

### Phase 35: 重试状态展示与UI集成
**Goal**: Users see retry progress, countdown timer, and final failure state in the download list UI
**Depends on**: Phase 33, Phase 34
**Requirment IDs**: UI-01, UI-02, UI-03
**Success Criteria** (what must be TRUE):
  1. Download list shows "重试中 (第X次/共3次)" for downloads currently in retry
  2. Download list shows live countdown to next retry attempt (e.g., "下次重试: 4s")
  3. Downloads that exhausted all 3 retries display "下载失败 -- 已重试 3 次"
**Plans**: 3 plans

```
Plans:
- [ ] 35-01-PLAN.md — Type definitions, formatCountdown helper, main process 'retrying' emission (Wave 1)
- [ ] 35-02-PLAN.md — Composable retrying branch, countdown timer, store filter update (Wave 2)
- [ ] 35-03-PLAN.md — Template retrying/exhausted-failure UI blocks and CSS (Wave 3)
```
**UI hint**: yes

### Phase 36: 壁纸列表全选功能
**Goal**: Add a "select all on current page" button inside WallpaperList.vue `<header>` that batch-selects all visible wallpapers
**Depends on**: Nothing
**Plans**: 1 plan

```
Plans:
- [x] 36-01-PLAN.md — Add select-all button to header + implement batch selection logic
```

---

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 33. 下载队列与并发控制 | 3/3 | Complete | 2026-05-01 |
| 34. 错误分类与重试退避 | 3/3 | Complete | 2026-05-01 |
| 35. 重试状态展示与UI集成 | 0/3 | Not started | - |
| 36. 壁纸列表全选功能 | 1/1 | Complete | 2026-05-01 |

---

## Requirement Traceability

| ID | Phase | Description |
|----|-------|-------------|
| DL-01 | 33 | Follow maxConcurrentDownloads setting | Complete |
| DL-02 | 33 | Auto-queue excess downloads | Complete |
| DL-03 | 33 | Live setting propagation | Complete |
| DL-04 | 33 | Graceful concurrency reduction | Complete |
| DL-05 | 34 | Auto-retry on transient errors | Complete |
| DL-06 | 34 | Permanent errors fail immediately | Complete |
| DL-07 | 34 | Exponential backoff with jitter | Complete |
| DL-08 | 34 | Max 3 retries | Complete |
| DL-09 | 34 | Retry holds queue slot | Complete |
| UI-01 | 35 | Show "retrying (X/3)" | Pending |
| UI-02 | 35 | Show retry countdown | Pending |
| UI-03 | 35 | Show final failure state | Pending |

---

*Created: 2026-05-01*
*v4.0 多线程下载与重试退避机制 Roadmap*
