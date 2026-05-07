# v2.8.1 — 本地壁纸列表分页

## 需求分类

### 分页功能（PAG）

| ID | 需求描述 | 优先级 | 依赖 |
|----|----------|--------|------|
| PAG-01 | 后端 file.handler.ts `read-directory` handler 接受 `page`/`pageSize` 参数，返回分页结果（`items: LocalFile[]` 和 `total: number`） | P0 | — |
| PAG-02 | 数据流链路逐层传递分页参数：`settingsService` → `settingsRepository` → `fileClient` → preload → IPC，确保分页参数完整传递 | P0 | PAG-01 |
| PAG-03 | `LocalWallpaper.vue` 集成 `PaginationBar` 组件，实现页码导航：显示当前页、总页数、总数、支持页码跳转 | P0 | PAG-02 |
| PAG-04 | 页面缓存机制：切换页面时缓存当前页的 `LocalWallpaper[]` 数据，返回已加载页时直接使用缓存，减少重复文件系统读取 | P1 | PAG-03 |

### 优先级定义

- **P0**: 核心功能，必须完成
- **P1**: 重要增强，建议完成
- **P2**: 锦上添花，视情况而定

---

## 未来需求（已推迟）

- SEC-01: API Key 加密存储
- SEC-02: 自定义协议路径验证
- SEC-03: 日志系统分级
- TEST-01: 服务层单元测试
- TEST-02: IPC handler 集成测试
- TEST-03: E2E 下载流程测试

## 明确排除

- UI 布局变更 — 仅添加分页控件，不改变现有网格/卡片布局
- 行为变更 — 现有本地壁纸浏览行为保持不变
- 安全加固 — 延后到后续版本
- 测试体系建设 — 延后到后续版本

---

## Traceability

<!-- 由 roadmap 创建时填写，映射需求到阶段 -->

| 需求 ID | Phase | 状态 |
|---------|-------|------|
| PAG-01 | Phase 7: 后端分页支持 | Complete |
| PAG-02 | Phase 8: 数据流链路分页参数传递 | Complete |
| PAG-03 | Phase 9: 前端分页 UI 集成 | Planning |
| PAG-04 | Phase 9: 前端分页 UI 集成 | Planning |
