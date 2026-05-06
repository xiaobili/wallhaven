# Phase 4: 代码质量（取消机制与配置）- Context

**Gathered:** 2026-05-06
**Status:** Ready for planning

<domain>
## Phase Boundary

本阶段为异步操作添加取消机制（AbortController 支持），并将分散的配置值集中管理。这是代码质量提升阶段，不涉及功能变更或 UI 变化。

**覆盖需求：**
- QUAL-03: 异步操作取消机制
- QUAL-04: 配置值集中管理

</domain>

<decisions>
## Implementation Decisions

### 取消范围
- **D-01:** 对壁纸搜索和下载任务都添加 AbortController 取消支持
- **D-02:** 下载任务的 AbortController 仅用于取消新下载请求的发起；已开始的下载继续使用现有的暂停/恢复机制管理
- **D-03:** 在 `wallpaperService.search` 方法中添加 `AbortSignal` 参数支持

### 配置存储方式
- **D-04:** 创建 `src/config/constants.ts` 文件，配置值为 TypeScript 常量
- **D-05:** 配置值按功能域分组：下载配置、缓存配置、数据库配置等
- **D-06:** 迁移现有硬编码值（BACKOFF_BASE_MS、CACHE_TTL 等）到集中配置

### 清理策略
- **D-07:** 在 composable 的 `onUnmounted` 生命周期钩子中调用取消方法
- **D-08:** 请求被取消时，保持当前 Store 状态不变，避免 UI 闪烁

### Claude's Discretion
- 具体的配置值分组结构由实现者决定
- AbortController 的 API 设计细节（方法名、参数）由实现者决定

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 架构参考
- `.planning/codebase/ARCHITECTURE.md` — 现有分层架构和各层职责
- `.planning/codebase/CONCERNS.md` — 技术债务清单（MEDIUM-05: 异步操作缺少取消机制，LOW-03: 硬编码魔法值）

### 前序阶段
- `.planning/phases/03-code-quality-error-types/03-CONTEXT.md` — 错误处理统一方案
- `.planning/phases/03-code-quality-error-types/SUMMARY.md` — Phase 3 实现结果

### 需求定义
- `.planning/REQUIREMENTS.md` — QUAL-03 和 QUAL-04 需求详情

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`IPC_ERROR_CODES`** (Phase 3 创建): 可复用的错误码常量模式
- **`createErrorResponse`** (Phase 3 创建): 标准化错误响应辅助函数
- **`onUnmounted`**: Vue 生命周期钩子，已在多个 composables 中使用

### Established Patterns
- **分层架构**: Views → Composables → Services → Repositories → Clients
- **状态管理**: Pinia Store 管理应用状态
- **错误处理**: 所有异步操作返回 `IpcResponse<T>` 格式

### Integration Points
- `wallpaperService.search` — 需要添加 AbortSignal 参数
- `useWallpaperList` composable — 需要在 onUnmounted 中取消请求
- `download.handler.ts` — 需要从集中配置读取 BACKOFF_*, MAX_RETRIES 等值
- `wallpaper.service.ts` — 需要从集中配置读取 CACHE_TTL 等值

### 现有硬编码值位置
| 文件 | 变量名 | 当前值 | 用途 |
|------|--------|--------|------|
| `download.handler.ts:65-67` | BACKOFF_BASE_MS | 2000 | 重试基础延迟 |
| `download.handler.ts:65-67` | BACKOFF_MAX_MS | 30000 | 重试最大延迟 |
| `download.handler.ts:65-67` | MAX_RETRIES | 3 | 最大重试次数 |
| `wallpaper.service.ts:35` | ttl | 5*60*1000 | 缓存 TTL |

</code_context>

<specifics>
## Specific Ideas

- 取消机制应该"静默"工作，不向用户显示错误消息
- 配置集中后应便于后续调整，但当前不需要用户可配置界面

</specifics>

<deferred>
## Deferred Ideas

None — 讨论保持在阶段范围内

</deferred>

---

*Phase: 04-code-quality-cancel-config*
*Context gathered: 2026-05-06*
