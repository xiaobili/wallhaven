# Phase 12: SettingPage Migration - Context

**Gathered:** 2026-04-27
**Status:** Ready for planning

<domain>
## Phase Boundary

迁移 SettingPage.vue 中的所有直接 store 访问到 composables，并扩展 useSettings 支持响应式表单绑定。本阶段处理设置页面的完整迁移，涉及表单双向绑定的特殊处理。

**核心交付物：**
1. useSettings.ts 扩展 — 添加 `editableSettings` 本地副本支持表单双向绑定
2. SettingPage.vue — 移除 `useWallpaperStore` 直接导入，使用扩展后的 `useSettings()`
3. 保持所有现有功能行为不变（表单显示、保存、重置、缓存管理）

**需求覆盖：** CMIG-02, CMIG-03

**阶段边界：**
- 扩展 useSettings composable 支持表单编辑
- 修改 SettingPage.vue 的导入和变量引用
- 不改变任何功能行为
- 不改变 UI 布局

</domain>

<decisions>
## Implementation Decisions

### useSettings 扩展设计 (CMIG-02)

- **D-01:** 表单编辑模式策略
  - 当前 useSettings 返回 `settings: ComputedRef<AppSettings>`（只读）
  - SettingPage 需要 v-model 双向绑定
  - **决策:** 扩展 useSettings 添加 `editableSettings` 和相关方法
  - 理由: 保持 composable 职责清晰，避免 composable 碎片化

- **D-02:** editableSettings 实现方式
  - 返回 `Ref<AppSettings>` 而非 `ComputedRef`
  - 创建本地 reactive 副本，独立于 store 状态
  - 用户编辑本地副本，显式保存时才同步到 store
  ```typescript
  interface UseSettingsReturn {
    // 现有（只读）
    settings: ComputedRef<AppSettings>

    // 新增（可编辑）
    editableSettings: Ref<AppSettings>
    startEdit: () => void        // 从 store 同步到本地副本
    discardChanges: () => void   // 丢弃本地修改
    saveChanges: () => Promise<boolean>  // 保存本地修改到 store
    isDirty: ComputedRef<boolean>  // 本地副本是否有未保存的修改

    // 现有方法
    load: () => Promise<boolean>
    update: (partial: Partial<AppSettings>) => Promise<boolean>
    reset: () => Promise<boolean>
    getDefaults: () => AppSettings
  }
  ```

- **D-03:** startEdit 触发时机
  - 组件挂载时自动调用 `startEdit()` 初始化本地副本
  - 或用户可手动调用刷新本地副本

- **D-04:** isDirty 检测
  - 深度比较 `editableSettings.value` 与 `settings.value`
  - 用于提示用户有未保存的修改

### SettingPage.vue 迁移 (CMIG-03)

- **D-05:** 导入变更
  - 移除: `import { useWallpaperStore } from '@/stores/wallpaper'`
  - 保留: `import { useSettings, useAlert } from '@/composables'`

- **D-06:** 变量替换
  - 移除: `const wallpaperStore = useWallpaperStore()` 和 `const settings = wallpaperStore.settings`
  - 替换为:
    ```typescript
    const { settings, editableSettings, startEdit, saveChanges, discardChanges, isDirty } = useSettings()
    const formSettings = editableSettings  // 模板绑定用
    ```
  - 模板中 `v-model="settings.xxx"` → `v-model="formSettings.xxx"`

- **D-07:** 保存按钮行为
  - 当前: `saveSettings()` 调用 `updateSettings(toRaw(settings))`
  - 替换为: 调用 `saveChanges()`
  - 如果成功，本地副本自动与 store 同步

- **D-08:** 重置按钮行为
  - 当前: `resetSettings()` 调用 `updateSettings(defaultSettings)` + `Object.assign(settings, defaultSettings)`
  - 替换为: 调用 `reset()` 然后 `startEdit()` 刷新本地副本

- **D-09:** 浏览文件夹行为
  - 当前: 选择后设置 `settings.downloadPath = selectedPath` 并调用 `updateSettings({ downloadPath })`
  - 替换为: `formSettings.value.downloadPath = selectedPath` 然后 `saveChanges()`

- **D-10:** 清理缓存行为
  - 当前: 清理后 `Object.assign(settings, defaultSettings)`
  - 替换为: 调用 `startEdit()` 从 store 刷新本地副本

### Claude's Discretion

- isDirty 深度比较的具体实现（可用 lodash.isEqual 或 JSON.stringify）
- 是否添加"有未保存修改"提示
- 保存成功/失败后的 UI 反馈细节

</decisions>

<specifics>
## Specific Ideas

- 显式保存语义：用户编辑本地副本，明确点击保存才提交
- 避免自动保存：每次输入变更都触发 IPC 会影响性能
- 表单验证保持现有逻辑（maxConcurrentDownloads 范围检查）

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 项目规划
- `.planning/PROJECT.md` — 项目核心价值、约束条件（纯架构迁移，功能行为不变）
- `.planning/REQUIREMENTS.md` — CMIG-02, CMIG-03 详细需求
- `.planning/ROADMAP.md` — Phase 12 定义和成功标准
- `.planning/STATE.md` — 累积决策（SettingPage 表单绑定方案）

### 前置阶段上下文
- `.planning/phases/10-simple-substitutions/10-CONTEXT.md` — Phase 10 上下文（迁移模式参考）
- `.planning/phases/11-onlinewallpaper-migration/11-CONTEXT.md` — Phase 11 上下文（迁移模式参考）

### 代码库分析
- `.planning/codebase/ARCHITECTURE.md` — 现有架构、分层结构
- `.planning/codebase/CONVENTIONS.md` — TypeScript/Vue 代码规范

### 关键代码文件（需要修改）

#### Composable 文件
- `src/composables/settings/useSettings.ts` — 扩展添加 editableSettings 支持

#### View 文件
- `src/views/SettingPage.vue` — 完整迁移，移除所有 store 直接引用

#### Store 文件（无需修改，了解数据结构）
- `src/stores/modules/wallpaper/index.ts` — Store 定义，了解 settings 结构

#### 类型定义
- `src/types/index.ts` — AppSettings 类型定义

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

#### useSettings composable (当前)
```typescript
// src/composables/settings/useSettings.ts
export interface UseSettingsReturn {
  // 状态（ComputedRef）
  settings: ComputedRef<AppSettings>

  // 方法
  load: () => Promise<boolean>
  update: (partial: Partial<AppSettings>) => Promise<boolean>
  reset: () => Promise<boolean>
  getDefaults: () => AppSettings
}
```

#### settingsService
```typescript
// src/services/settings/index.ts
// 提供 get, update, reset, getDefaults 方法
```

### Current Code (Before Migration)

#### SettingPage.vue - 导入和变量 (lines 143-156)
```typescript
import { reactive, toRaw, ref } from 'vue'
import { useWallpaperStore } from '@/stores/wallpaper'
import { useSettings, useAlert } from '@/composables'
import { settingsService } from '@/services'
import type { WallpaperFit } from '@/types'
import Alert from '@/components/Alert.vue'

// Pinia Store
const wallpaperStore = useWallpaperStore()
const settings = wallpaperStore.settings

// Composables
const { update: updateSettings, reset: resetSettingsComposable } = useSettings()
const { alert, showSuccess, showError, showWarning, hideAlert } = useAlert()
```

#### SettingPage.vue - 模板绑定 (lines 23-62)
```vue
<input type="text" v-model="settings.downloadPath" ... />
<input type="range" v-model.number="settings.maxConcurrentDownloads" ... />
<input type="password" v-model="settings.apiKey" ... />
<select v-model="settings.wallpaperFit">...</select>
```

#### SettingPage.vue - saveSettings (lines 191-212)
```typescript
const saveSettings = async (): Promise<void> => {
  // 验证设置
  if (settings.maxConcurrentDownloads < 1 || settings.maxConcurrentDownloads > 10) {
    showWarning('多线程下载数量必须在 1-10 之间')
    return
  }

  try {
    const plainSettings = toRaw(settings)
    await updateSettings(plainSettings)
    showSuccess('设置已保存')
  } catch (error: any) {
    showError('保存设置失败: ' + error.message)
  }
}
```

#### SettingPage.vue - resetSettings (lines 214-234)
```typescript
const resetSettings = async (): Promise<void> => {
  const confirmed = window.confirm('确定要恢复默认设置吗？')
  if (!confirmed) return

  const defaultSettings = {
    downloadPath: '',
    maxConcurrentDownloads: 3,
    apiKey: '',
    wallpaperFit: 'fill' as WallpaperFit,
  }

  await updateSettings(defaultSettings)
  Object.assign(settings, defaultSettings)
  showSuccess('已恢复默认设置')
}
```

### Target Code (After Migration)

#### useSettings.ts - 扩展后
```typescript
export interface UseSettingsReturn {
  // 只读状态
  settings: ComputedRef<AppSettings>

  // 可编辑状态（表单绑定用）
  editableSettings: Ref<AppSettings>
  startEdit: () => void
  discardChanges: () => void
  saveChanges: () => Promise<boolean>
  isDirty: ComputedRef<boolean>

  // 方法
  load: () => Promise<boolean>
  update: (partial: Partial<AppSettings>) => Promise<boolean>
  reset: () => Promise<boolean>
  getDefaults: () => AppSettings
}

export function useSettings(): UseSettingsReturn {
  const store = useWallpaperStore()
  const { showError, showSuccess } = useAlert()

  // 现有方法...
  const load = async () => { ... }
  const update = async (partial) => { ... }
  const reset = async () => { ... }
  const getDefaults = () => { ... }

  // 新增：可编辑本地副本
  const editableSettings = ref<AppSettings>(getDefaults()) as Ref<AppSettings>

  const startEdit = () => {
    Object.assign(editableSettings.value, store.settings)
  }

  const discardChanges = () => {
    Object.assign(editableSettings.value, store.settings)
  }

  const saveChanges = async (): Promise<boolean> => {
    const result = await update(editableSettings.value)
    if (result) {
      startEdit() // 同步本地副本
    }
    return result
  }

  const isDirty = computed(() => {
    return JSON.stringify(editableSettings.value) !== JSON.stringify(store.settings)
  })

  return {
    settings: computed(() => store.settings),
    editableSettings,
    startEdit,
    discardChanges,
    saveChanges,
    isDirty,
    load,
    update,
    reset,
    getDefaults,
  }
}
```

#### SettingPage.vue - 迁移后
```typescript
import { reactive, ref } from 'vue'
import { useSettings, useAlert } from '@/composables'
import { settingsService } from '@/services'
import type { WallpaperFit } from '@/types'
import Alert from '@/components/Alert.vue'

// Composables
const {
  settings,
  editableSettings,
  startEdit,
  saveChanges,
  reset: resetSettings,
  getDefaults
} = useSettings()
const { alert, showSuccess, showError, showWarning, hideAlert } = useAlert()

// 模板绑定用可编辑副本
const formSettings = editableSettings

// 保存按钮
const saveSettings = async (): Promise<void> => {
  if (formSettings.value.maxConcurrentDownloads < 1 || formSettings.value.maxConcurrentDownloads > 10) {
    showWarning('多线程下载数量必须在 1-10 之间')
    return
  }
  await saveChanges()
  showSuccess('设置已保存')
}

// 重置按钮
const handleReset = async (): Promise<void> => {
  const confirmed = window.confirm('确定要恢复默认设置吗？')
  if (!confirmed) return
  await resetSettings()
  startEdit()  // 刷新本地副本
  showSuccess('已恢复默认设置')
}

// 初始化
startEdit()
```

### Established Patterns

- Composables 返回 ComputedRef 用于只读状态
- Ref 用于可编辑状态
- 显式保存语义，避免自动保存
- 组件挂载时初始化本地副本

### Integration Points

- **模板:** v-model 绑定到 `editableSettings` 的各个字段
- **保存按钮:** 调用 `saveChanges()`
- **重置按钮:** 调用 `reset()` + `startEdit()`
- **浏览文件夹:** 更新 `editableSettings.value.downloadPath` 然后 `saveChanges()`
- **清理缓存:** 清理后调用 `startEdit()` 刷新

</code_context>

<deferred>
## Deferred Ideas

None — 本阶段为架构迁移，无新功能需求。

### 后续阶段

- Phase 13: 验证与 ESLint 强制规则

</deferred>

---

*Phase: 12-settingpage-migration*
*Context gathered: 2026-04-27*
