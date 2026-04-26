# Roadmap: Wallhaven 壁纸浏览器架构重构

> 创建时间：2025-04-25
> 最后更新：2026-04-26

---

## Milestones

- ✅ **v2.0 架构重构** — Phases 1-5 (shipped 2026-04-26)
- 🔄 **v2.1 下载断点续传** — Phases 6-9 (in progress)

---

## Phases

<details>
<summary>✅ v2.0 架构重构 (Phases 1-5) — SHIPPED 2026-04-26</summary>

- [x] Phase 1: 基础设施与类型安全 (6/6 plans) — completed 2025-04-25
- [x] Phase 2: 数据层抽象 (8/8 plans) — completed 2025-04-25
- [x] Phase 3: 业务层与组合层 (8/8 plans) — completed 2025-04-25
- [x] Phase 4: IPC 模块化重构 (6/6 plans) — completed 2026-04-26
- [x] Phase 5: 表现层重构与清理 (7/7 plans) — completed 2026-04-26

</details>

<details>
<summary>🔄 v2.1 下载断点续传 (Phases 6-9) — IN PROGRESS</summary>

### Phase 6: Core Resume Infrastructure

**Focus:** IPC channels, type definitions, validation foundation

**Requirements:** INFR-01

**Status:** Complete (2026-04-26)

**Plans:**
1. ✅ Define ResumeDownloadParams and PendingDownload types in types package
2. ✅ Add RESUME_DOWNLOAD_TASK IPC channel definition
3. ✅ Add GET_PENDING_DOWNLOADS IPC channel definition
4. ✅ Register new IPC handlers with placeholder implementations
5. ✅ Add type guards for resume-related payloads

**Success Criteria:**
- ✓ TypeScript compiles without errors for new types
- ✓ IPC channels are registered and callable from renderer
- ✓ Type guards correctly validate resume payloads

---

### Phase 7: Main Process Implementation

**Focus:** Range requests, state persistence, temp file handling

**Requirements:** INFR-02, INFR-03, CORE-02

**Plans:**
1. Implement HTTP Range request support in download handler
2. Modify pause handler to preserve .download temp file instead of deleting
3. Implement state persistence to .download.json companion file
4. Create resume-download-task handler with byte offset support
5. Create get-pending-downloads handler to list incomplete tasks
6. Update download progress to persist offset/totalSize on each chunk

**Success Criteria:**
- ✓ Paused download retains .download temp file in filesystem
- ✓ State file (.download.json) contains correct offset and metadata
- ✓ Resume request correctly sends Range header with byte offset
- ✓ App restart loads pending downloads from persisted state

---

### Phase 8: Renderer Integration

**Focus:** Service layer, composable updates, app startup recovery

**Requirements:** CORE-01, CORE-03

**Plans:**
1. Add resumeDownload() method to DownloadService
2. Add getPendingDownloads() method to DownloadService
3. Update useDownload composable with resume functionality
4. Implement auto-restore of pending downloads on app mount
5. Add UI state handling for resumed downloads (progress display)

**Success Criteria:**
- ✓ User can click "Resume" button on paused download to continue
- ✓ App launch automatically detects and offers to resume incomplete downloads
- ✓ Progress bar shows correct progress after resume
- ✓ Download completes successfully from resume point

---

### Phase 9: Error Handling & Edge Cases

**Focus:** Range detection, validation, cleanup, graceful degradation

**Requirements:** ERRH-01, ERRH-02, ERRH-03

**Plans:**
1. Implement server Range support detection via HEAD request
2. Add file integrity validation before resume (size comparison)
3. Implement orphan temp file cleanup on app startup (>7 days old)
4. Add user notification when server doesn't support Range
5. Handle corrupted state file with fallback to fresh download

**Success Criteria:**
- ✓ User sees clear message when resume not supported by server
- ✓ Corrupted temp files are detected and handled gracefully
- ✓ Orphan temp files older than 7 days are cleaned on startup
- ✓ App remains stable when resume conditions are not met

</details>

---

## Progress

| Phase | Name | Milestone | Plans Complete | Status | Completed |
|-------|------|-----------|----------------|--------|-----------|
| 1 | 基础设施与类型安全 | v2.0 | 6/6 | Complete | 2025-04-25 |
| 2 | 数据层抽象 | v2.0 | 8/8 | Complete | 2025-04-25 |
| 3 | 业务层与组合层 | v2.0 | 8/8 | Complete | 2025-04-25 |
| 4 | IPC 模块化重构 | v2.0 | 6/6 | Complete | 2026-04-26 |
| 5 | 表现层重构与清理 | v2.0 | 7/7 | Complete | 2026-04-26 |
| 6 | Core Resume Infrastructure | v2.1 | 9/9 | Complete | 2026-04-26 |
| 7 | Main Process Implementation | v2.1 | 0/6 | Pending | — |
| 8 | Renderer Integration | v2.1 | 0/5 | Pending | — |
| 9 | Error Handling & Edge Cases | v2.1 | 0/5 | Pending | — |

---

## Requirement Traceability

| Requirement | Phase | Description |
|-------------|-------|-------------|
| CORE-01 | Phase 8 | User can pause download and resume from breakpoint |
| CORE-02 | Phase 7 | Application persists download progress to survive restart |
| CORE-03 | Phase 8 | Incomplete downloads auto-restore when app launches |
| INFR-01 | Phase 6 | IPC channels for resume-download-task and get-pending-downloads |
| INFR-02 | Phase 7 | HTTP Range request support in download handler |
| INFR-03 | Phase 7 | Temporary .download file preserved on pause |
| ERRH-01 | Phase 9 | Graceful degradation when server doesn't support Range |
| ERRH-02 | Phase 9 | File integrity validation before resume |
| ERRH-03 | Phase 9 | Orphan temp file cleanup on app startup |

**Coverage:** 9/9 requirements mapped ✓

---

*创建时间：2025-04-25*
*最后更新：2026-04-26 v2.1 里程碑路线图创建*
