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
- ✅ **v4.0 多线程下载与重试退避机制** -- Phases 33-35 (shipped 2026-05-01)
- ✅ **v4.1 壁纸列表全选功能** -- Phase 36 (shipped 2026-05-01)
- ✅ **v4.2 Composable 提取** -- Phase 37 (shipped 2026-05-02)
- ✅ **v4.3 downloadWallpaperFile 分层重构** -- Phase 38 (shipped 2026-05-02)

---

## Phases

<details>
<summary>✅ v4.0 多线程下载与重试退避机制 (Phases 33-35) — SHIPPED 2026-05-01</summary>

- [x] Phase 33: 下载队列与并发控制 (3/3 plans) — completed 2026-05-01
- [x] Phase 34: 错误分类与重试退避 (3/3 plans) — completed 2026-05-01
- [x] Phase 35: 重试状态展示与UI集成 (3/3 plans) — completed 2026-05-01

</details>

<details>
<summary>✅ v4.1 壁纸列表全选功能 (Phase 36) — SHIPPED 2026-05-01</summary>

- [x] Phase 36: 壁纸列表全选功能 (1/1 plan) — completed 2026-05-01

</details>

<details>
<summary>✅ v4.2 Composable 提取 (Phase 37) — SHIPPED 2026-05-02</summary>

- [x] Phase 37: 将 FavoritesPage.vue 和 OnlineWallpaper.vue 中的 handleSetBg/setBg 与 downloadWallpaperFile 提取为可复用组合函数 (2/2 plans) — completed 2026-05-02

</details>

---

<details>
<summary>🚧 v4.3 downloadWallpaperFile 分层重构 (Phase 38) — SHIPPED 2026-05-02</summary>

- [x] Phase 38: downloadWallpaperFile 分层重构与重复下载检测 (2/2 plans) — completed 2026-05-02

Plans:
- [x] 38-01-PLAN.md — Add fileExists IPC infrastructure (IPC channel, preload bridge, electron client)
- [x] 38-02-PLAN.md — Add simpleDownload to service + refactor composable to delegate

</details>

---

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 33. 下载队列与并发控制 | v4.0 | 3/3 | Complete | 2026-05-01 |
| 34. 错误分类与重试退避 | v4.0 | 3/3 | Complete | 2026-05-01 |
| 35. 重试状态展示与UI集成 | v4.0 | 3/3 | Complete | 2026-05-01 |
| 36. 壁纸列表全选功能 | v4.1 | 1/1 | Complete | 2026-05-01 |
| 37. Composable 提取 | v4.2 | 2/2 | Complete | 2026-05-02 |
| 38. downloadWallpaperFile 分层重构 | v4.3 | 2/2 | Complete | 2026-05-02 |

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
| UI-01 | 35 | Show "retrying (X/3)" | Complete |
| UI-02 | 35 | Show retry countdown | Complete |
| UI-03 | 35 | Show final failure state | Complete |
