# Roadmap: Wallhaven 壁纸浏览器架构重构

> 创建时间：2025-04-25
> 最后更新：2026-04-27

---

## Milestones

- ✅ **v2.0 架构重构** — Phases 1-5 (shipped 2026-04-26)
- ✅ **v2.1 下载断点续传** — Phases 6-9 (shipped 2026-04-27) — [Archive](milestones/v2.1-ROADMAP.md)
- 🔵 **v2.2 Store 分层迁移** — Phases 10-13 (in progress)

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

---

### v2.2 Store 分层迁移 (Phases 10-13)

**Goal**: 将 views 中直接使用的 store 全部迁移到 composables，强化 View → Composable → Store 分层架构

#### Phase 10: Simple Substitutions

**Requirements**: SMIG-01, SMIG-02

**Goal**: 迁移简单直接的 store 访问到现有 composables

**Files**: `LocalWallpaper.vue`, `DownloadWallpaper.vue`

**Changes**:
- `LocalWallpaper.vue`: 移除 `useWallpaperStore` 导入，改用 `useSettings()` 获取 `downloadPath`
- `DownloadWallpaper.vue`: 移除 `useDownloadStore` 导入，改用 `useDownload()` 获取列表状态

**Success Criteria**:
1. LocalWallpaper.vue 无 `useWallpaperStore` 导入
2. DownloadWallpaper.vue 无 `useDownloadStore` 导入
3. 本地壁纸页面正常显示下载路径下的壁纸
4. 下载页面正常显示下载中和已完成列表

---

#### Phase 11: OnlineWallpaper Migration

**Requirements**: SMIG-03, CMIG-01

**Goal**: 迁移 OnlineWallpaper.vue 中的所有直接 store 访问

**Files**: `OnlineWallpaper.vue`

**Changes**:
- 替换 `wallpaperStore.totalPageData`, `.loading`, `.error` 为 `useWallpaperList()` 的返回值
- 替换 `wallpaperStore.settings.apiKey` 为 `useSettings()` 的返回值
- 验证滚动事件处理器与 composable 的 `loading` 状态正确协作

**Success Criteria**:
1. OnlineWallpaper.vue 无 `useWallpaperStore` 直接导入
2. 壁纸列表正常加载和分页
3. 加载状态正确显示（skeleton/loading indicator）
4. 错误状态正确显示错误信息
5. API Key 设置正确影响壁纸查询

---

#### Phase 12: SettingPage Migration

**Requirements**: CMIG-02, CMIG-03

**Goal**: 迁移 SettingPage.vue，处理响应式表单绑定

**Files**: `SettingPage.vue`, `useSettings.ts` (扩展)

**Changes**:
- 扩展 `useSettings` composable 支持表单响应式绑定（创建本地 reactive 副本）
- 移除 `useWallpaperStore` 直接导入
- 使用扩展后的 `useSettings()` 处理所有设置字段

**Success Criteria**:
1. SettingPage.vue 无 `useWallpaperStore` 导入
2. 所有设置字段正确显示当前值
3. 设置修改后保存按钮正确更新设置
4. 重置按钮正确恢复默认设置
5. 设置变更后相关功能正确响应（如 API Key 影响查询）

---

#### Phase 13: Verification & Enforcement

**Requirements**: CLUP-01, CLUP-02, CLUP-03, CLUP-04

**Goal**: 验证架构完整性并防止回归

**Delivers**:
- 验证所有 4 个 views 文件中无 `useWallpaperStore` 或 `useDownloadStore` 导入
- 添加 ESLint `no-restricted-imports` 规则防止 store 直接导入
- TypeScript 编译通过，无类型错误
- 手动测试验证所有现有功能行为不变

**Success Criteria**:
1. ESLint 规则生效，直接导入 store 报错
2. `npm run typecheck` 通过无错误
3. `npm run lint` 通过无错误
4. 手动测试：在线壁纸浏览、本地壁纸浏览、下载管理、设置页面全部正常

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
| 12 | SettingPage Migration | v2.2 | 0/5 | Pending | — |
| 13 | Verification & Enforcement | v2.2 | 0/4 | Pending | — |

---

*创建时间：2025-04-25*
*最后更新：2026-04-27 v2.2 roadmap created*
