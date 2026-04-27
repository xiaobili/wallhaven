---
status: resolved
trigger: "ESLint Parsing error: Unexpected token { on line `import type { WallpaperFit } from '@/types'` in SettingPage.vue"
created: "2026-04-27"
updated: "2026-04-27"
---

# Debug Session: eslint-vue-typescript-parsing

## Symptoms

**Expected behavior:** ESLint 应该正常解析 Vue 文件中的 TypeScript import type 语法

**Actual behavior:** VS Code 中 ESLint 报错 `Parsing error: Unexpected token {`

**Error messages:**
- File: SettingPage.vue
- Line: `import type { WallpaperFit } from '@/types'`
- Error: `Parsing error: Unexpected token {`

**Timeline:** 问题在 VS Code 中出现，CLI 也同样报错

**Reproduction:** 在 VS Code 中打开 SettingPage.vue 文件

## Evidence

- `npm run lint` 输出中同样存在解析错误
- 当前 `eslint.config.js` 使用 flat config 格式
- 配置中使用了 `typescript-eslint` 和 `eslint-plugin-vue`
- **关键发现**: `typescript-eslint.configs.recommended` 的第一个配置项设置了全局 `typescript-eslint/parser`，这会覆盖 `vue-eslint-parser`
- `vue-eslint-parser` 存在于 `node_modules` 中（作为 `eslint-plugin-vue` 的依赖）

## Current Focus

**hypothesis:** (confirmed) ESLint flat config 需要显式配置 `vue-eslint-parser` 来解析 Vue SFC 中的 TypeScript 代码。`typescript-eslint` 的全局解析器配置覆盖了 `vue-eslint-parser`。

**next_action:** (completed) 修复 eslint.config.js

## Eliminated

- (none)

## Resolution

**root_cause:** 在 ESLint flat config 中，`typescript-eslint.configs.recommended` 的第一个配置项设置了 `languageOptions.parser: typescript-eslint/parser` 作为全局解析器。由于配置数组的顺序，这个全局解析器被应用到所有文件，包括 `.vue` 文件。而 `typescript-eslint/parser` 无法解析 Vue SFC 格式，导致对 `import type { ... }` 等 TypeScript 语法报 `Unexpected token {` 错误。

**fix:** 在 `eslint.config.js` 中添加一个专门针对 `.vue` 文件的配置项：
```javascript
{
  files: ['**/*.vue'],
  languageOptions: {
    parser: vueParser,  // vue-eslint-parser 作为主解析器
    parserOptions: {
      parser: tseslint.parser,  // TypeScript 解析器作为嵌套解析器
      sourceType: 'module'
    }
  }
}
```

**verification:**
```bash
npx eslint src/views/SettingPage.vue
# 之前：Parsing error: Unexpected token {
# 之后：正常显示 lint 规则警告/错误（如 @typescript-eslint/no-unused-vars）
```

**files_changed:**
- `eslint.config.js`

## Technical Notes

### 为什么需要这种配置方式？

Vue SFC (Single File Component) 文件包含 `<template>`, `<script>`, `<style>` 等块。ESLint 需要：

1. **主解析器 (`vue-eslint-parser`)**: 解析 `.vue` 文件结构，提取各块内容
2. **嵌套解析器 (`@typescript-eslint/parser`)**: 解析 `<script lang="ts">` 块中的 TypeScript 代码

`vue-eslint-parser` 通过 `parserOptions.parser` 选项来指定用于解析 `<script>` 块的解析器。

### Flat Config 中的陷阱

在旧的 eslintrc 格式中，解析器是按文件类型单独配置的。但在 flat config 中：
- 后面的配置可以覆盖前面的 `languageOptions.parser`
- 全局配置（无 `files` 字段）会影响所有文件
- `typescript-eslint.configs.recommended[0]` 就是全局配置，设置了 TypeScript 解析器

因此，必须显式为 `.vue` 文件指定 `vue-eslint-parser`。
