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

## v2.1 下载断点续传 — 🔄 IN PROGRESS

**Phases**: 4 (Phases 6-9) | **Requirements**: 9

**Goal**: 为下载功能添加完整的断点续传能力，用户中断后可从暂停点继续下载

**Target Features**:
- 断点续传核心：暂停后恢复下载时从断点继续，而非重新开始
- 进度持久化：应用重启后自动恢复未完成的下载任务
- 暂停功能改进：改进现有暂停功能以支持断点续传

**Phase Structure**:
| Phase | Name | Requirements | Plans |
|-------|------|--------------|-------|
| 6 | Core Resume Infrastructure | INFR-01 | 5 |
| 7 | Main Process Implementation | INFR-02, INFR-03, CORE-02 | 6 |
| 8 | Renderer Integration | CORE-01, CORE-03 | 5 |
| 9 | Error Handling & Edge Cases | ERRH-01, ERRH-02, ERRH-03 | 5 |

**Started**: 2026-04-26

---

*Last updated: 2026-04-26*
