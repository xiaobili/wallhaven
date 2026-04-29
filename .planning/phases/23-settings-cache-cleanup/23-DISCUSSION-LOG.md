# Phase 23: Settings Cache Cleanup - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-29
**Phase:** 23-settings-cache-cleanup
**Areas discussed:** 提示消息修改、数据刷新机制

---

## 提示消息修改

| Option | Description | Selected |
|--------|-------------|----------|
| 移除「设置将被重置」提示 | 更新确认对话框和成功消息，移除关于设置重置的说明，因为设置不再被清除 | ✓ |
| 保持当前提示不变 | 不修改提示文案，用户可能已经熟悉当前的提示内容 | |

**User's choice:** 移除「设置将被重置」提示
**Notes:** 确认对话框应准确反映实际行为，避免用户误解

---

## 数据刷新机制

| Option | Description | Selected |
|--------|-------------|----------|
| 仅刷新当前页面缓存信息 | 只更新 SettingPage 的 cacheInfo，不影响其他页面 | |
| 通知其他页面刷新缩略图 | 如果其他页面缓存了缩略图，清空后需要通知它们重新加载 | ✓ |

**User's choice:** 通知其他页面刷新缩略图
**Notes:** 缩略图被删除后，需要通知使用缩略图的页面（如 LocalWallpaper）重新获取缩略图路径

---

## Claude's Discretion

- 确认对话框的具体措辞
- 事件通知的具体实现方式（事件总线 vs Pinia 状态）
- 是否需要显示「正在刷新缩略图」的加载状态

## Deferred Ideas

None — 讨论保持在阶段范围内
