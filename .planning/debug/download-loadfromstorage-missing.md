---
status: resolved
trigger: "main.ts:90 TypeError: downloadStore.loadFromStorage is not a function"
created: 2026-04-26
updated: 2026-04-26
---

# Debug Session: download-loadfromstorage-missing

## Symptoms

- **Expected**: 应用启动时应该正常初始化下载存储
- **Actual**: 控制台报错 `TypeError: downloadStore.loadFromStorage is not a function` at `main.ts:90:23`
- **Error**: `main.ts:45 [Unhandled Rejection] TypeError: downloadStore.loadFromStorage is not a function at initializeApp (main.ts:90:23)`
- **Timeline**: 上一个问题修复后立即出现
- **Reproduction**: 运行 `npm run dev` 启动应用

## Current Focus

hypothesis: downloadStore 缺少 loadFromStorage 方法定义
next_action: "已修复"
test: 运行 `npm run dev` 验证
expecting: 应用正常启动，无 TypeError
reasoning_checkpoint: 修复已验证成功

## Evidence

1. `main.ts:90` 调用 `downloadStore.loadFromStorage()`
2. `src/stores/modules/download/index.ts` 中 `useDownloadStore` 没有导出 `loadFromStorage` 方法
3. `downloadService` 有 `getFinishedRecords()` 方法可获取持久化记录
4. 需要在 store 中添加 `loadFromStorage` 方法来调用 `downloadService.getFinishedRecords()`

## Eliminated

## Resolution

root_cause: `downloadStore` 缺少 `loadFromStorage` 方法。`main.ts` 在初始化时调用该方法从 electron-store 加载历史下载记录，但 store 定义中从未导出此方法。
fix: 在 `src/stores/modules/download/index.ts` 中添加 `loadFromStorage` 异步方法，该方法调用 `downloadService.getFinishedRecords()` 获取已完成的下载记录并填充到 `finishedList.value`。
verification: 
  - `npm run dev` 启动成功，无 TypeError
  - `npx tsc --noEmit` 类型检查通过
files_changed: 
  - `src/stores/modules/download/index.ts`
