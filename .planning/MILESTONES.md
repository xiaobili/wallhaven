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

## v2.2 Store 分层迁移 — ✅ SHIPPED 2026-04-27

**Phases**: 4 (Phases 10-13) | **Requirements**: 10/10

**Delivered**: 将 views 中直接使用的 store 全部迁移到 composables，强化分层架构

**Key Accomplishments**:
- 移除所有 views 中对 store 的直接导入
- 扩展 useSettings 支持表单响应式绑定
- 添加 ESLint 规则防止未来回归
- 完整验证 View → Composable → Store 分层完整性

---

## v4.0 多线程下载与重试退避机制 — ✅ SHIPPED 2026-05-01

**Phases**: 3 (Phases 33-35) | **Plans**: 9 | **Requirements**: 12/12

**Delivered**: 实现真实的并行下载控制和下载失败自动重试，提升下载可靠性和效率

**Key Accomplishments**:
- 下载队列与并发控制：设置页的"并行下载数"配置真正生效，N 个下载任务并行执行
- 指数退避重试：下载失败后自动重试（全抖动，2s 基数，30s 上限，最多 3 次）
- 错误分类：网络错误/5xx/429 临时重试，404/403 等永久失败
- 重试状态展示：UI 显示重试进度、倒计时、最终失败状态
- 槽位保持：重试中的下载持续占用并发槽位，防止饥饿

**Archives**: `milestones/v4.0-ROADMAP.md`, `milestones/v4.0-REQUIREMENTS.md`

---

## v4.1 壁纸列表全选功能 — ✅ SHIPPED 2026-05-01

**Phases**: 1 (Phase 36) | **Plans**: 1 | **Requirements**: N/A (feature request)

**Delivered**: 在壁纸列表每个分节标题中添加全选/取消全选复选框，一键选择当前页面所有壁纸

**Key Accomplishments**:
- 三态复选框：全选（checked）/部分选中（indeterminate）/未选（none）
- 中文标签："全选"/"取消全选" 根据状态动态切换
- 事件驱动：新 `select-all` emit 携带 sectionIndex + ids + selected 负载
- 批量处理：父组件 handleSelectAll 批量添加/移除 selectedWallpapers

**Archives**: `milestones/v4.1-ROADMAP.md`

---

*Last updated: 2026-05-01 — v4.0 and v4.1 shipped*
