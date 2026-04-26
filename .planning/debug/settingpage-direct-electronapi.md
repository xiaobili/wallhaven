---
status: resolved
trigger: SettingPage.vue 文件直接调用 electronClient，应通过 setting.service.ts → setting.repository.ts → electronClient 的分层架构
created: 2026-04-26
updated: 2026-04-26
---

# Debug Session: settingpage-direct-electronapi

## Symptoms

- **Expected**: SettingPage.vue 应通过 setting.service.ts → setting.repository.ts → electronClient 分层架构访问 Electron API
- **Actual**: SettingPage.vue 直接调用 electronClient（selectFolder, clearAppCache, storeClear, getCacheInfo）
- **Error**: 无运行时错误，但架构分层不完整
- **Timeline**: 架构重构项目中发现的遗留问题
- **Reproduction**: 代码审查发现

## Current Focus

hypothesis: settings.repository.ts 和 settings.service.ts 缺少缓存管理相关方法，导致 SettingPage.vue 直接调用 electronClient
next_action: 完成
test: TypeScript 编译通过
expecting: SettingPage.vue 只调用 settingsService，不直接访问 electronClient
reasoning_checkpoint: 修复已完成
tdd_checkpoint: null

## Evidence

<!-- Entries: - timestamp: ... | observation: ... -->

- timestamp: 2026-04-26 | observation: settings.repository.ts 只有 get/set/delete 方法，缺少 selectFolder, clearAppCache, getCacheInfo 等方法
- timestamp: 2026-04-26 | observation: settings.service.ts 只有 get/set/update/reset 方法，缺少缓存管理相关方法
- timestamp: 2026-04-26 | observation: SettingPage.vue 直接调用 electronClient.selectFolder(), clearAppCache(), storeClear(), getCacheInfo()
- timestamp: 2026-04-26 | observation: 预期架构分层: SettingPage.vue → settings.service.ts → settings.repository.ts → electronClient
- timestamp: 2026-04-26 | observation: 已在 settings.repository.ts 添加 selectFolder, clearStore, clearAppCache, getCacheInfo 方法
- timestamp: 2026-04-26 | observation: 已在 settings.service.ts 添加对应的业务方法
- timestamp: 2026-04-26 | observation: SettingPage.vue 已更新为调用 settingsService 而非 electronClient
- timestamp: 2026-04-26 | observation: TypeScript 编译通过 (npx tsc --noEmit)

## Eliminated

<!-- Entries: - hypothesis: ... | reason: ... -->

## Resolution

root_cause: settings.repository.ts 和 settings.service.ts 缺少缓存管理相关方法（selectFolder, clearAppCache, storeClear, getCacheInfo），导致 SettingPage.vue 必须直接调用 electronClient
fix: |
  1. 在 settings.repository.ts 添加:
     - selectFolder(): 选择文件夹
     - clearStore(): 清空应用存储
     - clearAppCache(): 清理应用缓存
     - getCacheInfo(): 获取缓存信息
  2. 在 settings.service.ts 添加对应的业务方法，封装 repository 调用
  3. 更新 SettingPage.vue 调用 settingsService 而非 electronClient
  4. 更新 repositories/index.ts 导出 CacheInfo 和 ClearCacheResult 类型
verification: TypeScript 编译通过 (npx tsc --noEmit)
files_changed:
  - src/repositories/settings.repository.ts
  - src/repositories/index.ts
  - src/services/settings.service.ts
  - src/views/SettingPage.vue
