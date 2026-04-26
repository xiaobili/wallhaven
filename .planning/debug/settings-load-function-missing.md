---
status: resolved
trigger: "运行 npm run dev 控制台报错，并且之前保存的设置没有被初始化加载"
created: 2026-04-26
updated: 2026-04-26
---

# Debug Session: settings-load-function-missing

## Symptoms

- **Expected**: 应用启动时应该加载之前保存的所有设置
- **Actual**: 控制台报错 `TypeError: wallpaperStore.loadSettings is not a function`，设置未被加载
- **Error**: `main.ts:45 [Unhandled Rejection] TypeError: wallpaperStore.loadSettings is not a function at initializeApp (main.ts:81:24)`
- **Timeline**: 从未正常加载过
- **Reproduction**: 运行 `npm run dev` 启动应用

## Current Focus

hypothesis: 在阶段3重构中，loadSettings 方法从 WallpaperStore 移至 useSettings composable，但 main.ts 未更新
next_action: "fix main.ts to use settingsService instead"
test: npm run dev
expecting: no error, settings loaded
reasoning_checkpoint: confirmed by code analysis

## Evidence

1. `src/stores/modules/wallpaper/index.ts` 不包含 `loadSettings` 方法
2. `src/composables/settings/useSettings.ts` 包含 `load()` 方法来加载设置
3. `.planning/phases/03-business-composable-layer/VERIFICATION.md:90` 确认 `loadSettings` 已从 WallpaperStore 移除
4. `main.ts:81` 仍然调用 `wallpaperStore.loadSettings()`

## Eliminated

## Resolution

root_cause: 重构阶段3将 `loadSettings` 从 WallpaperStore 迁移到 `useSettings` composable，但 `main.ts` 未同步更新
fix: 修改 `main.ts:81` 使用 `settingsService.get()` 加载设置到 `wallpaperStore.settings`
verification: npm run dev，检查控制台无报错且设置正确加载
files_changed: src/main.ts
