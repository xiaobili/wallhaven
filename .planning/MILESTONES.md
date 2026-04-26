# Project Milestones

> Wallhaven 壁纸浏览器架构重构

---

## v2.0 架构重构 — ✅ SHIPPED 2026-04-26

**Phases**: 5 | **Plans**: 35 | **Requirements**: 38/38

**Delivered**: 完成代码架构全面优化，外观行为零感知，内部架构大升级

**Key Accomplishments**:
- 类型安全：消除 60+ 处 `any` 类型，建立完整类型定义体系
- 错误处理：全局错误处理器 + 组件级 ErrorBoundary
- 分层架构：Client → Repository → Service → Composable → View
- IPC 模块化：866 行单文件拆分为 8 个独立 handler
- 代码复用：useAlert 消除 76 行重复代码
- 死代码清理：删除 5 个测试/演示文件

**Known gaps at close**: Phase 2 missing VERIFICATION.md (documentation gap only)

**Archives**: `milestones/v2.0-ROADMAP.md`, `milestones/v2.0-REQUIREMENTS.md`

---

## v2.1 下载断点续传 — ✅ SHIPPED 2026-04-27

**Phases**: 4 (Phases 6-9) | **Requirements**: 9/9

**Delivered**: 为下载功能添加完整的断点续传能力，用户中断后可从暂停点继续下载

**Key Accomplishments**:
- 断点续传核心：暂停后恢复下载时从断点继续，而非重新开始
- 进度持久化：应用重启后自动恢复未完成的下载任务
- Range 请求支持：HTTP Range header 实现增量下载
- 错误处理增强：中文错误消息，孤儿文件清理

**Archives**: `milestones/v2.1-ROADMAP.md`, `milestones/v2.1-REQUIREMENTS.md`

---

## v2.2 Store 分层迁移 — 🔵 IN PROGRESS

**Phases**: 4 (Phases 10-13) | **Requirements**: 10

**Goal**: 将 views 中直接使用的 store 全部迁移到 composables，强化 View → Composable → Store 分层架构

**Target Features**:
- 移除所有 views 中对 store 的直接导入
- 通过现有 composables (useSettings, useDownload, useWallpaperList) 访问 store 状态
- 扩展 useSettings 支持表单响应式绑定
- 添加 ESLint 规则防止未来回归

**Phase Structure**:
| Phase | Name | Requirements | Success Criteria |
|-------|------|--------------|------------------|
| 10 | Simple Substitutions | SMIG-01, SMIG-02 | 4 |
| 11 | OnlineWallpaper Migration | SMIG-03, CMIG-01 | 5 |
| 12 | SettingPage Migration | CMIG-02, CMIG-03 | 5 |
| 13 | Verification & Enforcement | CLUP-01~04 | 4 |

**Started**: 2026-04-27

---

*Last updated: 2026-04-27*
