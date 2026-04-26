# Requirements: Wallhaven 壁纸浏览器 v2.1

**Defined:** 2026-04-26
**Core Value:** 断点续传，下载无忧 — 大文件下载不再担心中断，随时随地暂停恢复

## v2.1 Requirements

### Core (核心需求)

- [ ] **CORE-01**: User can pause download and resume from breakpoint (not restart from 0)
- [ ] **CORE-02**: Application persists download progress to survive restart
- [ ] **CORE-03**: Incomplete downloads auto-restore when app launches

### Infrastructure (基础设施)

- [ ] **INFR-01**: IPC channels for resume-download-task and get-pending-downloads
- [ ] **INFR-02**: HTTP Range request support in download handler
- [ ] **INFR-03**: Temporary .download file preserved on pause (not deleted)

### Error Handling (错误处理)

- [ ] **ERRH-01**: Graceful degradation when server doesn't support Range requests
- [ ] **ERRH-02**: File integrity validation before resume (size check)
- [ ] **ERRH-03**: Orphan temp file cleanup on app startup (>7 days old)

## v2.2+ Requirements

Deferred to future milestone.

### Queue Management

- **QUEUE-01**: User can queue multiple downloads with priority
- **QUEUE-02**: Concurrent download limit with automatic queuing
- **QUEUE-03**: Drag to reorder download queue

### Advanced Features

- **ADVN-01**: Multi-threaded segmented downloads
- **ADVN-02**: Download speed limiting
- **ADVN-03**: Scheduled download times

## Out of Scope

| Feature | Reason |
|---------|--------|
| Multi-threaded downloads | High complexity, limited benefit for typical wallpaper sizes (<50MB) |
| Download queue management | Current milestone focuses on resume core, queue can be v2.2+ |
| Speed limiting | Non-essential feature, defer to future |
| Download scheduling | Out of scope for this milestone |
| New UI elements | Keep existing UI, only enhance behavior |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| CORE-01 | Phase 8 | Pending |
| CORE-02 | Phase 7 | Pending |
| CORE-03 | Phase 8 | Pending |
| INFR-01 | Phase 6 | ✅ Complete |
| INFR-02 | Phase 7 | Pending |
| INFR-03 | Phase 7 | Pending |
| ERRH-01 | Phase 9 | Pending |
| ERRH-02 | Phase 9 | Pending |
| ERRH-03 | Phase 9 | Pending |

**Coverage:**
- v2.1 requirements: 9 total
- Mapped to phases: 9
- Complete: 1
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-26*
*Last updated: 2026-04-26 after roadmap creation*
