# Phase 1: 基础设施与类型安全 - Context

**Gathered:** 2025-04-25
**Status:** Ready for planning

<domain>
## Phase Boundary

建立重构基础，不改变现有功能。包括：
- 类型定义目录结构和 IPC 类型
- 错误类层次结构
- useAlert composable 抽取
- 全局错误处理器
- Store 中 any 类型消除

**核心约束**：
- 所有用户操作逻辑保持不变
- 界面布局和 DOM 结构不变
- 功能行为完全一致
- IPC 通道名称和消息格式向后兼容

</domain>

<decisions>
## Implementation Decisions

### 类型组织策略

- **D-01:** 采用按领域分子目录的组织方式
  - 创建 `src/types/domain/` 存放领域类型
  - 创建 `src/types/api/` 存放 API 相关类型
  - 创建 `src/types/ipc/` 存放 IPC 类型
  - 创建 `src/shared/types/ipc.ts` 用于主进程和渲染进程共享的 IPC 类型

- **D-02:** 阶段 1 类型迁移策略：新增类型使用新结构
  - 现有 `src/types/index.ts` 内容保持不变
  - 新增的 IPC 类型放入新目录结构
  - 后续阶段逐步迁移现有类型

### 错误类层次结构

- **D-03:** 采用完整错误类层次
  - 创建基础 `AppError` 类，包含 `code`、`message`、`context` 属性
  - 派生领域错误类：`IpcError`、`StoreError`、`NetworkError` 等
  - 支持错误分类和处理

- **D-04:** IPC 错误响应采用统一包装格式
  - 所有 IPC 响应使用 `{ success: boolean, data?: T, error?: { code, message } }` 格式
  - 统一调用方处理逻辑

### useAlert Composable 设计

- **D-05:** 返回响应式状态 + 函数
  - 返回 `{ alert, showAlert, hideAlert }`
  - `alert` 是响应式对象（visible, type, message, duration）
  - 组件模板中使用 `v-if="alert.visible"` 绑定
  - 与现有代码模式一致，迁移成本低

- **D-06:** 单实例覆盖模式
  - 新消息覆盖旧消息
  - 不支持多 Alert 同时显示
  - 符合当前所有页面的使用模式

### 全局错误处理器

- **D-07:** 全局捕获 + Alert 展示
  - 在 `main.ts` 注册 `app.config.errorHandler`
  - 注册 `window.onunhandledrejection` 处理未捕获的 Promise rejection
  - 捕获错误后显示全局 Alert

- **D-08:** 用户友好消息展示
  - 显示友好错误消息（如"操作失败，请重试"）
  - 技术细节记录到控制台
  - 不暴露实现细节给用户

### Claude's Discretion

- 类型文件的具体命名和导入方式
- 错误类的具体属性和方法签名
- useAlert 的具体实现细节
- 全局错误处理器的触发时机和条件

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 项目规划
- `.planning/PROJECT.md` — 项目核心价值、约束条件、需求范围
- `.planning/REQUIREMENTS.md` — 详细需求列表和可追溯性
- `.planning/ROADMAP.md` — 阶段划分和依赖关系
- `.planning/STATE.md` — 当前项目状态

### 代码库分析
- `.planning/codebase/ARCHITECTURE.md` — 现有架构、数据流、关键模式
- `.planning/codebase/CONCERNS.md` — 技术债务清单、类型安全问题

### 研究报告
- `.planning/research/SUMMARY.md` — 重构策略综合建议
- `.planning/research/STACK.md` — 技术栈最佳实践
- `.planning/research/PITFALLS.md` — 重构陷阱警告

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/types/index.ts` — 现有领域类型定义（WallpaperItem、DownloadItem、AppSettings 等）
- `src/components/Alert.vue` — 现有 Alert 组件，支持 type/message/duration props
- `src/main.ts` — 应用入口，需要添加全局错误处理器

### Established Patterns
- Vue 3 Composition API (reactive, ref, shallowRef)
- Pinia Store 使用 Setup Store 模式
- Alert 状态管理在 4+ 组件中重复：OnlineWallpaper、LocalWallpaper、DownloadWallpaper、SettingPage

### Integration Points
- `src/stores/modules/wallpaper/actions.ts:13` — 存在 `any` 类型需要消除
- `src/main.ts:72` — `initializeApp()` 调用缺少错误处理
- `electron/main/ipc/handlers.ts` — IPC 类型定义需要与渲染进程共享

### 需要关注的文件
- `src/stores/modules/wallpaper/actions.ts` — actions 中的 any 类型
- `electron/preload/index.ts` — IPC 类型定义位置
- `electron/main/ipc/handlers.ts` — 主进程 IPC 处理

</code_context>

<specifics>
## Specific Ideas

- 类型目录结构：
  ```
  src/types/
  ├── index.ts              # 统一导出（保留现有）
  ├── domain/               # 领域类型（新增）
  │   └── index.ts
  ├── api/                  # API 类型（新增）
  │   └── index.ts
  └── ipc/                  # IPC 类型（新增）
      └── index.ts

  src/shared/types/         # 主进程/渲染进程共享
  └── ipc.ts
  ```

- 错误类结构：
  ```
  src/errors/
  ├── index.ts              # 统一导出
  ├── AppError.ts           # 基础错误类
  ├── IpcError.ts           # IPC 错误
  ├── StoreError.ts         # Store 错误
  └── NetworkError.ts       # 网络错误
  ```

- useAlert 使用示例：
  ```typescript
  // composables/useAlert.ts
  export function useAlert() {
    const alert = reactive({
      visible: false,
      type: 'info' as 'success' | 'error' | 'warning' | 'info',
      message: '',
      duration: 3000
    })

    const showAlert = (message: string, type = 'info', duration = 3000) => {
      alert.message = message
      alert.type = type
      alert.duration = duration
      alert.visible = true
    }

    const hideAlert = () => {
      alert.visible = false
    }

    return { alert, showAlert, hideAlert }
  }
  ```

</specifics>

<deferred>
## Deferred Ideas

None — 讨论保持在阶段 1 范围内。

</deferred>

---

*Phase: 01-infrastructure-typesafety*
*Context gathered: 2025-04-25*
