# Phase 5: 表现层重构与清理 - Context

**Gathered:** 2026-04-26
**Status:** Ready for planning

<domain>
## Phase Boundary

完成组件重构，清理冗余代码，提升代码质量。包括：
- 创建 `ErrorBoundary` 组件，实现组件级错误隔离
- 重构视图组件使用已有 composables（`useAlert`、`useWallpaperList`、`useDownload`、`useSettings`）
- 移除组件中的重复状态代码
- 清理死代码（Test/Demo 组件）
- 配置路由懒加载
- 类型清理和 JSDoc 注释补充

**核心约束**：
- 所有用户操作逻辑保持不变
- 界面布局和 DOM 结构不变
- UI 显示效果和样式不变
- 所有现有功能的输入输出行为不变

**阶段边界**：
- 本阶段仅重构表现层代码，不改变功能行为
- 不改变 Store 结构或 Service 层逻辑
- 组件的 DOM 结构和样式保持不变

</domain>

<decisions>
## Implementation Decisions

### Alert 迁移
- **D-01:** 所有视图组件统一使用 `useAlert` composable
  - 删除组件内联的 `reactive({ visible, type, message, duration })` 状态
  - 导入并使用 `const { alert, showAlert, showSuccess, showError, showWarning, showInfo } = useAlert()`
  - 模板中使用 `<Alert v-if="alert.visible" :type="alert.type" :message="alert.message" :duration="alert.duration" @close="hideAlert" />`
  - 受影响的组件：`OnlineWallpaper.vue`、`LocalWallpaper.vue`、`DownloadWallpaper.vue`、`SettingPage.vue`

### 死代码清理
- **D-02:** 删除所有测试/演示组件
  - 删除文件：`src/views/AlertTest.vue`、`src/views/APITest.vue`、`src/views/Diagnostic.vue`
  - 删除文件：`src/components/ElectronTest.vue`、`src/components/AlertDemo.vue`
  - 这些组件是开发测试用途，不再需要

### 路由优化
- **D-03:** 删除测试路由，只保留生产页面路由
  - 删除路由：`/api-test`、`/diagnostic`、`/alert-test`
  - 保留路由：`/online`、`/switch`、`/download`、`/setting`
  - 路由懒加载已实现（使用动态 `import()`），无需额外配置

### ErrorBoundary 实现
- **D-04:** 创建 `ErrorBoundary` 组件
  - 使用 Vue 3 的 `errorCaptured` 生命周期钩子捕获子组件错误
  - 显示后备 UI（错误提示 + 重试按钮）
  - 使用 `Suspense` 配合处理异步组件错误

- **D-05:** ErrorBoundary 放置位置
  - 在 `App.vue` 的 `<router-view>` 外层包装 ErrorBoundary
  - 捕获所有页面组件错误
  - 全局错误处理器（Phase 1 创建）继续处理未捕获的错误

### 重复代码提取
- **D-06:** 提取重复工具函数到 `src/utils/helpers.ts`
  - `generateFilename(wallpaperItem)` — 生成壁纸文件名
  - `downloadWallpaperFile(wallpaperItem, downloadPath)` — 下载壁纸文件
  - 这些函数在多个视图组件中重复，提取为纯函数

### JSDoc 注释
- **D-07:** 为所有公开函数、类型添加 JSDoc
  - Composables 的所有公开方法
  - utils/helpers.ts 中的工具函数
  - 类型定义文件
  - 便于后续维护和 IDE 提示

### Claude's Discretion
- ErrorBoundary 组件的具体 UI 设计（保持与现有错误提示风格一致）
- JSDoc 注释的具体措辞和格式
- 重复代码提取后的函数签名细节

</decisions>

<specifics>
## Specific Ideas

- ErrorBoundary 应显示友好的错误提示，类似现有 `error-container` 的风格
- 保持与现有 UI 风格一致（深色背景、渐变按钮）
- 清理后的代码应通过 ESLint/TSC 无错误

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 项目规划
- `.planning/PROJECT.md` — 项目核心价值、约束条件、需求范围
- `.planning/REQUIREMENTS.md` — 详细需求列表（UI-01 ~ UI-09）
- `.planning/ROADMAP.md` — 阶段划分和依赖关系
- `.planning/STATE.md` — 当前项目状态

### 前置阶段
- `.planning/phases/01-infrastructure-typesafety/01-CONTEXT.md` — 阶段 1 上下文（错误类、全局错误处理器）
- `.planning/phases/02-data-layer-abstraction/02-CONTEXT.md` — 阶段 2 上下文
- `.planning/phases/03-business-composable-layer/03-CONTEXT.md` — 阶段 3 上下文（Composables 创建）
- `.planning/phases/04-ipc-modular-refactoring/04-CONTEXT.md` — 阶段 4 上下文

### 代码库分析
- `.planning/codebase/ARCHITECTURE.md` — 现有架构、组件层次、路由结构
- `.planning/codebase/CONCERNS.md` — 技术债务清单（死代码、重复代码）

### 关键代码文件

#### 需要重构的视图组件
- `src/views/OnlineWallpaper.vue` — 在线壁纸页面
- `src/views/LocalWallpaper.vue` — 本地壁纸页面
- `src/views/DownloadWallpaper.vue` — 下载中心页面
- `src/views/SettingPage.vue` — 设置页面

#### 需要删除的文件
- `src/views/AlertTest.vue` — Alert 组件测试页面
- `src/views/APITest.vue` — API 测试页面
- `src/views/Diagnostic.vue` — Electron 诊断页面
- `src/components/ElectronTest.vue` — Electron 测试组件
- `src/components/AlertDemo.vue` — Alert 演示组件

#### 需要更新的文件
- `src/router/index.ts` — 删除测试路由
- `src/App.vue` — 添加 ErrorBoundary 包装
- `src/utils/helpers.ts` — 添加提取的工具函数

#### 已有的 Composables（参考）
- `src/composables/core/useAlert.ts` — Alert 状态管理
- `src/composables/wallpaper/useWallpaperList.ts` — 壁纸列表
- `src/composables/download/useDownload.ts` — 下载管理
- `src/composables/settings/useSettings.ts` — 设置管理

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

#### 已创建的 Composables
- `useAlert` — 返回 `{ alert, showAlert, hideAlert, showSuccess, showError, showWarning, showInfo }`
- `useWallpaperList` — 返回 `{ fetch, loadMore, loadSavedParams, reset }`
- `useDownload` — 返回 `{ addTask, startDownload, loadHistory, isDownloading, ... }`
- `useSettings` — 返回 `{ settings, update, load }`

#### 已实现的路由懒加载
- 所有路由已使用动态 `import()` 语法
- 无需额外配置，只需删除测试路由

### Established Patterns

#### 现有组件的 Alert 使用模式
```typescript
// 当前内联状态（需迁移）
const alert = reactive({
  visible: false,
  type: 'info' as 'success' | 'error' | 'warning' | 'info',
  message: '',
  duration: 3000
})

const showAlert = (message, type, duration) => { ... }

// 模板
<Alert v-if="alert.visible" :type="alert.type" :message="alert.message" :duration="alert.duration" @close="alert.visible = false" />
```

#### 现有错误处理 UI
```html
<div v-if="wallpaperStore.error" class="error-container">
  <div class="error-content">
    <i class="fas fa-exclamation-triangle error-icon"></i>
    <h3>网络异常</h3>
    <p>无法连接到 Wallhaven API...</p>
    <button @click="retryFetch" class="retry-button">
      <i class="fas fa-redo"></i> 重试
    </button>
  </div>
</div>
```

### Integration Points

#### 组件与 Composables 的集成
- OnlineWallpaper.vue 已部分使用 composables，但 Alert 状态仍内联
- 其他视图组件需要同样的迁移模式

#### 全局错误处理器（Phase 1）
- `src/main.ts` 中已添加全局错误处理器
- ErrorBoundary 捕获组件级错误，全局处理器捕获未处理的 Promise rejection

### 需要新建的文件
- `src/components/ErrorBoundary.vue` — Vue 3 错误边界组件

</code_context>

<deferred>
## Deferred Ideas

None — 讨论保持在阶段 5 范围内。

### 后续迭代可考虑的工作
- 虚拟滚动优化大列表性能
- 更完善的键盘导航支持
- ARIA 无障碍属性增强

</deferred>

---

*Phase: 05-presentation-layer-refactoring*
*Context gathered: 2026-04-26*
