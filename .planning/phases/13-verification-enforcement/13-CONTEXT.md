# Phase 13: Verification & Enforcement - Context

**Gathered:** 2026-04-27
**Status:** Ready for planning

<domain>
## Phase Boundary

验证架构完整性并添加 ESLint 规则防止 store 直接导入回归。本阶段是 v2.2 Store 分层迁移的最后一个阶段，确保迁移成果被保护。

**核心交付物：**
1. ESLint `no-restricted-imports` 规则 — 防止 views 直接导入 `useWallpaperStore` 或 `useDownloadStore`
2. TypeScript 编译验证 — 确保无类型错误
3. 手动测试验证 — 确保所有现有功能行为不变

**需求覆盖：** CLUP-01, CLUP-02, CLUP-03, CLUP-04

**阶段边界：**
- 仅添加 ESLint 配置，不修改业务代码
- 验证现有代码符合新规则
- 验证类型检查通过
- 手动测试所有页面功能

**当前状态：**
- ✅ 所有 4 个 views 已完成迁移（无 `useWallpaperStore`/`useDownloadStore` 导入）
- ✅ `npm run type-check` 通过
- ❌ ESLint 未配置（需要添加）

</domain>

<decisions>
## Implementation Decisions

### ESLint Configuration (CLUP-02)

- **D-01:** ESLint 配置格式
  - 选择 flat config (`eslint.config.js`) — ESLint 9+ 的标准格式
  - 理由: 未来兼容性，更简洁的配置结构

- **D-02:** 规则范围
  - 阻止 `views/**/*.vue` 和 `views/**/*.ts` 直接导入 store
  - 允许 `composables/**/*.ts` 导入 store（这是正确的分层）
  - 允许 `services/**/*.ts` 导入 store（如果需要）
  - **规则配置:**
    ```javascript
    {
      files: ['src/views/**/*.{vue,ts}'],
      rules: {
        'no-restricted-imports': ['error', {
          patterns: [{
            group: ['@/stores/*'],
            message: 'Views must import from @/composables, not @/stores. See View → Composable → Store architecture.'
          }]
        }]
      }
    }
    ```

- **D-03:** ESLint 依赖
  - 添加 `eslint` 和相关插件到 devDependencies
  - 添加 `lint` script 到 package.json

### Verification Scope (CLUP-01, CLUP-03, CLUP-04)

- **D-04:** 代码验证
  - 使用 grep 验证无直接 store 导入
  - 运行 `npm run type-check` 验证类型正确

- **D-05:** 手动测试范围
  - 在线壁纸浏览：加载、分页、搜索、下载
  - 本地壁纸浏览：显示本地文件、设置壁纸
  - 下载管理：下载列表、暂停、恢复、取消
  - 设置页面：所有设置项显示、保存、重置、浏览文件夹

### Claude's Discretion

- ESLint 配置的具体结构（是否需要 Vue 插件等）
- 是否添加 Prettier 集成（当前已有 Prettier）
- 是否添加其他 lint 规则（保持最小变更）

</decisions>

<specifics>
## Specific Ideas

- 使用 ESLint flat config（现代标准）
- 错误消息明确指出架构约束和替代方案
- 手动测试清单用于验证功能完整性

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 项目规划
- `.planning/PROJECT.md` — 项目核心价值、约束条件（纯架构迁移，功能行为不变）
- `.planning/REQUIREMENTS.md` — CLUP-01, CLUP-02, CLUP-03, CLUP-04 详细需求
- `.planning/ROADMAP.md` — Phase 13 定义和成功标准
- `.planning/STATE.md` — 累积决策

### 前置阶段上下文
- `.planning/phases/10-simple-substitutions/10-CONTEXT.md` — Phase 10 上下文
- `.planning/phases/11-onlinewallpaper-migration/11-CONTEXT.md` — Phase 11 上下文
- `.planning/phases/12-settingpage-migration/12-CONTEXT.md` — Phase 12 上下文

### 代码库分析
- `.planning/codebase/ARCHITECTURE.md` — 现有架构、分层结构
- `.planning/codebase/CONVENTIONS.md` — TypeScript/Vue 代码规范

### 关键代码文件

#### 配置文件（需要创建/修改）
- `eslint.config.js` — 新建 ESLint flat config
- `package.json` — 添加 eslint 依赖和 lint script

#### Views 文件（验证目标）
- `src/views/OnlineWallpaper.vue` — 验证无 store 直接导入
- `src/views/LocalWallpaper.vue` — 验证无 store 直接导入
- `src/views/DownloadWallpaper.vue` — 验证无 store 直接导入
- `src/views/SettingPage.vue` — 验证无 store 直接导入

#### Composables（正确使用 store 的参考）
- `src/composables/wallpaper/useWallpaperList.ts` — 可导入 store
- `src/composables/download/useDownload.ts` — 可导入 store
- `src/composables/settings/useSettings.ts` — 可导入 store

</canonical_refs>

<code_context>
## Existing Code Insights

### Current State (Before Phase 13)

#### Views 迁移状态
```bash
# 验证命令
grep -r "useWallpaperStore\|useDownloadStore" src/views/
# 结果：无匹配（迁移已完成）
```

#### package.json scripts
```json
{
  "scripts": {
    "type-check": "vue-tsc --build",
    "format": "prettier --write --experimental-cli src/"
    // 无 lint script
  },
  "devDependencies": {
    // 无 eslint 相关依赖
    "prettier": "3.8.3",
    "typescript": "~6.0.0"
  }
}
```

### Target State (After Phase 13)

#### eslint.config.js (新建)
```javascript
import js from '@eslint/js'
import pluginVue from 'eslint-plugin-vue'
import tseslint from 'typescript-eslint'

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...pluginVue.configs['flat/recommended'],
  {
    files: ['src/views/**/*.{vue,ts}'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [{
          group: ['@/stores/*'],
          message: 'Views must import from @/composables, not @/stores. See View → Composable → Store architecture.'
        }]
      }]
    }
  },
  {
    ignores: ['out/**', 'dist/**', 'node_modules/**']
  }
]
```

#### package.json (更新)
```json
{
  "scripts": {
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "type-check": "vue-tsc --build",
    "format": "prettier --write --experimental-cli src/"
  },
  "devDependencies": {
    "eslint": "^9.0.0",
    "eslint-plugin-vue": "^9.0.0",
    "typescript-eslint": "^8.0.0",
    "@eslint/js": "^9.0.0"
  }
}
```

### Verification Commands

#### 代码验证
```bash
# 1. 验证无直接 store 导入
grep -r "useWallpaperStore\|useDownloadStore" src/views/
# 期望：无输出

# 2. 类型检查
npm run type-check
# 期望：通过

# 3. ESLint 检查
npm run lint
# 期望：通过（views 中无 store 导入）
```

### Manual Test Checklist

#### OnlineWallpaper.vue
- [ ] 壁纸列表正常加载
- [ ] 滚动加载更多（分页）
- [ ] 搜索功能正常
- [ ] 单张下载正常
- [ ] 批量下载正常
- [ ] 设置壁纸正常

#### LocalWallpaper.vue
- [ ] 本地壁纸列表显示
- [ ] 设置壁纸功能正常

#### DownloadWallpaper.vue
- [ ] 下载列表显示
- [ ] 暂停/恢复下载
- [ ] 取消下载
- [ ] 下载完成列表显示

#### SettingPage.vue
- [ ] 所有设置项显示当前值
- [ ] 保存设置功能
- [ ] 重置设置功能
- [ ] 浏览文件夹功能

### Established Patterns

- Views 只从 `@/composables` 导入
- Composables 可以从 `@/stores` 导入
- 分层架构：View → Composable → Store

</code_context>

<deferred>
## Deferred Ideas

None — 本阶段为架构验证，无新功能需求。

### 后续阶段

Phase 13 完成后，v2.2 Store 分层迁移里程碑完成。

### Future Enhancements (Out of Scope)

- 为 Composables 添加单元测试
- 为 Services 添加单元测试
- 为 Repositories 添加单元测试
- 使用 safeStorage 加密 API Key

</deferred>

---

*Phase: 13-verification-enforcement*
*Context gathered: 2026-04-27*
