# Requirements: Wallhaven 壁纸浏览器

**Defined:** 2026-04-27
**Milestone:** v2.2 Store 分层迁移
**Core Value:** 分层架构强化 — Views 通过 Composables 访问 Store，不再直接引用

---

## v2.2 Requirements

将 views 中直接使用的 store 全部迁移到 composables，强化 View → Composable → Store 分层架构。

### 简单迁移 (Simple Migration)

- [x] **SMIG-01**: LocalWallpaper.vue 移除 `useWallpaperStore` 导入，改用 `useSettings()` 获取 `downloadPath` ✓ Phase 10
- [x] **SMIG-02**: DownloadWallpaper.vue 移除 `useDownloadStore` 导入，改用 `useDownload()` 获取列表状态 ✓ Phase 10
- [x] **SMIG-03**: OnlineWallpaper.vue 移除直接 store 状态访问，改用 `useWallpaperList()` 获取 `wallpapers`, `loading`, `error` ✓ Phase 11

### 复杂迁移 (Complex Migration)

- [x] **CMIG-01**: OnlineWallpaper.vue 移除 `settings.apiKey` 直接访问，改用 `useSettings()` ✓ Phase 11
- [ ] **CMIG-02**: SettingPage.vue 扩展 `useSettings` composable 支持 v-model 响应式绑定
- [ ] **CMIG-03**: SettingPage.vue 移除 `useWallpaperStore` 导入，使用扩展后的 `useSettings()`

### 清理与验证 (Cleanup & Verification)

- [ ] **CLUP-01**: 验证所有 4 个 views 文件中无 `useWallpaperStore` 或 `useDownloadStore` 导入
- [ ] **CLUP-02**: 添加 ESLint `no-restricted-imports` 规则防止 store 直接导入
- [ ] **CLUP-03**: TypeScript 编译通过，无类型错误
- [ ] **CLUP-04**: 所有现有功能行为不变（手动测试验证）

---

## v2.3+ Requirements (Deferred)

以下需求在后续里程碑考虑：

- [ ] 创建 `useLocalWallpaper` composable 封装本地壁纸操作
- [ ] 为 Composables 添加单元测试
- [ ] 为 Services 添加单元测试
- [ ] 为 Repositories 添加单元测试

---

## Out of Scope

| 功能 | 原因 |
|------|------|
| 新功能开发 | 本次为纯架构迁移 |
| UI/UX 变更 | 保持用户体验一致 |
| 性能优化 | 非本次迁移重点 |
| Store 结构变更 | Store 保持作为数据容器 |
| 新增设置项 | 保持功能不变 |

---

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| SMIG-01 | Phase 10 | ✅ Complete |
| SMIG-02 | Phase 10 | ✅ Complete |
| SMIG-03 | Phase 11 | ✅ Complete |
| CMIG-01 | Phase 11 | ✅ Complete |
| CMIG-02 | Phase 12 | ⏳ Pending |
| CMIG-03 | Phase 12 | ⏳ Pending |
| CLUP-01 | Phase 13 | ⏳ Pending |
| CLUP-02 | Phase 13 | ⏳ Pending |
| CLUP-03 | Phase 13 | ⏳ Pending |
| CLUP-04 | Phase 13 | ⏳ Pending |

**Coverage:**
- v2.2 requirements: 10 total
- Mapped to phases: 10
- Unmapped: 0 ✓

---

*Requirements defined: 2026-04-27*
*Last updated: 2026-04-27 roadmap created*
