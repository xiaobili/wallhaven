# Phase 39: 收藏状态小红心逻辑与取消收藏功能 - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions captured in CONTEXT.md — this log preserves the conversation.

**Date:** 2026-05-02
**Phase:** 39-favorites-heart-status-and-unfavorite
**Mode:** discuss

## Areas Discussed

### 1. 小红心指示器
- **选项呈现：** 红色小圆点（恢复现有代码）/ 使用心形按钮本身 / 两者都用
- **用户选择：** 使用心形按钮本身
- **说明：** 不需要额外的红色圆点指示器，直接用 `thumb-favorite-btn`（填色心）作为收藏状态标识

### 2. 收藏按钮可见性
- **选项呈现：** 已收藏始终可见，未收藏仅悬停 / 始终可见（无论是否收藏）
- **用户选择：** 已收藏始终可见，未收藏仅悬停
- **说明：** 保持当前行为不变。`.is-favorite` 时已填色、始终可见，未收藏仅悬停

### 3. 取消收藏入口
- **选项呈现：** 收藏卡片上加取消按钮 / 左键点击心形快捷取消 / 右键菜单取消收藏
- **用户选择：** 左键点击心形快捷取消
- **跟进问题：** 多收藏夹处理 → 从当前显示的收藏夹移除
- **跟进问题：** 卡片交互设计 → 心形徽章变为可点击

### 4. ImagePreview 集成
- **选项呈现：** 与 OnlineWallpaper 一致（左键切换）/ 仅取消收藏 / 取消+关闭预览
- **用户选择：** 仅取消收藏（从当前收藏夹移除）
- **跟进问题：** 全部收藏视图 → 从所有收藏夹移除

## Decisions Recorded

| # | Area | Decision |
|---|------|----------|
| D-01 | 小红心指示器 | 不恢复红色圆点，用心形按钮本身 |
| D-02 | 收藏按钮可见性 | 保持现有行为 |
| D-03 | 取消收藏入口 | FavoriteWallpaperCard 心形徽章可点击取消 |
| D-04 | 多收藏夹处理 | 从当前显示的收藏夹移除 |
| D-05 | 全部收藏视图 | 从所有收藏夹移除 |
| D-06 | ImagePreview | 仅取消收藏，不添加 |
| D-07 | ImagePreview 全部收藏 | 从所有收藏夹移除 |

## Deferred Ideas

None.

---

*Logged: 2026-05-02*
