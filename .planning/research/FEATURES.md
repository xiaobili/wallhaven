# 功能架构改进分类

本文档基于代码库分析，对重构改进项进行优先级分类和依赖关系梳理。

---

## 分类标准

| 分类 | 定义 | 特征 |
|------|------|------|
| **基础必备** | 不做会影响代码质量和可维护性 | 阻塞后续改进、存在明显缺陷、违反设计原则 |
| **推荐改进** | 显著提升可维护性和开发效率 | 有明确收益、中等复杂度、独立可行 |
| **可选优化** | 锦上添花，边际收益递减 | 复杂度较高、收益有限、依赖其他改进 |
| **反模式** | 应该避免的做法 | 违背项目约束、引入新问题、过度工程化 |

---

## 一、IPC 模块化

### 1.1 基础必备

| 改进项 | 复杂度 | 说明 | 依赖 |
|--------|--------|------|------|
| **handlers.ts 按领域拆分** | 中 | 单文件 866 行，维护困难。拆分为独立模块 | 无 |

**推荐拆分方案：**

```
electron/main/ipc/
├── index.ts           # 统一注册入口
├── handlers/
│   ├── file.ts        # 文件操作：read-directory, delete-file, open-folder
│   ├── download.ts    # 下载相关：download-wallpaper, start-download-task
│   ├── settings.ts    # 设置管理：save-settings, load-settings, store-*
│   ├── wallpaper.ts   # 壁纸操作：set-wallpaper
│   ├── cache.ts       # 缓存管理：clear-app-cache, get-cache-info
│   ├── window.ts      # 窗口控制：minimize, maximize, close
│   └── api-proxy.ts   # API代理：wallhavenApiRequest
```

**理由：**
- 单文件过大违反单一职责原则
- 领域边界清晰，便于独立测试
- 降低代码审查和合并冲突成本

### 1.2 推荐改进

| 改进项 | 复杂度 | 说明 | 依赖 |
|--------|--------|------|------|
| **IPC 消息类型定义** | 低 | 为所有 IPC 消息添加 TypeScript 接口 | handlers 拆分 |
| **Preload 类型同步** | 低 | 确保主进程和渲染进程类型一致 | IPC 类型定义 |
| **错误响应标准化** | 低 | 统一错误返回格式 `{ success, error, code }` | handlers 拆分 |

### 1.3 可选优化

| 改进项 | 复杂度 | 说明 | 依赖 |
|--------|--------|------|------|
| **IPC 通道验证白名单** | 中 | 为 invoke 添加类似 send/receive 的白名单验证 | 无 |
| **请求超时配置化** | 低 | 允许不同 IPC 调用配置不同超时 | 无 |

### 1.4 反模式

| 做法 | 原因 |
|------|------|
| 创建 IPC 路由框架 | 过度工程化，当前规模不需要 |
| 改变现有通道名称 | 违反 API 兼容约束 |
| 引入 IPC 中间件链 | 增加理解成本，收益不明显 |

---

## 二、Composables 最佳实践

### 2.1 基础必备

| 改进项 | 复杂度 | 说明 | 依赖 |
|--------|--------|------|------|
| **创建 useAlert composable** | 低 | Alert 逻辑在 4+ 组件中重复实现 | 无 |

**当前重复情况：**
- `OnlineWallpaper.vue` (行 100-115)
- `DownloadWallpaper.vue` (行 109-124)
- `LocalWallpaper.vue` (行 132-147)
- `SettingPage.vue` (行 153-158)
- `Diagnostic.vue` (行 53-68)

**推荐实现：**

```typescript
// src/composables/useAlert.ts
import { reactive } from 'vue'

export type AlertType = 'success' | 'error' | 'warning' | 'info'

interface AlertState {
  visible: boolean
  type: AlertType
  message: string
  duration: number
}

export function useAlert(defaultDuration = 3000) {
  const alert = reactive<AlertState>({
    visible: false,
    type: 'info',
    message: '',
    duration: defaultDuration
  })

  const showAlert = (
    message: string,
    type: AlertType = 'info',
    duration: number = defaultDuration
  ) => {
    alert.message = message
    alert.type = type
    alert.duration = duration
    alert.visible = true
  }

  const hideAlert = () => {
    alert.visible = false
  }

  return {
    alert,
    showAlert,
    hideAlert
  }
}
```

### 2.2 推荐改进

| 改进项 | 复杂度 | 说明 | 依赖 |
|--------|--------|------|------|
| **创建 useInfiniteScroll** | 低 | 提取滚动加载逻辑，当前仅在 OnlineWallpaper 中使用但可复用 | 无 |
| **创建 useImagePreview** | 低 | 图片预览状态管理可提取为独立 composable | 无 |

### 2.3 可选优化

| 改进项 | 复杂度 | 说明 | 依赖 |
|--------|--------|------|------|
| **创建 useElectron** | 中 | 封装 Electron API 可用性检测和环境判断 | 无 |
| **创建 useKeyboard** | 中 | 键盘快捷键管理（如需要添加） | 无 |

### 2.4 反模式

| 做法 | 原因 |
|------|------|
| 全局状态 composable | Alert 等组件级状态不应全局化 |
| 过度抽象的 composable | 如 `useAsync` 泛化处理，增加理解成本 |
| Composable 调用 Store | 破坏单向数据流，应由组件调用 |

---

## 三、服务层抽象

### 3.1 基础必备

| 改进项 | 复杂度 | 说明 | 依赖 |
|--------|--------|------|------|
| **创建 ElectronService** | 中 | 统一封装 Electron API 调用，提供类型安全接口 | 无 |

**当前问题：**
- `window.electronAPI` 散落在各组件和 store 中
- 环境检测逻辑重复（`isProduction` 函数在多处定义）
- 无法在没有 Electron 环境时进行单元测试

**推荐结构：**

```typescript
// src/services/electronService.ts
import type { ElectronAPI } from '@/types/electron'

class ElectronService {
  private api: ElectronAPI | null = null

  constructor() {
    this.api = (window as any).electronAPI ?? null
  }

  get isAvailable(): boolean {
    return this.api !== null
  }

  // 文件操作
  async selectFolder(): Promise<string | null> {
    if (!this.api) throw new Error('Electron API not available')
    return this.api.selectFolder()
  }

  // ... 其他方法
}

export const electronService = new ElectronService()
```

### 3.2 推荐改进

| 改进项 | 复杂度 | 说明 | 依赖 |
|--------|--------|------|------|
| **分离 API 缓存策略** | 低 | wallpaperApi.ts 中缓存逻辑可独立为 CacheService | 无 |
| **创建 Repository 接口** | 低 | 定义数据访问抽象层接口 | ElectronService |

### 3.3 可选优化

| 改进项 | 复杂度 | 说明 | 依赖 |
|--------|--------|------|------|
| **Mock 服务实现** | 中 | 为测试提供 Electron API mock | ElectronService |
| **服务依赖注入** | 高 | 使用 provide/inject 或 DI 容器 | 无需 |

### 3.4 反模式

| 做法 | 原因 |
|------|------|
| Store 继承 Service | 应为组合关系，继承会导致紧耦合 |
| Service 直接操作 DOM | 违反职责分离 |
| 全局单例 Service（非必要） | 增加测试难度，应优先使用 composable |

---

## 四、Store 重构

### 4.1 基础必备

| 改进项 | 复杂度 | 说明 | 依赖 |
|--------|--------|------|------|
| **消除 actions.ts 中的 any** | 低 | 第 13 行 `totalPageData: any` 应使用正确类型 | 无 |
| **统一 Store 类型定义** | 低 | state、actions、getters 类型完整导出 | 无 |

**当前状态：**
```
src/stores/
├── wallpaper.ts           # 重导出入口
└── modules/
    ├── wallpaper/
    │   ├── index.ts       # Store 定义
    │   ├── actions.ts     # ⚠️ 存在 any 类型
    │   ├── state.ts       # 状态工厂
    │   ├── storage.ts     # 持久化
    │   └── settings-storage.ts
    └── download/
        └── index.ts
```

### 4.2 推荐改进

| 改进项 | 复杂度 | 说明 | 依赖 |
|--------|--------|------|------|
| **分离数据访问层** | 中 | storage.ts 抽象为 Repository，降低 Store 与 Electron API 耦合 | ElectronService |
| **提取 Getters** | 低 | 将计算属性单独文件管理，提升可读性 | 无 |
| **添加 Store 初始化钩子** | 低 | 统一初始化流程，处理加载失败场景 | 无 |

**推荐 Store 结构：**

```
src/stores/
├── index.ts                    # 统一导出
└── modules/
    ├── wallpaper/
    │   ├── index.ts            # Store 组装
    │   ├── state.ts            # 状态定义
    │   ├── getters.ts          # 计算属性（新增）
    │   ├── actions.ts          # 业务逻辑
    │   └── repository.ts       # 数据访问（重命名 storage.ts）
    └── download/
        └── index.ts
```

### 4.3 可选优化

| 改进项 | 复杂度 | 说明 | 依赖 |
|--------|--------|------|------|
| **Store 持久化插件** | 中 | 使用 pinia-plugin-persistedstate 替代手动持久化 | 无 |
| **状态快照/回滚** | 高 | 支持操作撤销，当前场景不需要 | 无 |
| **Store 分片** | 高 | 超大规模状态才需要，当前规模无需 | 无 |

### 4.4 反模式

| 做法 | 原因 |
|------|------|
| Store 之间直接调用 | 应通过事件或 composable 协调 |
| 在 Store 中处理 UI 逻辑 | 如 showAlert，应由组件处理 |
| 过度细分 Store | 增加维护成本，当前模块划分合理 |
| 直接修改 state（非 action） | 破坏响应式追踪 |

---

## 五、其他架构改进

### 5.1 基础必备

| 改进项 | 分类 | 复杂度 | 说明 |
|--------|------|--------|------|
| **添加 Vue Error Boundary** | 鲁棒性 | 中 | 防止组件错误导致整应用崩溃 |
| **全局错误处理器** | 鲁棒性 | 低 | 处理未捕获的 Promise rejection |

### 5.2 推荐改进

| 改进项 | 分类 | 复杂度 | 说明 |
|--------|------|--------|------|
| **路由懒加载** | 性能 | 低 | 当前路由未使用动态导入 |
| **清理死代码** | 可维护性 | 低 | 移除 Test/Demo 组件 |
| **统一错误类型** | 鲁棒性 | 低 | 定义 AppError 类型体系 |

### 5.3 可选优化

| 改进项 | 分类 | 复杂度 | 说明 |
|--------|------|--------|------|
| **虚拟滚动** | 性能 | 高 | 大列表优化，当前分页实现已足够 |
| **代码分割策略** | 性能 | 中 | 路由级分割后评估需求 |
| **JSDoc 注释** | 文档 | 低 | 逐步补充核心函数注释 |

### 5.4 反模式

| 做法 | 原因 |
|------|------|
| 引入额外的状态管理库 | Pinia 已足够，无需 Zustand/Jotai 等 |
| 创建「上帝类」Service | 服务应按职责拆分 |
| 过度使用 provide/inject | 增加 debug 难度，优先 props/emit |
| 为重构而重构的抽象 | 每个抽象应有明确使用场景 |

---

## 六、实施路线图

### 阶段 1：基础必备（预计 2-3 天）

```
□ 创建 useAlert composable
□ 消除 Store 中的 any 类型
□ 添加全局错误处理器
□ 统一 Store 类型导出
```

### 阶段 2：核心重构（预计 3-5 天）

```
□ 拆分 IPC handlers（依赖阶段 1 完成）
□ 创建 ElectronService
□ 分离 Store 数据访问层
□ 添加 Vue Error Boundary
```

### 阶段 3：质量提升（预计 2-3 天）

```
□ IPC 消息类型定义
□ Preload 类型同步
□ 路由懒加载
□ 清理死代码
```

### 阶段 4：可选优化（按需）

```
□ 创建其他 composables
□ Mock 服务实现
□ JSDoc 注释补充
```

---

## 七、依赖关系图

```
┌─────────────────────────────────────────────────────────────────┐
│                         阶段 1：基础必备                          │
├─────────────────────────────────────────────────────────────────┤
│  useAlert ◄──────────────────────────────────────────────────┐  │
│  Store 类型修复                                               │  │
│  全局错误处理器                                               │  │
└─────────────────────────────────────────────────────────────────┘  │
                              ↓                                      │
┌─────────────────────────────────────────────────────────────────┐  │
│                         阶段 2：核心重构                          │  │
├─────────────────────────────────────────────────────────────────┤  │
│  IPC handlers 拆分 ──────────► ElectronService                  │  │
│         │                           │                           │  │
│         ↓                           ↓                           │  │
│  IPC 类型定义 ◄──────────── Store Repository 重构 ── useAlert ──┘  │
│                                   │                              │
│                                   ↓                              │
│                         Vue Error Boundary                       │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                         阶段 3：质量提升                          │
├─────────────────────────────────────────────────────────────────┤
│  路由懒加载 ◄──── Preload 类型同步 ◄──── IPC 类型定义            │
│  清理死代码                                                      │
│  错误响应标准化                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 八、风险评估

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| IPC 拆分后遗漏注册 | 高 | 在 index.ts 统一导入，添加完整性测试 |
| Store 重构破坏持久化 | 高 | 保持向后兼容的存储格式，添加迁移逻辑 |
| Service 层引入 bug | 中 | 保持简单封装，不改变原有逻辑 |
| Composable 状态混乱 | 低 | 明确作用域，避免全局状态 |

---

## 九、验收标准

### 阶段验收

- [ ] 所有现有功能正常运行
- [ ] 无 any 类型新增
- [ ] ESLint/TSC 无错误
- [ ] 构建产物大小无明显增长

### 最终验收

- [ ] IPC handlers 文件均 < 200 行
- [ ] 无重复代码块 > 10 行
- [ ] Store 与 Electron API 无直接耦合
- [ ] Alert 等通用逻辑可复用

---

*创建时间：2025-04-25*
*基于：CONCERNS.md、CONVENTIONS.md、PROJECT.md 分析结果*
