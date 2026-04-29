# Roadmap: Wallhaven 壁纸浏览器架构重构

> 创建时间：2025-04-25
> 最后更新：2026-04-29

---

## Milestones

- ✅ **v2.0 架构重构** — Phases 1-5 (shipped 2026-04-26) — [Archive](milestones/v2.0-ROADMAP.md)
- ✅ **v2.1 下载断点续传** — Phases 6-9 (shipped 2026-04-27) — [Archive](milestones/v2.1-ROADMAP.md)
- ✅ **v2.2 Store 分层迁移** — Phases 10-13 (shipped 2026-04-27)
- ✅ **v2.3 ElectronAPI 分层重构** — Phase 14 (shipped 2026-04-27)
- ✅ **v2.4 ImagePreview 导航功能** — Phase 15 (shipped 2026-04-27)
- ✅ **v2.5 壁纸收藏功能** — Phases 16-22 (shipped 2026-04-29) — [Archive](milestones/v2.5-ROADMAP.md)

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
<summary>✅ v2.1 下载断点续传 (Phases 6-9) — SHIPPED 2026-04-27</summary>

- [x] Phase 6: Core Resume Infrastructure (9/9 plans) — completed 2026-04-26
- [x] Phase 7: Main Process Implementation (4/4 plans) — completed 2026-04-26
- [x] Phase 8: Renderer Integration (5/5 plans) — completed 2026-04-26
- [x] Phase 9: Error Handling & Edge Cases (3/3 plans) — completed 2026-04-27

</details>

<details>
<summary>✅ v2.2 Store 分层迁移 (Phases 10-13) — SHIPPED 2026-04-27</summary>

- [x] Phase 10: Simple Substitutions (2/2 plans) — completed 2026-04-27
- [x] Phase 11: OnlineWallpaper Migration (1/5 plans) — completed 2026-04-27
- [x] Phase 12: SettingPage Migration (2/2 plans) — completed 2026-04-27
- [x] Phase 13: Verification & Enforcement (3/3 plans) — completed 2026-04-27

</details>

<details>
<summary>✅ v2.3 ElectronAPI 分层重构 (Phase 14) — SHIPPED 2026-04-27</summary>

- [x] Phase 14: ElectronAPI Layer Refactor (6/6 plans) — completed 2026-04-27

</details>

<details>
<summary>✅ v2.4 ImagePreview 导航功能 (Phase 15) — SHIPPED 2026-04-27</summary>

- [x] Phase 15: ImagePreview Navigation (1/1 plan) — completed 2026-04-27

</details>

<details>
<summary>✅ v2.5 壁纸收藏功能 (Phases 16-22) — SHIPPED 2026-04-29</summary>

- [x] Phase 16: Data Layer Foundation (2/2 plans) — completed 2026-04-28
- [x] Phase 17: Business Layer (Service) (2/2 plans) — completed 2026-04-28
- [x] Phase 18: Composable Layer (1/1 plan) — completed 2026-04-28
- [x] Phase 19: Collections Management UI (7/7 plans) — completed 2026-04-28
- [x] Phase 20: Favorites Operations UI (4/4 plans) — completed 2026-04-28
- [x] Phase 21: Favorites Browsing UI (2/2 plans) — completed 2026-04-28
- [x] Phase 22: Default Collection & Quick Favorite (5/5 plans) — completed 2026-04-28

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
| 7 | Main Process Implementation | v2.1 | 4/4 | Complete | 2026-04-26 |
| 8 | Renderer Integration | v2.1 | 5/5 | Complete | 2026-04-26 |
| 9 | Error Handling & Edge Cases | v2.1 | 3/3 | Complete | 2026-04-27 |
| 10 | Simple Substitutions | v2.2 | 2/2 | Complete | 2026-04-27 |
| 11 | OnlineWallpaper Migration | v2.2 | 1/5 | Complete | 2026-04-27 |
| 12 | SettingPage Migration | v2.2 | 2/2 | Complete | 2026-04-27 |
| 13 | Verification & Enforcement | v2.2 | 3/3 | Complete | 2026-04-27 |
| 14 | ElectronAPI Layer Refactor | v2.3 | 6/6 | Complete | 2026-04-27 |
| 15 | ImagePreview Navigation | v2.4 | 1/1 | Complete | 2026-04-27 |
| 16 | Data Layer Foundation | v2.5 | 2/2 | Complete | 2026-04-28 |
| 17 | Business Layer (Service) | v2.5 | 2/2 | Complete | 2026-04-28 |
| 18 | Composable Layer | v2.5 | 1/1 | Complete | 2026-04-28 |
| 19 | Collections Management UI | v2.5 | 7/7 | Complete | 2026-04-28 |
| 20 | Favorites Operations UI | v2.5 | 4/4 | Complete | 2026-04-28 |
| 21 | Favorites Browsing UI | v2.5 | 2/2 | Complete | 2026-04-28 |
| 22 | Default Collection & Quick Favorite | v2.5 | 5/5 | Complete | 2026-04-28 |

---

## Next Milestone

▶ **Start Next Milestone** — `/gsd-new-milestone`

---

*创建时间：2025-04-25*
*最后更新：2026-04-29 v2.5 milestone archived*
