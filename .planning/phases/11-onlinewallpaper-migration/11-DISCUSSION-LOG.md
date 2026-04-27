# Phase 11: OnlineWallpaper Migration - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-27
**Phase:** 11-onlinewallpaper-migration
**Mode:** --auto (autonomous selection)
**Areas discussed:** Template variable replacement, Settings access migration, Script internal references

---

## 模板变量替换策略 (SMIG-03)

| Option | Description | Selected |
|--------|-------------|----------|
| 使用原名 | 使用 composable 返回的原名 (`wallpapers`, `loading`, `error`)，模板相应更新 | ✓ |
| 使用别名 | 使用别名匹配原有模板变量 (`wallpapers as totalPageData`)，保持模板不变 | |

**Auto-selected:** 使用原名 (Option A)
**Rationale:** 更清晰、更符合 composable 设计意图，减少中间层

---

## Settings 访问迁移 (CMIG-01)

| Option | Description | Selected |
|--------|-------------|----------|
| 扩展 useSettings | 使用 `useSettings()` 获取 `settings`，通过 `settings.value.apiKey` 访问 | ✓ |
| 保持 store | 保留 store 用于 settings 访问（不符合分层目标） | |

**Auto-selected:** 扩展 useSettings
**Rationale:** 符合 View → Composable → Store 分层架构目标

---

## Script 内部引用迁移

| Option | Description | Selected |
|--------|-------------|----------|
| 完整解构 composable | 在 script 顶部解构 `useWallpaperList()` 所有需要的状态和方法 | ✓ |
| 混合引用 | 部分使用 composable，部分保留 store 引用 | |

**Auto-selected:** 完整解构 composable
**Rationale:** 统一访问模式，彻底移除 store 直接引用

---

## Claude's Discretion

- 验证迁移后所有功能正常（壁纸加载、分页、搜索、下载、设置访问）
- 确保 computed 响应式正确工作
- 检查是否有遗漏的 store 引用

---

## Deferred Ideas

None — 讨论保持在阶段范围内。

---

*Auto-mode discussion completed: 2026-04-27*
