# Roadmap: Wallhaven 性能与架构优化

**里程碑:** v2.8.0 - 性能与架构优化
**创建日期:** 2026-05-06
**预计工期:** 6 个阶段

---

## Overview

本路线图将系统性地优化 Wallhaven 壁纸浏览器的性能、代码质量和架构，在严格保持功能兼容性的前提下提升代码质量和维护性。

### 阶段划分

| 阶段 | 名称 | 预计任务数 | 核心目标 |
|------|------|-----------|----------|
| Phase 1 | 性能优化（下载与缓存） | 3 | 优化 IPC 频率和缓存策略 |
| Phase 2 | 性能优化（查询与解析） | 3 | 优化收藏查询和图片解析 |
| Phase 3 | 代码质量（错误处理与类型） | 3 | 统一错误格式和类型定义 |
| Phase 4 | 代码质量（取消机制与配置） | 3 | 实现取消机制和配置集中化 |
| Phase 5 | 架构优化（服务层与状态管理） | 4 | 明确职责边界和统一状态管理 |
| Phase 6 | 架构优化（IPC 命名规范） | 2 | 统一 IPC 通道命名 |

---

## Phase 1: 性能优化（下载与缓存）

**目标:** 优化下载进度 IPC 更新频率和壁纸搜索缓存策略

**状态:** ✅ 完成 (2026-05-06)

### Tasks

- [x] **Task 1.1**: 降低下载进度 IPC 更新频率
  - 修改 `download.handler.ts` 中的进度更新间隔（100ms → 300ms）
  - 添加节流逻辑
  - 验证下载 UI 仍保持流畅

- [x] **Task 1.2**: 改进壁纸搜索缓存策略
  - 安装 `lru-cache` 依赖
  - 重构 `wallpaper.service.ts` 缓存实现
  - 添加缓存命中率统计（可选）
  - 测试缓存行为正确性

- [x] **Task 1.3**: 验证性能优化效果
  - TypeScript 类型检查通过
  - 构建成功
  - GitNexus 变更检测确认修改范围

### Verification

- [x] 下载进度更新流畅，无卡顿
- [x] 缓存命中率可监控
- [x] 所有现有功能正常工作
- [x] 无性能退化

### Requirements Coverage

- PERF-01: 下载进度 IPC 更新频率优化 ✅
- PERF-02: 壁纸搜索缓存策略改进 ✅

---

## Phase 2: 性能优化（查询与解析）

**目标:** 优化收藏状态批量查询和图片尺寸解析

**状态:** ✅ 完成 (2026-05-06)

**详细计划:** `.planning/phases/02-performance-query-parse/02-PLAN.md`

### Tasks

- [x] **Task 2.1**: 实现前端收藏状态缓存
  - 在 `useFavorites` composable 中添加本地状态缓存
  - 实现增量更新策略
  - 减少对 `favoritesRepository.getFavoriteStatusMap` 的调用

- [x] **Task 2.2**: 使用 sharp 库解析图片尺寸
  - 修改 `base.ts` 中的 `getImageDimensions` 函数
  - 使用 sharp 库替代手动解析
  - 测试 WebP 格式解析

- [x] **Task 2.3**: 验证查询和解析优化
  - 测试收藏状态显示正确性
  - 测试本地壁纸列表（含 WebP）
  - 确认性能提升

### Verification

- [x] 收藏状态显示正确，延迟降低
- [x] WebP 图片尺寸正确显示
- [x] 本地壁纸浏览性能提升
- [x] 无功能退化

### Requirements Coverage

- PERF-03: 收藏状态批量查询优化 ✅
- PERF-04: 图片尺寸解析可靠性提升 ✅

---

## Phase 3: 代码质量（错误处理与类型）

**目标:** 统一错误处理格式和消除类型定义重复

**状态:** ✅ 完成 (2026-05-06)

**详细计划:** `.planning/phases/03-code-quality-error-types/03-PLAN.md`

### Tasks

- [x] **Task 3.1**: 统一错误处理格式
  - 创建错误码常量 `IPC_ERROR_CODES`
  - 创建 `createErrorResponse` 辅助函数
  - 更新 `download.handler.ts`, `wallpaper.handler.ts`, `store.handler.ts`, `file.handler.ts`, `cache.handler.ts`, `api.handler.ts`
  - 统一使用 `IpcErrorInfo` 类型

- [x] **Task 3.2**: 消除类型定义重复
  - 删除 `src/services/download.service.ts` 中的 `DownloadProgressData` 定义
  - 删除 `src/repositories/settings.repository.ts` 中的 `CacheInfo` 定义
  - 统一从 `@/types/ipc` 导入

- [x] **Task 3.3**: 验证错误处理和类型系统
  - TypeScript 类型检查通过
  - 构建成功
  - GitNexus 变更检测确认修改范围

### Verification

- [x] 所有错误返回格式一致
- [x] 无类型定义重复
- [x] TypeScript 编译无错误
- [x] 错误信息对用户友好

### Requirements Coverage

- QUAL-01: 统一错误处理格式 ✅
- QUAL-02: 消除类型定义重复 ✅

---

## Phase 4: 代码质量（取消机制与配置）

**目标:** 实现异步操作取消机制和配置值集中管理

### Tasks

- [ ] **Task 4.1**: 为异步操作添加取消机制
  - 在 `wallpaper.service.ts` 的 `search` 方法中支持 AbortController
  - 在 `useWallpaperList` composable 中集成取消逻辑
  - 在 `onUnmounted` 钩子中取消进行中的请求
  - 测试组件卸载时的资源清理

- [ ] **Task 4.2**: 集中管理配置值
  - 创建 `src/config/constants.ts` 集中定义配置
  - 迁移硬编码值（下载重试、缓存 TTL 等）
  - 更新引用点
  - 考虑用户可配置选项（可选）

- [ ] **Task 4.3**: 验证取消机制和配置管理
  - 测试快速切换页面时的请求取消
  - 验证配置值正确应用
  - 确认无内存泄漏

### Verification

- [ ] 组件卸载时请求被正确取消
- [ ] 无内存泄漏
- [ ] 配置值集中管理
- [ ] 代码可维护性提升

### Requirements Coverage

- QUAL-03: 异步操作取消机制
- QUAL-04: 配置值集中管理

---

## Phase 5: 架构优化（服务层与状态管理）

**目标:** 明确服务层职责边界和统一状态管理策略

### Tasks

- [ ] **Task 5.1**: 定义服务层职责规范
  - 编写 Service 层职责文档
  - 定义 Repository 层职责文档
  - 审查现有实现，标记不符合规范的代码

- [ ] **Task 5.2**: 重构服务层实现
  - 统一 Service 层缓存策略
  - 移除 Service 层直接调用 Client 的代码（应通过 Repository）
  - 添加缺失的业务逻辑

- [ ] **Task 5.3**: 统一状态管理到 Pinia Store
  - 将 `favoritesService.cachedFavorites` 迁移到 Store
  - 将 `wallpaperService.cache` 迁移到 Store
  - 更新所有引用点
  - 删除 Service 层的缓存实现

- [ ] **Task 5.4**: 验证架构优化
  - 测试收藏功能完整性
  - 测试壁纸搜索功能
  - 确认状态同步正确
  - 验证性能未退化

### Verification

- [ ] Service 和 Repository 职责清晰
- [ ] 所有状态在 Store 中统一管理
- [ ] 无状态同步问题
- [ ] 代码可维护性显著提升

### Requirements Coverage

- ARCH-01: 服务层职责边界明确化
- ARCH-02: 状态管理统一化

---

## Phase 6: 架构优化（IPC 命名规范）

**目标:** 统一 IPC 通道命名风格

### Tasks

- [ ] **Task 6.1**: 统一 IPC 通道命名
  - 审查所有 IPC 通道定义
  - 统一转换为 kebab-case
  - 更新 `src/types/ipc.ts` 定义
  - 更新 `electron/preload/index.ts` API
  - 更新 `electron/main/ipc/handlers/` 中的所有 handlers

- [ ] **Task 6.2**: 验证 IPC 通道变更
  - 运行完整功能测试
  - 测试所有 IPC 调用
  - 确认无遗漏的更新点

### Verification

- [ ] 所有 IPC 通道命名一致
- [ ] 所有功能正常工作
- [ ] 代码风格统一

### Requirements Coverage

- ARCH-03: IPC 通道命名规范化

---

## Milestone Completion Criteria

完成以下所有条件后，里程碑结束：

### 功能验证

- [ ] 所有现有功能正常工作
- [ ] UI 和交互逻辑无变化
- [ ] 用户行为无感知变化

### 性能验证

- [ ] IPC 更新频率优化到 200-500ms
- [ ] 缓存命中率可监控（> 80%）
- [ ] 收藏状态查询延迟降低
- [ ] WebP 图片尺寸正确显示

### 代码质量验证

- [ ] 错误处理格式统一
- [ ] 无类型定义重复
- [ ] 异步操作可取消
- [ ] 配置值集中管理

### 架构验证

- [ ] Service 和 Repository 职责清晰
- [ ] 状态管理统一
- [ ] IPC 命名一致

### 文档更新

- [ ] 更新 `ARCHITECTURE.md`（如有架构变更）
- [ ] 更新 `CONCERNS.md`（标记已解决的问题）
- [ ] 更新 `PROJECT.md`（移动 Active → Validated）

---

## Risk Mitigation

### 高风险修改区域

**下载队列系统** (Phase 1)
- 修改前进度：完整测试下载流程
- 修改后验证：暂停/恢复/取消场景测试
- 回滚策略：保留原始代码备份

**收藏功能** (Phase 5)
- 修改前进度：备份数据库
- 修改后验证：创建/删除/查询收藏
- 回滚策略：渐进式迁移，保持兼容

**状态管理迁移** (Phase 5)
- 修改前进度：记录现有状态流
- 修改后验证：所有使用状态的组件
- 回滚策略：保留 Service 缓存代码（注释形式）

---

## Next Steps

1. 运行 `/gsd-plan-phase 1` 开始第一阶段规划
2. 完成每个阶段后运行 `/gsd-code-review` 审查代码质量
3. 所有阶段完成后运行 `/gsd-verify-work` 验证目标达成
4. 最后运行 `/gsd-complete-milestone` 归档里程碑

---

*路线图创建日期: 2026-05-06*
*预计总工期: 6 个阶段*
