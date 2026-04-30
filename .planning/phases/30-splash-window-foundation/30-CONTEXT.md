# Phase 30: Splash Window Foundation - Context

**Gathered:** 2026-04-30
**Status:** Ready for planning

<domain>
## Phase Boundary

在 Electron 主进程中创建首屏窗口基础设施。

**核心交付物：**
1. 在应用启动时显示独立的 splash 窗口
2. splash 窗口为无框设计（无标题栏，无窗口控制按钮）
3. splash 窗口显示时在屏幕居中
4. splash 窗口使用与应用相同的深色主题

**阶段边界：**
- 修改仅限于 `electron/main/index.ts`
- 可能需要创建 splash HTML 文件
- 不改变主窗口创建逻辑（仅调整显示时序）
- 不改变现有 IPC 处理程序
- 不改变应用功能行为

**当前状态：**
- `electron/main/index.ts` 直接创建 mainWindow 并在 `ready-to-show` 时显示
- 尚无 splash 窗口概念
- 主窗口背景色为深色

**依赖关系：**
- 无前置阶段 - 本阶段为 v3.0 首屏动画里程碑的第一阶段
- Phase 31 (Bounce Logo Animation) 将依赖本阶段创建的 splash 窗口

</domain>

<decisions>
## Implementation Decisions

### Splash 窗口代码位置 (D-01)

- **D-01:** 将 splash 窗口创建逻辑内联在 `electron/main/index.ts` 中
  - 理由：代码量较小，内联更简单，与现有 createWindow() 函数保持一致风格
  - 如果后续复杂度增加，可以再提取到独立文件

[auto] 代码位置 — Q: "Splash 窗口代码放在哪里?" → Selected: "内联在 electron/main/index.ts (推荐)"

### Splash HTML 加载策略 (D-02)

- **D-02:** 加载本地 HTML 文件模式
  - 创建独立的 `electron/renderer/splash.html` 文件
  - 开发模式和生产模式都加载本地文件（不使用远程 URL）
  - 理由：splash 窗口不使用 Vue，纯静态 HTML + CSS，加载速度更快

[auto] HTML 加载 — Q: "如何加载 splash 内容?" → Selected: "加载本地 HTML 文件 (推荐)"

### Splash 窗口尺寸 (D-03)

- **D-03:** 窗口尺寸为 400x300 像素
  - 理由：标准 splash 窗口尺寸，足够显示 "Wallhaven" Logo，不过大也不过小
  - 宽度 400px，高度 300px

[auto] 窗口尺寸 — Q: "Splash 窗口尺寸?" → Selected: "400x300 (推荐)"

### 窗口创建时序策略 (D-04)

- **D-04:** 先创建 splash，再创建 main window
  - 在 `app.whenReady()` 回调中，先创建并显示 splash 窗口
  - splash 窗口创建后立即创建 main window
  - main window 保持 `show: false`，等待后续阶段的时序逻辑
  - 理由：确保 splash 是用户看到的第一个窗口，消除启动闪烁

[auto] 创建时序 — Q: "何时创建 splash 和 main?" → Selected: "先创建 splash，再创建 main (推荐)"

### 主题匹配策略 (D-05)

- **D-05:** 硬编码 #1a1a1a 背景色
  - 与应用整体深色主题保持一致
  - 理由：简单直接，splash 窗口不需要动态主题切换
  - 匹配主窗口的深色背景

[auto] 主题匹配 — Q: "深色主题如何匹配?" → Selected: "硬编码 #1a1a1a 背景 (推荐)"

### Claude's Discretion

- splash 窗口是否需要 `alwaysOnTop: true`（可选，默认不需要）
- splash 窗口是否需要 `resizable: false`（推荐禁用调整大小）
- splash HTML 文件位置（可放在 `electron/renderer/splash.html` 或 `electron/main/splash.html`）
- 可选择是否为 splash 添加 `transparent: true`（本阶段不需要，背景为实色）

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 项目规划
- `.planning/PROJECT.md` — 项目核心价值、约束条件（功能行为不变）
- `.planning/ROADMAP.md` — Phase 30 定义，需求 SPLASH-01 ~ SPLASH-04
- `.planning/REQUIREMENTS.md` — 首屏动画需求详情

### 关键代码文件

#### 需要修改的文件
- `electron/main/index.ts` — 添加 splash 窗口创建逻辑

#### 需要创建的文件
- `electron/renderer/splash.html` — splash 窗口 HTML 内容

#### 参考实现
- `electron/main/index.ts` 中的 `createWindow()` 函数 — 现有窗口创建模式

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

#### 现有窗口创建模式（electron/main/index.ts）
```typescript
function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1900,
    height: 800,
    show: false,
    frame: false, // 无框窗口参考
    autoHideMenuBar: true,
    webPreferences: {
      preload: preloadPath,
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })
}
```

### Established Patterns

- **无框窗口模式**: `frame: false` - 已在主窗口使用，可直接复用
- **延迟显示**: `show: false` + `ready-to-show` 事件 - 防止白屏闪烁
- **本地文件加载**: `mainWindow.loadFile()` - 生产模式加载本地 HTML
- **开发模式 URL**: `loadURL(process.env.ELECTRON_RENDERER_URL)` - HMR 支持

### Integration Points

- `app.whenReady()` - 在这个回调中添加 splash 窗口创建
- 在 `createWindow()` 调用之前创建 splash
- splash 窗口的生命周期由后续 Phase 32 管理

</code_context>

<specifics>
## Specific Ideas

- splash 窗口不需要 preload 脚本（无交互功能）
- splash 窗口不需要开发者工具（纯显示）
- HTML 中直接内联 CSS 确保最快加载（不引用外部文件）
- 窗口居中由 Electron `center: true` 选项自动处理

</specifics>

<deferred>
## Deferred Ideas

None — 讨论严格在 Phase 30 范围内进行。

### 后续阶段
- Phase 31: Bounce Logo Animation - 在 splash 窗口中添加动画效果
- Phase 32: Coordination & Transition - 时序逻辑和平滑过渡

</deferred>

---

*Phase: 30-splash-window-foundation*
*Context gathered: 2026-04-30*
