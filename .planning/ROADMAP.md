# Roadmap: Wallhaven 壁纸浏览器

**当前里程碑:** v2.8.1 本地壁纸列表分页
**最后更新:** 2026-05-07

---

## Milestones

- ✅ **v2.8.0 性能与架构优化** — Phases 1-6 (shipped 2026-05-06)
- ✅ **v2.8.1 本地壁纸列表分页** — Phases 7-9 (已完成 2026-05-07)

---

## Phases

<details>
<summary>✅ v2.8.0 性能与架构优化 (Phases 1-6) — SHIPPED 2026-05-06</summary>

- [x] Phase 1: 性能优化（下载与缓存）— 完成 2026-05-06
- [x] Phase 2: 性能优化（查询与解析）— 完成 2026-05-06
- [x] Phase 3: 代码质量（错误处理与类型）— 完成 2026-05-06
- [x] Phase 4: 代码质量（取消机制与配置）— 完成 2026-05-06
- [x] Phase 5: 架构优化（服务层与状态管理）— 完成 2026-05-06
- [x] Phase 6: 架构优化（IPC 命名规范）— 完成 2026-05-06

</details>

### 🚧 v2.8.1 本地壁纸列表分页 (Phases 7-9)

- ✅ Phase 7: 后端分页支持 — PAG-01 (1 plan) 2026-05-07
- [x] Phase 8: 数据流链路分页参数传递 — PAG-02 (1 plan) 2026-05-07
- [x] Phase 9: 前端分页 UI 集成 — PAG-03, PAG-04 (1 plan) 2026-05-07

---

## Phase Details

### Phase 7: 后端分页支持 ✅

**需求:** PAG-01 — 已完成 2026-05-07

**目标:** file.handler.ts `read-directory` handler 接受 `page`/`pageSize` 参数，返回分页结果及文件总数

**成功标准:**
1. ✅ IPC 类型定义新增 `ReadDirectoryParams`（page, pageSize）和 `ReadDirectoryResponse` 扩展（total, page, pageSize）
2. ✅ file.handler.ts `read-directory` handler 解析 `page`/`pageSize` 并使用 `Array.slice` 实现偏移/限制
3. ✅ 读取目录后先过滤图片文件，计算总数 total，再根据 page/pageSize 截取子集
4. ✅ 同时返回 `error`, `files` (当前页) 和新增的 `total`, `page`, `pageSize` 字段
5. ✅ 兼容性: 未传分页参数时默认 page=1, pageSize=50，不破坏现有调用
6. ✅ 构建验证通过

**Plans:** 1 plan — 全部完成

Plans:
- [x] 07-01-PLAN.md — 类型定义 + handler 分页逻辑 + preload 桥接 ✅

### Phase 8: 数据流链路分页参数传递 ✅

**需求:** PAG-02 — 已完成 2026-05-07

**目标:** 从 composable 到 preload 的完整数据链路支持分页参数传递

**成功标准:**
1. ✅ `settingsService.readDirectory` 签名增加 `page`/`pageSize` 可选参数
2. ✅ `settingsRepository.readDirectory` 签名增加 `page`/`pageSize` 可选参数
3. ✅ `fileClient.readDirectory` 签名增加 `page`/`pageSize` 可选参数，传递到 `window.electronAPI.readDirectory`
4. ✅ preload `readDirectory` 桥接转发分页参数到 `ipcRenderer.invoke('read-directory', dirPath, page, pageSize)`（Phase 7 完成）
5. ✅ `useLocalFiles` composable 管理当前页码、总页数、每页数量等分页状态
6. ✅ 类型检查 (`tsc --noEmit`) 通过
7. ✅ 构建 (`electron-vite build`) 通过

**Plans:** 1 plan — 全部完成

Plans:
- [x] 08-01-PLAN.md — 数据链路各层添加分页参数 + composable 分页状态管理

### Phase 9: 前端分页 UI 集成 ✅

**需求:** PAG-03, PAG-04 — 已完成 2026-05-07

**目标:** LocalWallpaper.vue 集成 PaginationBar 组件，实现页码导航和页面缓存

**成功标准:**
1. ✅ `LocalWallpaper.vue` 在壁纸网格下方渲染 `PaginationBar` 组件，传入 `currentPage`, `totalPages`, `totalCount`, `loading`
2. ✅ 页码切换时调用 composable 的 `goToPage(page)` 方法，触发数据重新加载
3. ✅ 页面缓存: 切换页面时缓存当前页的 `LocalWallpaper[]`，返回已缓存页面时直接从缓存读取
4. ✅ 刷新按钮清除所有缓存并重置到第 1 页
5. ✅ 分页控件在大数据量下正常显示（测试 500+ 文件）

**Plans:** 1 plan — 全部完成

Plans:
- [x] 09-01-PLAN.md — 集成 PaginationBar + 页面缓存 (goToPage, clearCache) ✅

---

## Progress

| Phase | Milestone | Status | Completed |
|-------|-----------|--------|-----------|
| 1. 性能优化（下载与缓存）| v2.8.0 | Complete | 2026-05-06 |
| 2. 性能优化（查询与解析）| v2.8.0 | Complete | 2026-05-06 |
| 3. 代码质量（错误处理与类型）| v2.8.0 | Complete | 2026-05-06 |
| 4. 代码质量（取消机制与配置）| v2.8.0 | Complete | 2026-05-06 |
| 5. 架构优化（服务层与状态管理）| v2.8.0 | Complete | 2026-05-06 |
| 6. 架构优化（IPC 命名规范）| v2.8.0 | Complete | 2026-05-06 |
| 7. 后端分页支持 | v2.8.1 | Complete | 2026-05-07 |
| 8. 数据流链路分页参数传递 | v2.8.1 | Complete | 2026-05-07 |
| 9. 前端分页 UI 集成 | v2.8.1 | Complete | 2026-05-07 |

---

*路线图最后更新: 2026-05-07*
